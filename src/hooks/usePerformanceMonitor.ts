// ========================================
// 📁 src/hooks/usePerformanceMonitor.ts
// ========================================

import { useState, useEffect, useCallback, useRef } from 'react';

// ----------------------------
// Types
// ----------------------------
export interface PerformanceMemoryUsage {
  used: number;
  total: number;
  limit: number;
}

export interface PerformanceMetrics {
  readonly renderCount: number;
  readonly lastRenderTime: number;
  readonly averageRenderTime: number;
  readonly memoryUsage?: PerformanceMemoryUsage; // optional
}

export interface UsePerformanceTrackingResult {
  readonly metrics: PerformanceMetrics;
  readonly renderCount: number;
  readonly markRender: () => void;
  readonly markApiCall: (endpoint: string) => void;
  readonly getReport: () => string;
}

// ----------------------------
// Hook
// ----------------------------
export const usePerformanceMonitor = (
  componentName: string
): UsePerformanceTrackingResult => {
  const [renderCount, setRenderCount] = useState<number>(0);
  const [renderTimes, setRenderTimes] = useState<number[]>([]);
  const lastRenderTimeRef = useRef<number>(performance.now());
  const apiCallsRef = useRef<Map<string, number>>(new Map());

  // ----------------------------
  // Mark render
  const markRender = useCallback((): void => {
    const now = performance.now();
    const renderTime = now - lastRenderTimeRef.current;

    setRenderCount((prev) => prev + 1);
    setRenderTimes((prev) => [...prev.slice(-9), renderTime]); // Keep last 10 render times
    lastRenderTimeRef.current = now;
  }, []);

  // ----------------------------
  // Track API call
  const markApiCall = useCallback((endpoint: string): void => {
    const current = apiCallsRef.current.get(endpoint) || 0;
    apiCallsRef.current.set(endpoint, current + 1);
  }, []);

  // ----------------------------
  // Memory usage (Chrome-only)
  const getMemoryUsage = useCallback(
    (): PerformanceMemoryUsage | undefined => {
      const perf = performance as Performance & {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
      };
      if (perf.memory) {
        return {
          used: Math.round(perf.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(perf.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(perf.memory.jsHeapSizeLimit / 1024 / 1024),
        };
      }
      return undefined;
    },
    []
  );

  // ----------------------------
  // Performance report string
  const getReport = useCallback((): string => {
    const avgRenderTime =
      renderTimes.length > 0
        ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length
        : 0;

    const memoryUsage = getMemoryUsage();
    const apiCalls = Array.from(apiCallsRef.current.entries());

    return `
Performance Report for ${componentName}:
- Render Count: ${renderCount}
- Average Render Time: ${avgRenderTime.toFixed(2)}ms
- Memory Usage: ${memoryUsage ? `${memoryUsage.used}MB / ${memoryUsage.total}MB` : 'N/A'}
- API Calls: ${apiCalls.map(([endpoint, count]) => `${endpoint}: ${count}`).join(', ')}
    `.trim();
  }, [componentName, renderCount, renderTimes, getMemoryUsage]);

  // ----------------------------
  // Mark render on each component update
  useEffect(() => {
    markRender();
  });

  // ----------------------------
  // Metrics
  const memoryUsage = getMemoryUsage();
  const metrics: PerformanceMetrics = {
    renderCount,
    lastRenderTime: renderTimes[renderTimes.length - 1] || 0,
    averageRenderTime:
      renderTimes.length > 0
        ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length
        : 0,
    ...(memoryUsage ? { memoryUsage } : {}), // only add property if defined
  };

  return {
    metrics,
    renderCount,
    markRender,
    markApiCall,
    getReport,
  };
};
