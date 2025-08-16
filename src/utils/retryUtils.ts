// src/utils/retryUtils.ts - Enhanced Retry Mechanisms
import { circuitBreaker } from './circuitBreaker';

// ========================================
// TYPES & INTERFACES
// ========================================

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffStrategy?: 'linear' | 'exponential' | 'fibonacci' | 'custom';
  jitter?: boolean;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
  abortSignal?: AbortSignal;
  timeout?: number;
  customBackoff?: (attempt: number, baseDelay: number) => number;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalTime: number;
  errors: Error[];
}

export interface RetryableError extends Error {
  isRetryable?: boolean;
  retryAfter?: number; // milliseconds
  statusCode?: number;
}

export interface RetryStats {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  averageRetryTime: number;
  lastAttemptTime: number;
}

export type RetryableOperation<T> = () => Promise<T>;

// ========================================
// ERROR TYPES
// ========================================

export class RetryExhaustedError extends Error {
  public readonly attempts: number;
  public readonly totalTime: number;
  public readonly lastError: Error;
  public readonly allErrors: Error[];

  constructor(
    attempts: number,
    totalTime: number,
    lastError: Error,
    allErrors: Error[] = []
  ) {
    super(`Operation failed after ${attempts} attempts (${totalTime}ms). Last error: ${lastError.message}`);
    this.name = 'RetryExhaustedError';
    this.attempts = attempts;
    this.totalTime = totalTime;
    this.lastError = lastError;
    this.allErrors = allErrors;
  }
}

export class RetryTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
    this.name = 'RetryTimeoutError';
  }
}

export class RetryAbortedError extends Error {
  constructor() {
    super('Operation was aborted');
    this.name = 'RetryAbortedError';
  }
}

// ========================================
// BACKOFF STRATEGIES
// ========================================

const backoffStrategies = {
  linear: (attempt: number, baseDelay: number): number => {
    return baseDelay * attempt;
  },

  exponential: (attempt: number, baseDelay: number): number => {
    return baseDelay * Math.pow(2, attempt - 1);
  },

  fibonacci: (() => {
    const fibCache = [1, 1];
    return (attempt: number, baseDelay: number): number => {
      if (attempt <= 2) return baseDelay;
      
      // Generate fibonacci numbers up to attempt
      while (fibCache.length < attempt) {
        const len = fibCache.length;
        const prev1 = fibCache[len - 1];
        const prev2 = fibCache[len - 2];
        
        // Type-safe fibonacci calculation
        if (prev1 !== undefined && prev2 !== undefined) {
          fibCache[len] = prev1 + prev2;
        } else {
          // Fallback to exponential if cache is corrupted
          return baseDelay * Math.pow(2, attempt - 1);
        }
      }
      
      const fibValue = fibCache[attempt - 1];
      return baseDelay * (fibValue !== undefined ? fibValue : 1);
    };
  })(),

  custom: (attempt: number, baseDelay: number, customFn?: (attempt: number, baseDelay: number) => number): number => {
    return customFn ? customFn(attempt, baseDelay) : baseDelay;
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Add jitter to delay to prevent thundering herd
 */
const addJitter = (delay: number, jitterFactor: number = 0.1): number => {
  const jitter = delay * jitterFactor * Math.random();
  return Math.floor(delay + jitter);
};

/**
 * Calculate delay with backoff strategy
 */
const calculateDelay = (
  attempt: number,
  options: RetryOptions
): number => {
  const {
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    backoffStrategy = 'exponential',
    jitter = true,
    customBackoff
  } = options;

  let delay: number;

  if (backoffStrategy === 'custom' && customBackoff) {
    delay = customBackoff(attempt, baseDelayMs);
  } else {
    delay = backoffStrategies[backoffStrategy](attempt, baseDelayMs);
  }

  // Apply max delay limit
  delay = Math.min(delay, maxDelayMs);

  // Add jitter if enabled
  if (jitter) {
    delay = addJitter(delay);
  }

  return delay;
};

/**
 * Default retry condition - retry on network errors and 5xx status codes
 */
const defaultRetryCondition = (error: Error, attempt: number): boolean => {
  // Don't retry after too many attempts
  if (attempt > 10) return false;

  // Check if error is explicitly non-retryable
  const retryableError = error as RetryableError;
  if (retryableError.isRetryable === false) return false;

  // Retry on network errors
  if (error.name === 'NetworkError' || error.message.includes('fetch')) {
    return true;
  }

  // Retry on specific HTTP status codes
  if (retryableError.statusCode) {
    const statusCode = retryableError.statusCode;
    // Retry on 5xx server errors and specific 4xx errors
    return statusCode >= 500 || statusCode === 408 || statusCode === 429;
  }

  // Retry on timeout errors
  if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
    return true;
  }

  // Don't retry by default
  return false;
};

/**
 * Create timeout promise
 */
const createTimeoutPromise = (timeoutMs: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new RetryTimeoutError(timeoutMs));
    }, timeoutMs);
  });
};

