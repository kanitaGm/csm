// 📁 src/components/hooks/useKeyboardShortcuts.ts 
// Fixed useKeyboardShortcuts Hook
// ================================
import { useEffect } from 'react';

type ShortcutHandler = (event: KeyboardEvent) => void;
type ShortcutMap = Record<string, ShortcutHandler>;

export const useKeyboardShortcuts = (
  shortcuts: ShortcutMap, 
  enabled: boolean = true
): void => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      const key = [
        event.ctrlKey && 'ctrl',
        event.altKey && 'alt',
        event.shiftKey && 'shift',
        event.metaKey && 'meta',
        event.key.toLowerCase()
      ].filter(Boolean).join('+');

      const handler = shortcuts[key];
      if (handler) {
        handler(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
};