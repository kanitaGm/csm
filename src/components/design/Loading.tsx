// ================================
// 8. LOADING COMPONENT
// ================================

// src/components/design-system/Loading.tsx
import React from 'react'
import { cn } from '../../utils/cn'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'dots' | 'pulse'
  text?: string
  className?: string
}

const LoadingSpinner: React.FC<LoadingProps> = ({ 
  size = 'md', 
  variant = 'spinner', 
  text, 
  className 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  const renderSpinner = () => (
    <div 
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-primary-600',
        sizeClasses[size],
        className
      )}
    />
  )

  const renderDots = () => (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse rounded-full bg-primary-600',
            size === 'sm' ? 'h-1.5 w-1.5' : 
            size === 'md' ? 'h-2 w-2' :
            size === 'lg' ? 'h-3 w-3' : 'h-4 w-4'
          )}
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  )

  const renderPulse = () => (
    <div 
      className={cn(
        'animate-pulse rounded-full bg-primary-600',
        sizeClasses[size],
        className
      )}
    />
  )

  const renderVariant = () => {
    switch (variant) {
      case 'dots': return renderDots()
      case 'pulse': return renderPulse()
      default: return renderSpinner()
    }
  }

  if (text) {
    return (
      <div className="flex flex-col items-center space-y-2">
        {renderVariant()}
        <p className="text-sm text-gray-600">{text}</p>
      </div>
    )
  }

  return renderVariant()
}

// Page Loading Component
const PageLoader: React.FC<{ message?: string }> = ({ 
  message = "กำลังโหลด..." 
}) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <LoadingSpinner size="lg" />
    <p className="text-gray-600">{message}</p>
  </div>
)

// Button Loading Component
const ButtonLoader: React.FC = () => (
  <LoadingSpinner size="sm" className="mr-2" />
)

export { LoadingSpinner, PageLoader, ButtonLoader }