/**
 * Sleep for specified duration
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ========================================
// MAIN RETRY FUNCTION
// ========================================

/**
 * Enhanced retry function with comprehensive options
 */
export const withRetry = async <T>(
  operation: RetryableOperation<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> => {
  const {
    maxRetries = 3,
    retryCondition = defaultRetryCondition,
    onRetry,
    abortSignal,
    timeout
  } = options;

  const startTime = Date.now();
  const errors: Error[] = [];
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;

    try {
      // Check if operation was aborted
      if (abortSignal?.aborted) {
        throw new RetryAbortedError();
      }

      let operationPromise: Promise<T>;

      // Add timeout if specified
      if (timeout) {
        operationPromise = Promise.race([
          operation(),
          createTimeoutPromise(timeout)
        ]);
      } else {
        operationPromise = operation();
      }

      const result = await operationPromise;
      
      // Success - return result with metadata
      return {
        result,
        attempts: attempt,
        totalTime: Date.now() - startTime,
        errors
      };

    } catch (error) {
      const currentError = error as Error;
      errors.push(currentError);

      // Check if we should retry
      const shouldRetry = attempt <= maxRetries && retryCondition(currentError, attempt);
      
      if (!shouldRetry) {
        throw new RetryExhaustedError(
          attempt,
          Date.now() - startTime,
          currentError,
          errors
        );
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, options);
      
      // Call retry callback if provided
      if (onRetry) {
        try {
          onRetry(currentError, attempt, delay);
        } catch (callbackError) {
          console.warn('Retry callback error:', callbackError);
        }
      }

      // Wait before next attempt
      await sleep(delay);

      // Check abort signal again before next attempt
      if (abortSignal?.aborted) {
        throw new RetryAbortedError();
      }
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new RetryExhaustedError(
    attempt,
    Date.now() - startTime,
    errors[errors.length - 1] || new Error('Unknown error'),
    errors
  );
};

// ========================================
// SPECIALIZED RETRY FUNCTIONS
// ========================================

/**
 * Quick retry for simple operations
 */
export const quickRetry = async <T>(
  operation: RetryableOperation<T>,
  maxRetries: number = 3
): Promise<T> => {
  const result = await withRetry(operation, {
    maxRetries,
    baseDelayMs: 500,
    backoffStrategy: 'exponential'
  });
  return result.result;
};

/**
 * Retry with exponential backoff and jitter
 */
export const retryWithBackoff = async <T>(
  operation: RetryableOperation<T>,
  maxRetries: number = 5,
  baseDelayMs: number = 1000
): Promise<T> => {
  const result = await withRetry(operation, {
    maxRetries,
    baseDelayMs,
    backoffStrategy: 'exponential',
    jitter: true,
    maxDelayMs: 30000
  });
  return result.result;
};

/**
 * Retry for API calls with circuit breaker
 */
export const retryApiCall = async <T>(
  operation: RetryableOperation<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const apiRetryCondition = (error: Error, attempt: number): boolean => {
    const retryableError = error as RetryableError;
    
    // Don't retry 4xx errors except specific ones
    if (retryableError.statusCode && retryableError.statusCode >= 400 && retryableError.statusCode < 500) {
      return retryableError.statusCode === 408 || retryableError.statusCode === 429;
    }
    
    return defaultRetryCondition(error, attempt);
  };

  const operationWithCircuitBreaker = async (): Promise<T> => {
    return circuitBreaker.execute(operation);
  };

  const result = await withRetry(operationWithCircuitBreaker, {
    maxRetries: 3,
    baseDelayMs: 1000,
    backoffStrategy: 'exponential',
    retryCondition: apiRetryCondition,
    ...options
  });

  return result.result;
};

/**
 * Retry for database operations
 */
export const retryDatabaseOperation = async <T>(
  operation: RetryableOperation<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const dbRetryCondition = (error: Error, _attempt: number): boolean => {
    // Retry on connection errors, timeouts, and deadlocks
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('deadlock') ||
        errorMessage.includes('lock wait timeout') ||
        errorMessage.includes('too many connections')) {
      return true;
    }
    
    return false;
  };

  const result = await withRetry(operation, {
    maxRetries: 5,
    baseDelayMs: 2000,
    backoffStrategy: 'fibonacci',
    retryCondition: dbRetryCondition,
    ...options
  });

  return result.result;
};

// ========================================
// RETRY WITH STATISTICS
// ========================================

class RetryStatsCollector {
  private stats: RetryStats = {
    totalAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageRetryTime: 0,
    lastAttemptTime: 0
  };
  
  private retryTimes: number[] = [];

  recordAttempt(success: boolean, retryTime: number): void {
    this.stats.totalAttempts++;
    this.stats.lastAttemptTime = Date.now();
    
    if (success) {
      this.stats.successfulRetries++;
    } else {
      this.stats.failedRetries++;
    }
    
    this.retryTimes.push(retryTime);
    this.stats.averageRetryTime = this.retryTimes.reduce((sum, time) => sum + time, 0) / this.retryTimes.length;
    
    // Keep only last 100 retry times for memory efficiency
    if (this.retryTimes.length > 100) {
      this.retryTimes = this.retryTimes.slice(-100);
    }
  }

  getStats(): RetryStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryTime: 0,
      lastAttemptTime: 0
    };
    this.retryTimes = [];
  }
}

