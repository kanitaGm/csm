// ========================================
// 📁 src/hooks/useAccessibility.ts
// ========================================

import { useEffect, useCallback, useRef } from 'react';

export interface AccessibilityOptions {
  readonly announceErrors?: boolean;
  readonly focusFirstError?: boolean;
  readonly enableKeyboardNav?: boolean;
  readonly trapFocus?: boolean;
}

export interface UseAccessibilityResult {
  readonly announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  readonly focusFirstError: () => void;
  readonly setupFocusTrap: (containerRef: React.RefObject<HTMLElement>) => void;
  readonly cleanupFocusTrap: () => void;
}

export const useAccessibility = (options: AccessibilityOptions = {}): UseAccessibilityResult => {
  const {
    announceErrors = true,
    focusFirstError = true,
    enableKeyboardNav = true,
    trapFocus = false
  } = options;

  const focusTrapRef = useRef<{
    container: HTMLElement;
    cleanup: () => void;
  } | null>(null);

  const announceToScreenReader = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite'
  ): void => {
    if (!announceErrors) return;

    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('role', 'status');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }, [announceErrors]);

  const focusFirstErrorElement = useCallback((): void => {
    if (!focusFirstError) return;

    const errorElement = document.querySelector('[aria-invalid="true"], .error, [data-error="true"]') as HTMLElement;
    if (errorElement && errorElement.focus) {
      errorElement.focus();
    }
  }, [focusFirstError]);

  const setupFocusTrap = useCallback((containerRef: React.RefObject<HTMLElement>): void => {
    if (!trapFocus || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          event.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    focusTrapRef.current = {
      container,
      cleanup: () => container.removeEventListener('keydown', handleTabKey)
    };
  }, [trapFocus]);

  const cleanupFocusTrap = useCallback((): void => {
    if (focusTrapRef.current) {
      focusTrapRef.current.cleanup();
      focusTrapRef.current = null;
    }
  }, []);

  // Keyboard navigation setup
  useEffect(() => {
    if (!enableKeyboardNav) return;

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [enableKeyboardNav]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupFocusTrap();
    };
  }, [cleanupFocusTrap]);

  return {
    announceToScreenReader,
    focusFirstError: focusFirstErrorElement,
    setupFocusTrap,
    cleanupFocusTrap
  };
};