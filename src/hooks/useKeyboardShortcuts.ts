// ========================================
// 📁 src/hooks/useKeyboardShortcuts.ts 
// ========================================

import { useEffect, useCallback } from 'react';

export type ShortcutHandler = (event: KeyboardEvent) => void;
export type KeyboardShortcutMap = Record<string, ShortcutHandler>;

export interface UseKeyboardShortcutsOptions<T extends HTMLElement | Document = Document> {
  readonly enabled?: boolean;
  readonly preventDefault?: boolean;
  readonly stopPropagation?: boolean;
  readonly target?: T;
}

export const useKeyboardShortcuts = <T extends HTMLElement | Document = Document>(
  shortcuts: KeyboardShortcutMap,
  options: UseKeyboardShortcutsOptions<T> = {}
): void => {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    target = document as T
  } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const key = [
      event.ctrlKey && 'ctrl',
      event.altKey && 'alt',
      event.shiftKey && 'shift',
      event.metaKey && 'meta',
      event.key.toLowerCase()
    ].filter(Boolean).join('+');

    const handler = shortcuts[key];
    if (handler) {
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();
      handler(event);
    }
  }, [shortcuts, enabled, preventDefault, stopPropagation]);

  useEffect(() => {
    if (!enabled) return;

    // Type-safe listener
    const listener: EventListener = (event) => {
      if (event instanceof KeyboardEvent) {
        handleKeyDown(event);
      }
    };

    target.addEventListener('keydown', listener);
    return () => target.removeEventListener('keydown', listener);
  }, [target, handleKeyDown, enabled]);
};
