// ================================
// 🔧 src/utils/performanceMonitor.ts
// Performance Monitor with ESLint Strict Compliance
// ================================

import React, { useState, useEffect } from 'react'

// ================================
// STRICT TYPE DEFINITIONS
// ================================

interface PerformanceEntry {
  readonly name: string
  readonly startTime: number
  readonly duration: number
  readonly success: boolean
  readonly error?: string
  readonly timestamp: number
  readonly metadata?: Record<string, unknown>
}

interface PerformanceStats {
  readonly operationName: string
  readonly averageTime: number
  readonly successRate: number
  readonly totalCalls: number
  readonly recentErrors: readonly string[]
  readonly minTime: number
  readonly maxTime: number
  readonly p95Time: number
  readonly p99Time: number
  readonly throughput: number
}

interface MemoryUsage {
  readonly used: number
  readonly total: number
  readonly percentage: number
  readonly limit: number
}

interface MemoryReading {
  readonly timestamp: number
  readonly used: number
  readonly total: number
  readonly limit: number
}

interface TimingResult {
  readonly duration: number
  readonly success: boolean
  readonly error?: string
  readonly metadata?: Record<string, unknown>
}

interface PerformanceMetrics {
  readonly renderTime: number
  readonly interactionTime: number
  readonly memoryUsage: MemoryUsage | null
  readonly cacheHitRate: number
  readonly errorRate: number
}

interface UsePerformanceTrackingResult {
  readonly renderCount: number
  readonly averageRenderTime: number
  readonly slowRenders: number
  readonly metrics: PerformanceMetrics
}

// ================================
// PERFORMANCE MONITOR CLASS
// ================================

export class PerformanceMonitor {
  private readonly entries: PerformanceEntry[] = []
  private readonly maxEntries: number
  //private readonly performanceObserver: PerformanceObserver | null = null

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries
    
