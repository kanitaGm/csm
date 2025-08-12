// ================================
// Performance Monitor (Fixed TypeScript Strict)
// ไฟล์: src/utils/performanceMonitor.ts
// ================================

import { useState, useEffect } from 'react';

interface PerformanceEntry {
  readonly name: string;
  readonly startTime: number;
  readonly duration: number;
  readonly success: boolean;
  readonly error?: string;
  readonly timestamp: number;
}

interface PerformanceStats {
  readonly operationName?: string;
  readonly averageTime: number;
  readonly successRate: number;
  readonly totalCalls: number;
  readonly recentErrors: readonly string[];
  readonly minTime: number;
  readonly maxTime: number;
  readonly p95Time: number;
}

export class PerformanceMonitor {
  private readonly entries: PerformanceEntry[] = [];
  private readonly maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  startTiming(name: string): string {
    const timingId = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      performance.mark(`${timingId}-start`);
    } catch (error) {
      console.warn('Performance.mark not supported:', error);
    }
    
    return timingId;
  }

  endTiming(timingId: string, success: boolean = true, error?: string): void {
    try {
      const endMarkName = `${timingId}-end`;
      const startMarkName = `${timingId}-start`;
      
      performance.mark(endMarkName);
      performance.measure(timingId, startMarkName, endMarkName);
      
      const measure = performance.getEntriesByName(timingId, 'measure')[0];
      
      if (measure) {
        this.addEntry({
          name: timingId.split('-')[0],
          startTime: measure.startTime,
          duration: measure.duration,
          success,
          error,
          timestamp: Date.now()
        });
      }

      // Cleanup performance entries
      performance.clearMarks(startMarkName);
      performance.clearMarks(endMarkName);
      performance.clearMeasures(timingId);
      
    } catch (err) {
      console.warn('Performance timing error:', err);
      
      // Fallback timing method
      const name = timingId.split('-')[0];
      this.addEntry({
        name,
        startTime: 0,
        duration: 0,
        success,
        error: error || 'Performance API unavailable',
        timestamp: Date.now()
      });
    }
  }

  private addEntry(entry: PerformanceEntry): void {
    this.entries.push(entry);
    
    // Keep only recent entries (LRU)
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }

  getAverageTime(operationName: string): number {
    const filtered = this.entries.filter(e => e.name === operationName && e.success);
    if (filtered.length === 0) return 0;
    
    const total = filtered.reduce((sum, entry) => sum + entry.duration, 0);
    return total / filtered.length;
  }

  getSuccessRate(operationName: string): number {
    const filtered = this.entries.filter(e => e.name === operationName);
    if (filtered.length === 0) return 100;
    
    const successful = filtered.filter(e => e.success).length;
    return (successful / filtered.length) * 100;
  }

  getStats(operationName?: string): PerformanceStats {
    const filtered = operationName ? 
      this.entries.filter(e => e.name === operationName) : 
      this.entries;

    if (filtered.length === 0) {
      return {
        operationName,
        averageTime: 0,
        successRate: 100,
        totalCalls: 0,
        recentErrors: [],
        minTime: 0,
        maxTime: 0,
        p95Time: 0
      };
    }

    const successfulEntries = filtered.filter(e => e.success);
    const durations = successfulEntries.map(e => e.duration).sort((a, b) => a - b);
    
    const averageTime = durations.length > 0 ? 
      durations.reduce((sum, duration) => sum + duration, 0) / durations.length : 0;

    const successRate = (successfulEntries.length / filtered.length) * 100;

    const recentErrors = filtered
      .filter(e => !e.success && e.error)
      .slice(-5)
      .map(e => e.error || 'Unknown error');

    const minTime = durations.length > 0 ? durations[0] : 0;
    const maxTime = durations.length > 0 ? durations[durations.length - 1] : 0;
    const p95Index = Math.floor(durations.length * 0.95);
    const p95Time = durations.length > 0 ? durations[p95Index] || maxTime : 0;

    return {
      operationName,
      averageTime,
      successRate,
      totalCalls: filtered.length,
      recentErrors,
      minTime,
      maxTime,
      p95Time
    };
  }

  getOperationNames(): readonly string[] {
    const names = new Set<string>();
    this.entries.forEach(entry => names.add(entry.name));
    return Array.from(names);
  }

  getRecentEntries(count: number = 10): readonly PerformanceEntry[] {
    return this.entries.slice(-count);
  }

  clearStats(): void {
    this.entries.length = 0;
  }

  // Export data for analysis
  exportData(): readonly PerformanceEntry[] {
    return [...this.entries];
  }

  // Get performance trends
  getTrends(operationName: string, timeWindowMinutes: number = 30): {
    readonly trend: 'improving' | 'degrading' | 'stable';
    readonly changePercent: number;
  } {
    const cutoffTime = Date.now() - (timeWindowMinutes * 60 * 1000);
    const recentEntries = this.entries.filter(e => 
      e.name === operationName && 
      e.success && 
      e.timestamp > cutoffTime
    );

    if (recentEntries.length < 10) {
      return { trend: 'stable', changePercent: 0 };
    }

    const midPoint = Math.floor(recentEntries.length / 2);
    const firstHalf = recentEntries.slice(0, midPoint);
    const secondHalf = recentEntries.slice(midPoint);

    const firstHalfAvg = firstHalf.reduce((sum, e) => sum + e.duration, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, e) => sum + e.duration, 0) / secondHalf.length;

    const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (Math.abs(changePercent) > 10) {
      trend = changePercent > 0 ? 'degrading' : 'improving';
    }

    return { trend, changePercent };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor(1000);