// Global stats collector
export const retryStats = new RetryStatsCollector();

/**
 * Retry with statistics collection
 */
export const retryWithStats = async <T>(
  operation: RetryableOperation<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> => {
  const startTime = Date.now();
  
  try {
    const result = await withRetry(operation, options);
    retryStats.recordAttempt(true, Date.now() - startTime);
    return result;
  } catch (error) {
    retryStats.recordAttempt(false, Date.now() - startTime);
    throw error;
  }
};

// ========================================
// UTILITY EXPORTS
// ========================================

/**
 * Create retryable error
 */
export const createRetryableError = (
  message: string,
  isRetryable: boolean = true,
  statusCode?: number,
  retryAfter?: number
): RetryableError => {
  const error = new Error(message) as RetryableError;
  error.isRetryable = isRetryable;
  
  // Type-safe property assignment
  if (statusCode !== undefined) {
    error.statusCode = statusCode;
  }
  
  if (retryAfter !== undefined) {
    error.retryAfter = retryAfter;
  }
  
  return error;
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: Error): boolean => {
  const retryableError = error as RetryableError;
  return retryableError.isRetryable !== false && defaultRetryCondition(error, 1);
};

/**
 * Get retry delay from error (for rate limiting)
 */
export const getRetryDelay = (error: Error): number | null => {
  const retryableError = error as RetryableError;
  return retryableError.retryAfter || null;
};

// ========================================
// DEFAULT EXPORT
// ========================================

export default {
  withRetry,
  quickRetry,
  retryWithBackoff,
  retryApiCall,
  retryDatabaseOperation,
  retryWithStats,
  retryStats,
  createRetryableError,
  isRetryableError,
  getRetryDelay,
  RetryExhaustedError,
  RetryTimeoutError,
  RetryAbortedError
};