// ================================
// 12. TOAST COMPONENT
// ================================

// src/components/design-system/Toast.tsx
import React, { createContext, useContext, useState, useCallback } from 'react'
import { cn } from '../../utils/cn'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

interface Toast {
  id: string
  title?: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

const colorMap = {
  success: {
    bg: 'bg-white',
    border: 'border-success-200',
    icon: 'text-success-600',
    title: 'text-success-800',
    message: 'text-success-700'
  },
  error: {
    bg: 'bg-white',
    border: 'border-error-200',
    icon: 'text-error-600',
    title: 'text-error-800',
    message: 'text-error-700'
  },
  warning: {
    bg: 'bg-white',
    border: 'border-warning-200',
    icon: 'text-warning-600',
    title: 'text-warning-800',
    message: 'text-warning-700'
  },
  info: {
    bg: 'bg-white',
    border: 'border-info-200',
    icon: 'text-info-600',
    title: 'text-info-800',
    message: 'text-info-700'
  }
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const Icon = iconMap[toast.type]
  const colors = colorMap[toast.type]

  React.useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id)
      }, toast.duration || 5000)

      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onRemove])

  return (
    <div className={cn(
      "pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg transition-all duration-300",
      colors.bg,
      colors.border
    )}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={cn("h-5 w-5", colors.icon)} />
          </div>
          <div className="flex-1 w-0 ml-3">
            {toast.title && (
              <p className={cn("text-sm font-medium", colors.title)}>
                {toast.title}
              </p>
            )}
            <p className={cn("mt-1 text-sm", colors.message)}>
              {toast.message}
            </p>
            {toast.action && (
              <div className="mt-3">
                <button
                  onClick={toast.action.onClick}
                  className={cn(
                    "text-sm font-medium underline",
                    colors.title
                  )}
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-shrink-0 ml-4">
            <button
              onClick={() => onRemove(toast.id)}
              className="inline-flex text-gray-400 rounded-md hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { ...toast, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed inset-0 z-50 flex items-end px-4 py-6 pointer-events-none sm:items-start sm:p-6">
        <div className="flex flex-col items-center w-full space-y-4 sm:items-end">
          {toasts.map(toast => (
            <ToastItem 
              key={toast.id} 
              toast={toast} 
              onRemove={removeToast}
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}