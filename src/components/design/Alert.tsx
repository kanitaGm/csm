// ================================
// 6. ALERT COMPONENT
// ================================

// src/components/design-system/Alert.tsx
import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react'

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-gray-50 text-gray-900 border-gray-200 [&>svg]:text-gray-600",
        success: "bg-success-50 text-success-900 border-success-200 [&>svg]:text-success-600",
        warning: "bg-warning-50 text-warning-900 border-warning-200 [&>svg]:text-warning-600",
        error: "bg-error-50 text-error-900 border-error-200 [&>svg]:text-error-600",
        info: "bg-info-50 text-info-900 border-info-200 [&>svg]:text-info-600"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

const iconMap = {
  default: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info
}

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string
  dismissible?: boolean
  onDismiss?: () => void
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", title, dismissible, onDismiss, children, ...props }, ref) => {
    const Icon = iconMap[variant]

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <Icon className="w-4 h-4" />
        <div>
          {title && (
            <h5 className="mb-1 font-medium leading-none tracking-tight">
              {title}
            </h5>
          )}
          <div className="text-sm [&_p]:leading-relaxed">
            {children}
          </div>
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className="absolute p-1 text-current rounded-md right-2 top-2 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>
    )
  }
)

Alert.displayName = "Alert"

export { Alert, alertVariants }