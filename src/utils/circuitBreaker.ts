// ================================
// Circuit Breaker Implementation
// ไฟล์: src/utils/circuitBreaker.ts
// ================================

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

interface CircuitBreakerOptions {
  readonly failureThreshold: number;
  readonly resetTimeout: number;
  readonly monitoringPeriod: number;
  readonly expectedErrors?: readonly string[];
}

interface CircuitBreakerStats {
  readonly state: CircuitState;
  readonly failureCount: number;
  readonly successCount: number;
  readonly lastFailureTime: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  
  constructor(private readonly options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime < this.options.resetTimeout) {
        throw new Error('Circuit breaker is OPEN - Service temporarily unavailable');
      }
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successful calls to close
        this.state = CircuitState.CLOSED;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

// Default instance for CSM services
export const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,        // Open after 5 failures
  resetTimeout: 60000,        // 1 minute
  monitoringPeriod: 10000,    // 10 seconds
  expectedErrors: [
    'PERMISSION_DENIED',
    'NOT_FOUND',
    'NETWORK_ERROR'
  ]
});

// Specialized circuit breaker for critical operations
export const criticalCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,        // More sensitive
  resetTimeout: 30000,        // 30 seconds
  monitoringPeriod: 5000,     // 5 seconds
});

export default circuitBreaker;