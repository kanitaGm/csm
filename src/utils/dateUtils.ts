// src/utils/dateUtils.ts - Enhanced Date Utilities
import { format, parse, isValid, differenceInDays, subDays, startOfDay, endOfDay, type Locale  } from 'date-fns';
import { th , enUS } from 'date-fns/locale';

// ========================================
// TYPES & INTERFACES
// ========================================

export type DateInput = Date | string | number | null | undefined | { toDate(): Date };
type LocaleOption = 'th' | 'en';

export interface DateFormatOptions {
  locale?: 'th' | 'en';
  includeTime?: boolean;
  format?: string;
  fallback?: string;
}

export interface DateRangeOptions {
  start: DateInput;
  end: DateInput;
  inclusive?: boolean;
}

export interface DateValidationOptions {
  minDate?: DateInput;
  maxDate?: DateInput;
  allowFuture?: boolean;
  allowPast?: boolean;
}

export interface DateCalculationResult {
  days: number;
  weeks: number;
  months: number;
  years: number;
  isOverdue: boolean;
  isUpcoming: boolean;
}

// ========================================
// CONSTANTS
// ========================================

export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_WITH_TIME: 'dd/MM/yyyy HH:mm',
  DISPLAY_THAI: 'dd MMMM yyyy',
  DISPLAY_THAI_SHORT: 'dd MMM yyyy',
  ISO: 'yyyy-MM-dd',
  ISO_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  INPUT: 'yyyy-MM-dd',
  FIREBASE: 'yyyy-MM-dd HH:mm:ss',
  READABLE: 'EEEE, dd MMMM yyyy',
  COMPACT: 'ddMMyy',
  API: 'yyyy-MM-ddTHH:mm:ss.SSSZ'
} as const;

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
] as const;

export const THAI_DAYS = [
  'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พอหัสบดี', 'ศุกร์', 'เสาร์'
] as const;

// ========================================
// CORE FUNCTIONS
// ========================================

/**
 * Convert various date inputs to Date object
 */
export const toDate = (input: DateInput): Date | null => {
  if (!input) return null;

  try {
    // Handle Firestore Timestamp-like objects
    if (typeof input === 'object' && 'toDate' in input && typeof input.toDate === 'function') {
      return input.toDate();
    }

    // Handle Date objects
    if (input instanceof Date) {
      return isValid(input) ? input : null;
    }

    // Handle string inputs
    if (typeof input === 'string') {
      // Try ISO format first
      if (input.includes('T') || input.includes('-')) {
        const isoDate = new Date(input);
        if (isValid(isoDate)) return isoDate;
      }

      // Try common Thai formats
      const thaiFormats = [
        'dd/MM/yyyy',
        'dd-MM-yyyy',
        'dd.MM.yyyy',
        'dd/MM/yyyy HH:mm',
        'dd-MM-yyyy HH:mm'
      ];

      for (const formatStr of thaiFormats) {
        try {
          const parsed = parse(input, formatStr, new Date());
          if (isValid(parsed)) return parsed;
        } catch {
          continue;
        }
      }

      // Fallback to Date constructor
      const fallbackDate = new Date(input);
      return isValid(fallbackDate) ? fallbackDate : null;
    }

    // Handle number inputs (timestamps)
    if (typeof input === 'number') {
      // Handle both milliseconds and seconds timestamps
      const date = new Date(input > 1e10 ? input : input * 1000);
      return isValid(date) ? date : null;
    }

    return null;
  } catch (error) {
    console.warn('Date conversion error:', error);
    return null;
  }
};

/**
 * Format date with comprehensive options
 */
export const formatDate = (
  input: DateInput,
  options: DateFormatOptions = {}
): string => {
  const {
    locale = 'th',
    includeTime = false,
    format: customFormat,
    fallback = '-'
  } = options;

  const date = toDate(input);
  if (!date) return fallback;

  const localeMap: Record<LocaleOption, Locale> = {
    th,
    en: enUS
  };

  try {
    // ใช้ custom format หากมี
    if (customFormat) {
      return format(date, customFormat, { locale: localeMap[locale] });
    }

    // Default formats
    if (locale === 'th') {
      const formatStr = includeTime
        ? DATE_FORMATS.DISPLAY_THAI_SHORT + ' HH:mm น.'
        : DATE_FORMATS.DISPLAY_THAI_SHORT;
      return format(date, formatStr, { locale: th });
    } else {
      const formatStr = includeTime
        ? DATE_FORMATS.DISPLAY_WITH_TIME
        : DATE_FORMATS.DISPLAY;
      return format(date, formatStr, { locale: enUS });
    }
  } catch (error) {
    console.warn('Date formatting error:', error);
    return fallback;
  }
};


