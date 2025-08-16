// src/components/design-system/DesignSystemProvider.tsx
import React from 'react'
import { ToastProvider } from './Toast'
import { ThemeProvider } from '../../contexts/ThemeProvider'

interface DesignSystemProviderProps {
  children: React.ReactNode
}

export const DesignSystemProvider: React.FC<DesignSystemProviderProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  )
}