    // Initialize Performance Observer if available
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          this.handlePerformanceEntries(list.getEntries())
        })
        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] })
        // Note: We can't assign to readonly field, so we'll handle this differently
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error)
      }
    }
  }

  // ================================
  // TIMING METHODS
  // ================================

  public startTiming(name: string, metadata?: Record<string, unknown>): string {
    const timingId = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    try {
      performance.mark(`${timingId}-start`)
      
      // Store metadata if provided
      if (metadata) {
        this.storeMetadata(timingId, metadata)
      }
    } catch (error) {
      console.warn('Performance.mark not supported:', error)
    }
    
    return timingId
  }

  public endTiming(
    timingId: string, 
    success: boolean = true, 
    error?: string,
    metadata?: Record<string, unknown>
  ): TimingResult {
    const endTime = performance.now()
    
    try {
      const startMarkName = `${timingId}-start`
      const endMarkName = `${timingId}-end`
      
      performance.mark(endMarkName)
      performance.measure(timingId, startMarkName, endMarkName)
      
      const measure = performance.getEntriesByName(timingId, 'measure')[0]
      const duration = measure?.duration ?? 0
      
      // Create performance entry
      const entry: PerformanceEntry = {
        name: this.extractNameFromTimingId(timingId),
        startTime: measure?.startTime ?? endTime - duration,
        duration,
        success,
        error,
        timestamp: Date.now(),
        metadata: {
          ...this.getStoredMetadata(timingId),
          ...metadata
        }
      }
      
      this.addEntry(entry)
      
      // Cleanup
      this.cleanupTiming(timingId)
      
      return {
        duration,
        success,
        error,
        metadata: entry.metadata
      }
    } catch (performanceError) {
      const fallbackDuration = endTime - (this.getStartTime(timingId) ?? endTime)
      
      console.warn('Performance.measure failed, using fallback:', performanceError)
      
      const entry: PerformanceEntry = {
        name: this.extractNameFromTimingId(timingId),
        startTime: endTime - fallbackDuration,
        duration: fallbackDuration,
        success,
        error: error ?? `Performance API error: ${performanceError instanceof Error ? performanceError.message : 'Unknown error'}`,
        timestamp: Date.now(),
        metadata
      }
      
      this.addEntry(entry)
      
      return {
        duration: fallbackDuration,
        success,
        error: entry.error,
        metadata
      }
    }
  }

  // ================================
  // ASYNC WRAPPER METHODS
  // ================================

  public async measureAsync<T>(
    name: string,
    asyncFn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const timingId = this.startTiming(name, metadata)
    
    try {
      const result = await asyncFn()
      this.endTiming(timingId, true, undefined, { resultType: typeof result })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.endTiming(timingId, false, errorMessage, { errorType: error?.constructor?.name })
      throw error
    }
  }

  public measureSync<T>(
    name: string,
    syncFn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const timingId = this.startTiming(name, metadata)
    
    try {
      const result = syncFn()
      this.endTiming(timingId, true, undefined, { resultType: typeof result })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.endTiming(timingId, false, errorMessage, { errorType: error?.constructor?.name })
      throw error
    }
  }

  // ================================
  // STATISTICS METHODS
  // ================================

  public getStats(operationName?: string): PerformanceStats | null {
    const filteredEntries = operationName 
      ? this.entries.filter(entry => entry.name === operationName)
      : this.entries

    if (filteredEntries.length === 0) {
      return null
    }

    const durations = filteredEntries.map(entry => entry.duration)
    const successfulEntries = filteredEntries.filter(entry => entry.success)
    const recentErrors = filteredEntries
      .filter(entry => !entry.success && entry.error)
      .slice(-10)
      .map(entry => entry.error!)

    // Calculate percentiles
    const sortedDurations = [...durations].sort((a, b) => a - b)
    const p95Index = Math.floor(sortedDurations.length * 0.95)
    const p99Index = Math.floor(sortedDurations.length * 0.99)

    // Calculate throughput (operations per second)
    const timeSpan = Math.max(...filteredEntries.map(e => e.timestamp)) - 
                   Math.min(...filteredEntries.map(e => e.timestamp))
    const throughput = timeSpan > 0 ? (filteredEntries.length / (timeSpan / 1000)) : 0

    return {
      operationName: operationName ?? 'all',
      averageTime: durations.reduce((sum, duration) => sum + duration, 0) / durations.length,
      successRate: (successfulEntries.length / filteredEntries.length) * 100,
      totalCalls: filteredEntries.length,
      recentErrors,
      minTime: Math.min(...durations),
      maxTime: Math.max(...durations),
      p95Time: sortedDurations[p95Index] ?? 0,
      p99Time: sortedDurations[p99Index] ?? 0,
      throughput
    }
  }

  public getAllStats(): readonly PerformanceStats[] {
    const operationNames = [...new Set(this.entries.map(entry => entry.name))]
    return operationNames
      .map(name => this.getStats(name))
      .filter((stats): stats is PerformanceStats => stats !== null)
  }

  public clearStats(): void {
    this.entries.length = 0
  }

  public getRecentEntries(count: number = 50): readonly PerformanceEntry[] {
    return this.entries.slice(-count)
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  private readonly metadataStorage = new Map<string, Record<string, unknown>>()

  private storeMetadata(timingId: string, metadata: Record<string, unknown>): void {
    this.metadataStorage.set(timingId, metadata)
  }

  private getStoredMetadata(timingId: string): Record<string, unknown> | undefined {
    return this.metadataStorage.get(timingId)
  }

  private extractNameFromTimingId(timingId: string): string {
    return timingId.split('-')[0] ?? 'unknown'
  }

  private getStartTime(timingId: string): number | null {
    try {
      const startMarkName = `${timingId}-start`
      const mark = performance.getEntriesByName(startMarkName, 'mark')[0]
      return mark?.startTime ?? null
    } catch {
      return null
    }
  }

  private cleanupTiming(timingId: string): void {
    try {
      performance.clearMarks(`${timingId}-start`)
      performance.clearMarks(`${timingId}-end`)
      performance.clearMeasures(timingId)
      this.metadataStorage.delete(timingId)
    } catch (error) {
      console.warn('Failed to cleanup performance marks:', error)
    }
  }

  private addEntry(entry: PerformanceEntry): void {
    this.entries.push(entry)
    
    // Keep only the most recent entries
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries)
    }
  }

  private handlePerformanceEntries(entries: PerformanceEntryList): void {
    entries.forEach(entry => {
      // Process navigation and resource timing entries
      if (entry.entryType === 'navigation' || entry.entryType === 'resource') {
        const perfEntry: PerformanceEntry = {
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          success: true,
          timestamp: Date.now(),
          metadata: {
            entryType: entry.entryType,
            transferSize: 'transferSize' in entry ? entry.transferSize : undefined,
            encodedBodySize: 'encodedBodySize' in entry ? entry.encodedBodySize : undefined
          }
        }
        this.addEntry(perfEntry)
      }
    })
  }
}

