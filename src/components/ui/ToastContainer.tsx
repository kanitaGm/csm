// 📁 src/components/ui/ToastContainer.tsx 
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Toast } from '../../components/hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className={`
              max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg border
              ${toast.type === 'success' ? 'border-green-200' : ''}
              ${toast.type === 'error' ? 'border-red-200' : ''}
              ${toast.type === 'warning' ? 'border-yellow-200' : ''}
              ${toast.type === 'info' ? 'border-blue-200' : ''}
            `}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                  {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                  {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {toast.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {toast.message}
                  </p>
                  
                  {toast.action && (
                    <button
                      onClick={toast.action.onClick}
                      className="text-sm text-blue-600 hover:text-blue-700 mt-2 font-medium"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>
                
                <button
                  onClick={() => onRemove(toast.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;