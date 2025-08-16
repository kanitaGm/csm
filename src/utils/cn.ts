// ================================
// 15. UTILITY FUNCTIONS
// ================================

// src/utils/cn.ts (if not exists)
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}