// ================================
// MEMORY MONITORING
// ================================

export const memoryMonitor = {
  getCurrentUsage(): MemoryUsage | null {
    if ('memory' in performance) {
      const memory = (performance as unknown as { 
        memory: { 
          usedJSHeapSize: number
          totalJSHeapSize: number
          jsHeapSizeLimit: number
        } 
      }).memory

      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      }
    }
    return null
  },

  startMonitoring(intervalMs: number = 5000): () => void {
    const readings: MemoryReading[] = []
    
    const interval = setInterval(() => {
      const usage = this.getCurrentUsage()
      if (usage) {
        readings.push({
          timestamp: Date.now(),
          used: usage.used,
          total: usage.total,
          limit: usage.limit
        })

        // Keep only last 100 readings
        if (readings.length > 100) {
          readings.splice(0, readings.length - 100)
        }

        // Log warning if memory usage is high
        if (usage.percentage > 90) {
          console.warn(`High memory usage detected: ${usage.percentage.toFixed(1)}%`)
        }
      }
    }, intervalMs)

    return () => {
      clearInterval(interval)
    }
  },

  getReadings(): readonly MemoryReading[] {
    // This would need to be implemented with a proper storage mechanism
    // For now, return empty array as this is just a utility method
    return []
  }
} as const

// ================================
// REACT HOOKS (STRICT COMPLIANCE)
// ================================

