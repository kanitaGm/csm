// ================================
// 5. BADGE COMPONENT
// ================================

// src/components/design-system/Badge.tsx
import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200",
        primary: "border-transparent bg-primary-100 text-primary-800 hover:bg-primary-200",
        secondary: "border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200",
        success: "border-transparent bg-success-100 text-success-800 hover:bg-success-200",
        warning: "border-transparent bg-warning-100 text-warning-800 hover:bg-warning-200",
        error: "border-transparent bg-error-100 text-error-800 hover:bg-error-200",
        info: "border-transparent bg-info-100 text-info-800 hover:bg-info-200",
        outline: "border-gray-300 text-gray-600 hover:bg-gray-50"
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }