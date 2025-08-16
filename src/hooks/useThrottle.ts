// src/hooks/useThrottle.ts
import { useRef, useCallback } from 'react'

export const useThrottle = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T => {
  const lastRan = useRef<number>(0)

  return useCallback((...args: Parameters<T>) => {
    if (Date.now() - lastRan.current >= delay) {
      callback(...args)
      lastRan.current = Date.now()
    }
  }, [callback, delay]) as T
}