export const usePerformanceTracking = (componentName: string): UsePerformanceTrackingResult => {
  const [renderCount, setRenderCount] = useState<number>(0)
  const [renderTimes, setRenderTimes] = useState<readonly number[]>([])
  const [lastRenderStart, setLastRenderStart] = useState<number>(0)

  // Track render start
  const renderStartTime = performance.now()
  
  useEffect(() => {
    setLastRenderStart(renderStartTime)
  }, [renderStartTime])

  // Track render completion
  useEffect(() => {
    const renderEndTime = performance.now()
    const renderDuration = renderEndTime - lastRenderStart

    setRenderCount(prev => prev + 1)
    setRenderTimes(prev => {
      const newTimes = [...prev, renderDuration]
      // Keep only last 50 render times
      return newTimes.length > 50 ? newTimes.slice(-50) : newTimes
    })

    // Start timing for this component render
    const timingId = performanceMonitor.startTiming(`component-${componentName}`, {
      renderCount: renderCount + 1,
      componentName
    })
    
    // End timing on next tick (after render is complete)
    const timeoutId = setTimeout(() => {
      performanceMonitor.endTiming(timingId, true, undefined, {
        renderDuration,
        phase: 'commit'
      })
    }, 0)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [componentName, lastRenderStart, renderCount])

  // Calculate metrics
  const averageRenderTime = renderTimes.length > 0 
    ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length 
    : 0

  const slowRenders = renderTimes.filter(time => time > 16).length // > 16ms is considered slow

  const memoryUsage = memoryMonitor.getCurrentUsage()

  const metrics: PerformanceMetrics = {
    renderTime: averageRenderTime,
    interactionTime: 0, // Could be implemented with interaction tracking
    memoryUsage,
    cacheHitRate: 0, // Could be implemented with cache tracking
    errorRate: 0 // Could be implemented with error tracking
  }

  return {
    renderCount,
    averageRenderTime,
    slowRenders,
    metrics
  }
}

// ================================
// HOC WRAPPERS (STRICT TYPING)
// ================================

interface WithPerformanceTrackingOptions {
  readonly trackRenders?: boolean
  readonly trackProps?: boolean
  readonly warnOnSlowRender?: boolean
  readonly slowRenderThreshold?: number
}

export function withPerformanceTracking<P extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string,
  options: WithPerformanceTrackingOptions = {}
): React.ComponentType<P> {
  const {
    trackRenders = true,
    trackProps = false,
    warnOnSlowRender = true,
    slowRenderThreshold = 16
  } = options

  const displayName = componentName ?? WrappedComponent.displayName ?? WrappedComponent.name ?? 'Unknown'

  const PerformanceTrackedComponent: React.FC<P> = (props) => {
    const renderStartTime = performance.now()
    
    useEffect(() => {
      if (trackRenders) {
        const renderEndTime = performance.now()
        const renderDuration = renderEndTime - renderStartTime

        if (warnOnSlowRender && renderDuration > slowRenderThreshold) {
          console.warn(`Slow render detected in ${displayName}: ${renderDuration.toFixed(2)}ms`)
        }

        performanceMonitor.measureSync(
          `component-render-${displayName}`,
          () => renderDuration,
          {
            componentName: displayName,
            renderDuration,
            props: trackProps ? props : undefined
          }
        )
      }
    }, [props, renderStartTime])

    return React.createElement(WrappedComponent, props)
  }

  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${displayName})`

  return PerformanceTrackedComponent
}

export function withAsyncPerformanceTracking<P extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const displayName = componentName ?? WrappedComponent.displayName ?? WrappedComponent.name ?? 'Unknown'

  const AsyncPerformanceTrackedComponent: React.FC<P> = (props) => {
    const [isLoading, setIsLoading] = useState<boolean>(true)
    
    useEffect(() => {
      const timingId = performanceMonitor.startTiming(`async-component-${displayName}`)
      
      // Simulate async loading completion
      const timeoutId = setTimeout(() => {
        performanceMonitor.endTiming(timingId, true)
        setIsLoading(false)
      }, 0)

      return () => {
        clearTimeout(timeoutId)
        if (isLoading) {
          performanceMonitor.endTiming(timingId, false, 'Component unmounted before loading completed')
        }
      }
    }, [isLoading])

    if (isLoading) {
      return null // or a loading indicator
    }

    return React.createElement(WrappedComponent, props)
  }

  AsyncPerformanceTrackedComponent.displayName = `withAsyncPerformanceTracking(${displayName})`

  return AsyncPerformanceTrackedComponent
}

// ================================
// UTILITY FUNCTIONS
// ================================

export const measurePageLoad = (): void => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
        
        if (navigation) {
          const metrics = {
            dns: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp: navigation.connectEnd - navigation.connectStart,
            ssl: navigation.secureConnectionStart > 0 ? navigation.connectEnd - navigation.secureConnectionStart : 0,
            ttfb: navigation.responseStart - navigation.requestStart,
            download: navigation.responseEnd - navigation.responseStart,
            dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            load: navigation.loadEventEnd - navigation.loadEventStart,
            total: navigation.loadEventEnd - navigation.navigationStart
          }

          performanceMonitor.measureSync('page-load', () => metrics.total, {
            ...metrics,
            url: window.location.href,
            userAgent: navigator.userAgent
          })
        }
      }, 0)
    })
  }
}

export const measureInteraction = (
  interactionName: string,
  element?: HTMLElement
): void => {
  const timingId = performanceMonitor.startTiming(`interaction-${interactionName}`, {
    element: element?.tagName,
    elementId: element?.id,
    elementClass: element?.className
  })

  // Use requestIdleCallback if available, otherwise setTimeout
  const callback = (): void => {
    performanceMonitor.endTiming(timingId, true)
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback)
  } else {
    setTimeout(callback, 0)
  }
}

export const trackResourceLoading = (): void => {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming
            performanceMonitor.measureSync(
              `resource-${resourceEntry.initiatorType}`,
              () => resourceEntry.duration,
              {
                name: resourceEntry.name,
                type: resourceEntry.initiatorType,
                size: resourceEntry.transferSize,
                cached: resourceEntry.transferSize === 0 && resourceEntry.decodedBodySize > 0
              }
            )
          }
        })
      })

      observer.observe({ entryTypes: ['resource'] })
    } catch (error) {
      console.warn('Resource tracking not supported:', error)
    }
  }
}

// ================================
// SINGLETON INSTANCE
// ================================

export const performanceMonitor = new PerformanceMonitor(1000)

// ================================
// AUTO-INITIALIZATION
// ================================

if (typeof window !== 'undefined') {
  // Auto-track page load
  measurePageLoad()
  
  // Auto-track resource loading
  trackResourceLoading()
  
  // Track unhandled errors
  window.addEventListener('error', (event) => {
    performanceMonitor.measureSync('error', () => 0, {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    })
  })

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    performanceMonitor.measureSync('unhandled-rejection', () => 0, {
      reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
      stack: event.reason instanceof Error ? event.reason.stack : undefined
    })
  })
}

// ================================
// EXPORTS
// ================================

export default performanceMonitor

export type {
  PerformanceEntry,
  PerformanceStats,
  MemoryUsage,
  MemoryReading,
  TimingResult,
  PerformanceMetrics,
  UsePerformanceTrackingResult,
  WithPerformanceTrackingOptions
}