/**
 * Parse date string with multiple format support
 */
export const parseDate = (
  dateString: string,
  inputFormat?: string,
  referenceDate: Date = new Date()
): Date | null => {
  if (!dateString?.trim()) return null;

  try {
    // Use specific format if provided
    if (inputFormat) {
      const parsed = parse(dateString, inputFormat, referenceDate);
      return isValid(parsed) ? parsed : null;
    }

    // Try multiple common formats
    const formats = [
      DATE_FORMATS.ISO,
      DATE_FORMATS.DISPLAY,
      'dd-MM-yyyy',
      'dd.MM.yyyy',
      'yyyy/MM/dd',
      'MM/dd/yyyy',
      DATE_FORMATS.DISPLAY_WITH_TIME,
      'dd-MM-yyyy HH:mm',
      'yyyy-MM-dd HH:mm'
    ];

    for (const fmt of formats) {
      try {
        const parsed = parse(dateString.trim(), fmt, referenceDate);
        if (isValid(parsed)) return parsed;
      } catch {
        continue;
      }
    }

    // Fallback to native Date parsing
    const nativeDate = new Date(dateString);
    return isValid(nativeDate) ? nativeDate : null;
  } catch (error) {
    console.warn('Date parsing error:', error);
    return null;
  }
};

// ========================================
// VALIDATION FUNCTIONS
// ========================================

/**
 * Validate date with comprehensive options
 */
export const validateDate = (
  input: DateInput,
  options: DateValidationOptions = {}
): { isValid: boolean; error?: string; date?: Date } => {
  const {
    minDate,
    maxDate,
    allowFuture = true,
    allowPast = true
  } = options;

  const date = toDate(input);
  
  if (!date) {
    return { isValid: false, error: 'Invalid date format' };
  }

  const now = new Date();
  const today = startOfDay(now);
  const inputDay = startOfDay(date);

  // Check past/future restrictions
  if (!allowPast && inputDay < today) {
    return { isValid: false, error: 'Past dates are not allowed' };
  }

  if (!allowFuture && inputDay > today) {
    return { isValid: false, error: 'Future dates are not allowed' };
  }

  // Check min date
  if (minDate) {
    const min = toDate(minDate);
    if (min && date < min) {
      return { 
        isValid: false, 
        error: `Date must be after ${formatDate(min)}` 
      };
    }
  }

  // Check max date
  if (maxDate) {
    const max = toDate(maxDate);
    if (max && date > max) {
      return { 
        isValid: false, 
        error: `Date must be before ${formatDate(max)}` 
      };
    }
  }

  return { isValid: true, date };
};

/**
 * Check if date is in range
 */
export const isDateInRange = (
  date: DateInput,
  range: DateRangeOptions
): boolean => {
  const { start, end, inclusive = true } = range;
  
  const dateObj = toDate(date);
  const startDate = toDate(start);
  const endDate = toDate(end);

  if (!dateObj || !startDate || !endDate) return false;

  if (inclusive) {
    return dateObj >= startDate && dateObj <= endDate;
  } else {
    return dateObj > startDate && dateObj < endDate;
  }
};

// ========================================
// CALCULATION FUNCTIONS
// ========================================

/**
 * Calculate comprehensive date differences
 */
export const calculateDateDifference = (
  startDate: DateInput,
  endDate: DateInput = new Date()
): DateCalculationResult | null => {
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (!start || !end) return null;

  const diffDays = differenceInDays(end, start);
  const absDiffDays = Math.abs(diffDays);

  return {
    days: diffDays,
    weeks: Math.floor(absDiffDays / 7),
    months: Math.floor(absDiffDays / 30.44), // Average days per month
    years: Math.floor(absDiffDays / 365.25), // Account for leap years
    isOverdue: diffDays < 0,
    isUpcoming: diffDays > 0
  };
};

/**
 * Get days until date
 */
