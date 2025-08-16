// ========================================
// 📁 src/hooks/useDebounce.ts
// ========================================

import { useState, useEffect } from 'react';

export interface UseDebounceOptions {
  readonly leading?: boolean;
  readonly trailing?: boolean;
  readonly maxWait?: number;
}

export const useDebounce = <T>(
  value: T, 
  delay: number, 
  options: UseDebounceOptions = {}
): T => {
  const { leading = false, trailing = true } = options;
  const [debouncedValue, setDebouncedValue] = useState<T>(leading ? value : value);

  useEffect(() => {
    if (leading && !trailing) {
      setDebouncedValue(value);
      return;
    }

    const handler = setTimeout(() => {
      if (trailing) {
        setDebouncedValue(value);
      }
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay, leading, trailing]);

  return debouncedValue;
};
