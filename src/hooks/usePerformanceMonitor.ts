// src/hooks/usePerformanceMonitor.ts - Simple Version
import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceThresholds {
  warning: number; // milliseconds
  critical: number; // milliseconds
}

// ✅ Simple MemoryInfo interface
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  warning: 100,
  critical: 500
};

class SimplePerformanceTracker {
  private metrics: Map<string, PerformanceMetric> = new Map();

  startMeasure(name: string, metadata?: Record<string, unknown>): void {
    const startTime = performance.now();
    this.metrics.set(name, {
      name,
      startTime,
      metadata
    });
  }

  endMeasure(name: string, thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS): PerformanceMetric | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`No metric found for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration
    };

    // Log performance warnings
    if (duration > thresholds.critical) {
      console.error(`🔴 Critical performance issue: ${name} took ${duration.toFixed(2)}ms`, completedMetric);
    } else if (duration > thresholds.warning) {
      console.warn(`🟡 Performance warning: ${name} took ${duration.toFixed(2)}ms`, completedMetric);
    } else {
      console.log(`✅ Performance OK: ${name} took ${duration.toFixed(2)}ms`);
    }

    this.metrics.delete(name);
    return completedMetric;
  }

  measureAsync<T>(
    name: string,
    asyncFn: () => Promise<T>,
    thresholds?: PerformanceThresholds,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    this.startMeasure(name, metadata);
    
    return asyncFn()
      .finally(() => {
        this.endMeasure(name, thresholds);
      });
  }

  measureSync<T>(
    name: string,
    syncFn: () => T,
    thresholds?: PerformanceThresholds,
    metadata?: Record<string, unknown>
  ): T {
    this.startMeasure(name, metadata);
    
    try {
      return syncFn();
    } finally {
      this.endMeasure(name, thresholds);
    }
  }

  getMemoryUsage(): MemoryInfo | null {
    try {
      // Check if performance.memory is available (Chrome)
      const perf = performance as Performance & { memory?: MemoryInfo };
      if (perf.memory) {
        return perf.memory;
      }
    } catch (error) {
      console.warn('Memory info not available:', error);
    }
    return null;
  }

  cleanup(): void {
    this.metrics.clear();
  }
}

// Singleton instance
const performanceTracker = new SimplePerformanceTracker();

interface PerformanceMonitorOptions {
  enableMemoryMonitoring?: boolean;
  memoryCheckInterval?: number;
  thresholds?: PerformanceThresholds;
}

export const usePerformanceMonitor = (options: PerformanceMonitorOptions = {}) => {
  const {
    enableMemoryMonitoring = true,
    memoryCheckInterval = 10000, // 10 seconds
    thresholds = DEFAULT_THRESHOLDS
  } = options;

  const memoryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Memory monitoring
  useEffect(() => {
    if (enableMemoryMonitoring) {
      const checkMemory = () => {
        const memoryInfo = performanceTracker.getMemoryUsage();
        if (memoryInfo) {
          const usedMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
          const limitMB = Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024);
          const usagePercent = (usedMB / limitMB) * 100;

          if (usagePercent > 90) {
            console.error(`🔴 Critical memory usage: ${usedMB}MB (${usagePercent.toFixed(1)}% of ${limitMB}MB limit)`);
          } else if (usagePercent > 80) {
            console.warn(`🟡 High memory usage: ${usedMB}MB (${usagePercent.toFixed(1)}% of ${limitMB}MB limit)`);
          }
        }
      };

      checkMemory(); // Initial check
      memoryIntervalRef.current = setInterval(checkMemory, memoryCheckInterval);

      return () => {
        if (memoryIntervalRef.current) {
          clearInterval(memoryIntervalRef.current);
        }
      };
    }
  }, [enableMemoryMonitoring, memoryCheckInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (memoryIntervalRef.current) {
        clearInterval(memoryIntervalRef.current);
      }
    };
  }, []);

  const startMeasure = useCallback((name: string, metadata?: Record<string, unknown>) => {
    performanceTracker.startMeasure(name, metadata);
  }, []);

  const endMeasure = useCallback((name: string) => {
    return performanceTracker.endMeasure(name, thresholds);
  }, [thresholds]);

  const measureAsync = useCallback(<T>(
    name: string,
    asyncFn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> => {
    return performanceTracker.measureAsync(name, asyncFn, thresholds, metadata);
  }, [thresholds]);

  const measureSync = useCallback(<T>(
    name: string,
    syncFn: () => T,
    metadata?: Record<string, unknown>
  ): T => {
    return performanceTracker.measureSync(name, syncFn, thresholds, metadata);
  }, [thresholds]);

  const getMemoryUsage = useCallback(() => {
    return performanceTracker.getMemoryUsage();
  }, []);

  return {
    startMeasure,
    endMeasure,
    measureAsync,
    measureSync,
    getMemoryUsage
  };
};

// Export singleton for direct access
export { performanceTracker };

// ✅ Simple example usage
export const withPerformanceLogging = <T extends unknown[], R>(
  fn: (...args: T) => R,
  name: string
) => {
  return (...args: T): R => {
    return performanceTracker.measureSync(name, () => fn(...args));
  };
};

export const withAsyncPerformanceLogging = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  name: string
) => {
  return (...args: T): Promise<R> => {
    return performanceTracker.measureAsync(name, () => fn(...args));
  };
};