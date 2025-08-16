// ========================================
// 📁 src/hooks/useApi.ts
// ========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ApiResponse } from '../types/api';

export interface UseApiOptions {
  readonly cacheTime?: number;
  readonly retryAttempts?: number;
  readonly enablePolling?: boolean;
  readonly pollingInterval?: number;
  readonly onSuccess?: (data: unknown) => void;
  readonly onError?: (error: Error) => void;
}

export interface UseApiResult<T> {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refetch: () => Promise<void>;
  readonly mutate: (newData: T) => void;
  readonly lastFetch: Date | null;
}

export const useApi = <T>(
  endpoint: string, 
  options: UseApiOptions = {}
): UseApiResult<T> => {
  const {
    //cacheTime = 5 * 60 * 1000, // 5 minutes
    retryAttempts = 3,
    enablePolling = false,
    pollingInterval = 30000,
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (retryCount = 0): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      
      const response = await fetch(endpoint, {
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<T> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'API returned unsuccessful response');
      }

      setData(result.data);
      setLastFetch(new Date());
      retryCountRef.current = 0;
      
      onSuccess?.(result.data);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      
      if (error.name === 'AbortError') {
        return; // Request was aborted, don't set error
      }

      if (retryCount < retryAttempts) {
        retryCountRef.current = retryCount + 1;
        setTimeout(() => {
          void fetchData(retryCount + 1);
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
        return;
      }

      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [endpoint, retryAttempts, onSuccess, onError]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchData();
  }, [fetchData]);

  const mutate = useCallback((newData: T): void => {
    setData(newData);
    setLastFetch(new Date());
  }, []);

  // Initial fetch
  useEffect(() => {
    void fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Polling
  useEffect(() => {
    if (!enablePolling) return;

    pollingIntervalRef.current = setInterval(() => {
      void fetchData();
    }, pollingInterval);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [enablePolling, pollingInterval, fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    mutate,
    lastFetch
  };
};