// ================================
// Fixed Performance Decorators (Strict TypeScript)
// ================================

// Performance decorator for async functions - แก้ไข any types
export function withPerformanceTracking<T extends (...args: readonly unknown[]) => Promise<unknown>>(
  operationName: string,
  fn: T
): T {
  return (async (...args: readonly unknown[]) => {
    const timingId = performanceMonitor.startTiming(operationName);
    
    try {
      const result = await fn(...args);
      performanceMonitor.endTiming(timingId, true);
      return result;
    } catch (error) {
      performanceMonitor.endTiming(
        timingId, 
        false, 
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }) as T;
}

// Performance decorator for sync functions - แก้ไข any types
export function withSyncPerformanceTracking<T extends (...args: readonly unknown[]) => unknown>(
  operationName: string,
  fn: T
): T {
  return ((...args: readonly unknown[]) => {
    const timingId = performanceMonitor.startTiming(operationName);
    
    try {
      const result = fn(...args);
      performanceMonitor.endTiming(timingId, true);
      return result;
    } catch (error) {
      performanceMonitor.endTiming(
        timingId, 
        false, 
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }) as T;
}

// ================================
// Fixed React Hook for monitoring component performance
// ================================

interface UsePerformanceTrackingResult {
  readonly renderCount: number;
}

export const usePerformanceTracking = (componentName: string): UsePerformanceTrackingResult => {
  const [renderCount, setRenderCount] = useState<number>(0);
  
  // แก้ไข React Hook dependencies
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    const timingId = performanceMonitor.startTiming(`component-${componentName}`);
    
    return () => {
      performanceMonitor.endTiming(timingId, true);
    };
  }, [componentName]); // เพิ่ม dependency array เพื่อแก้ไข exhaustive-deps warning

  return { renderCount };
};

// ================================
// Memory monitoring utilities
// ================================

interface MemoryUsage {
  readonly used: number;
  readonly total: number;
  readonly percentage: number;
}

interface MemoryReading {
  readonly timestamp: number;
  readonly used: number;
  readonly total: number;
}

export const memoryMonitor = {
  getCurrentUsage(): MemoryUsage | null {
    if ('memory' in performance) {
      const memory = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }
    return null;
  },

  startMonitoring(intervalMs: number = 5000): () => void {
    const readings: MemoryReading[] = [];
    
    const interval = setInterval(() => {
      const usage = this.getCurrentUsage();
      if (usage) {
        readings.push({
          timestamp: Date.now(),
          used: usage.used,
          total: usage.total
        });

        // Keep only last 100 readings
        if (readings.length > 100) {
          readings.splice(0, readings.length - 100);
        }

        // Log warning if memory usage is high
        if (usage.percentage > 90) {
          console.warn(`High memory usage detected: ${usage.percentage.toFixed(1)}%`);
        }
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }
};

export default performanceMonitor;