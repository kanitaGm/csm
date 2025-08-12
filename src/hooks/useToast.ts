// 📁 src/hooks/useToast.ts
// Toast hook without duplicate interface
import { useState, useCallback, useRef } from 'react';
import type { Toast } from '../types/props'; // ใช้ Toast จาก props.ts

type ToastInput = Omit<Toast, 'id'>;

interface UseToastReturn {
  toasts: readonly Toast[];
  addToast: (toast: ToastInput) => void;
  removeToast: (id: string) => void;
}

export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const removeToast = useCallback((id: string): void => {
    // Clear timeout if exists
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }
    
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);
  
  const addToast = useCallback((toast: ToastInput): void => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    // Set timeout for auto-removal
    if (toast.duration !== 0) {
      const timeoutId = setTimeout(() => {
        removeToast(id);
      }, toast.duration ?? 5000);
      
      timeoutRefs.current.set(id, timeoutId);
    }
  }, [removeToast]);
  
  return { toasts, addToast, removeToast };
};