export const getDaysUntil = (targetDate: DateInput): number | null => {
  const target = toDate(targetDate);
  if (!target) return null;

  const today = startOfDay(new Date());
  const targetDay = startOfDay(target);
  
  return differenceInDays(targetDay, today);
};

/**
 * Check if date is due soon
 */
export const isDueSoon = (
  targetDate: DateInput,
  daysThreshold: number = 7
): boolean => {
  const daysUntil = getDaysUntil(targetDate);
  return daysUntil !== null && daysUntil >= 0 && daysUntil <= daysThreshold;
};

/**
 * Check if date is overdue
 */
export const isOverdue = (targetDate: DateInput): boolean => {
  const daysUntil = getDaysUntil(targetDate);
  return daysUntil !== null && daysUntil < 0;
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get date range for common periods
 */
export const getDateRange = (period: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom', customStart?: DateInput, customEnd?: DateInput) => {
  const now = new Date();
  const today = startOfDay(now);

  switch (period) {
    case 'today':
      return { start: today, end: endOfDay(now) };
    
    case 'yesterday':
      const yesterday = subDays(today, 1);
      return { start: yesterday, end: endOfDay(yesterday) };
    
    case 'thisWeek':
      const startOfWeek = startOfDay(subDays(today, today.getDay()));
      return { start: startOfWeek, end: endOfDay(now) };
    
    case 'lastWeek':
      const lastWeekStart = subDays(today, today.getDay() + 7);
      const lastWeekEnd = subDays(today, today.getDay() + 1);
      return { start: lastWeekStart, end: endOfDay(lastWeekEnd) };
    
    case 'thisMonth':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfMonth, end: endOfDay(now) };
    
    case 'lastMonth':
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: lastMonthStart, end: endOfDay(lastMonthEnd) };
    
    case 'thisYear':
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { start: startOfYear, end: endOfDay(now) };
    
    case 'custom':
      const start = toDate(customStart) || today;
      const end = toDate(customEnd) || endOfDay(now);
      return { start: startOfDay(start), end: endOfDay(end) };
    
    default:
      return { start: today, end: endOfDay(now) };
  }
};

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 */
export const formatRelativeTime = (date: DateInput): string => {
  const dateObj = toDate(date);
  if (!dateObj) return 'Invalid date';

  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (Math.abs(diffDays) >= 1) {
    return diffDays > 0 
      ? `ในอีก ${diffDays} วัน`
      : `${Math.abs(diffDays)} วันที่แล้ว`;
  }

  if (Math.abs(diffHours) >= 1) {
    return diffHours > 0
      ? `ในอีก ${diffHours} ชั่วโมง`
      : `${Math.abs(diffHours)} ชั่วโมงที่แล้ว`;
  }

  if (Math.abs(diffMinutes) >= 1) {
    return diffMinutes > 0
      ? `ในอีก ${diffMinutes} นาที`
      : `${Math.abs(diffMinutes)} นาทีที่แล้ว`;
  }

  return 'เมื่อสักครู่';
};

/**
 * Generate date for input fields
 */
export const toInputDate = (date: DateInput): string => {
  const dateObj = toDate(date);
  return dateObj ? format(dateObj, DATE_FORMATS.INPUT) : '';
};

/**
 * Generate datetime for input fields  
 */
export const toInputDateTime = (date: DateInput): string => {
  const dateObj = toDate(date);
  return dateObj ? format(dateObj, "yyyy-MM-dd'T'HH:mm") : '';
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: DateInput, date2: DateInput): boolean => {
  const d1 = toDate(date1);
  const d2 = toDate(date2);
  
  if (!d1 || !d2) return false;
  
  return startOfDay(d1).getTime() === startOfDay(d2).getTime();
};

/**
 * Get age from birth date
 */
export const calculateAge = (birthDate: DateInput): number | null => {
  const birth = toDate(birthDate);
  if (!birth) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// ========================================
// EXPORTS
// ========================================

export default {
  // Core functions
  toDate,
  formatDate,
  parseDate,
  
  // Validation
  validateDate,
  isDateInRange,
  
  // Calculations
  calculateDateDifference,
  getDaysUntil,
  isDueSoon,
  isOverdue,
  calculateAge,
  
  // Utilities
  getDateRange,
  formatRelativeTime,
  toInputDate,
  toInputDateTime,
  isSameDay,
  
  // Constants
  DATE_FORMATS,
  THAI_MONTHS,
  THAI_DAYS
};