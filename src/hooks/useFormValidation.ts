// ========================================
// 📁 src/hooks/useFormValidation.ts
// ========================================

import { useState, useCallback, useMemo } from 'react';
import type { FormValidationResult, FieldValidationResult } from '../types/filters';

export type ValidationRule<T> = {
  readonly required?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly pattern?: RegExp;
  readonly custom?: (value: unknown, allValues: T) => string | null;
  readonly message?: string;
};

export type FormValidationOptions<T> = {
  readonly [K in keyof T]?: ValidationRule<T>;
};

export interface UseFormValidationResult<T> {
  readonly values: T;
  readonly errors: Record<keyof T, string>;
  readonly isValid: boolean;
  readonly isDirty: boolean;
  readonly touchedFields: Set<keyof T>;
  readonly validateField: (field: keyof T, value: unknown) => FieldValidationResult;
  readonly validateForm: () => FormValidationResult;
  readonly setFieldValue: (field: keyof T, value: unknown) => void;
  readonly setFieldError: (field: keyof T, error: string) => void;
  readonly clearFieldError: (field: keyof T) => void;
  readonly clearErrors: () => void;
  readonly markFieldTouched: (field: keyof T) => void;
  readonly resetForm: () => void;
}

export const useFormValidation = <T extends Record<string, unknown>>(
  initialValues: T,
  validationRules: FormValidationOptions<T>
): UseFormValidationResult<T> => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>);
  const [touchedFields, setTouchedFields] = useState<Set<keyof T>>(new Set());

  const validateField = useCallback((field: keyof T, value: unknown): FieldValidationResult => {
    const rule = validationRules[field];
    if (!rule) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const errors: string[] = [];

    // Required validation
    if (rule.required && (value === null || value === undefined || value === '')) {
      errors.push(rule.message || `${String(field)} is required`);
    }

    // Skip other validations if empty and not required
    if (!rule.required && (value === null || value === undefined || value === '')) {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Min/Max validation for numbers
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${String(field)} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${String(field)} must be at most ${rule.max}`);
      }
    }

    // Min/Max validation for strings
    if (typeof value === 'string') {
      if (rule.min !== undefined && value.length < rule.min) {
        errors.push(`${String(field)} must be at least ${rule.min} characters`);
      }
      if (rule.max !== undefined && value.length > rule.max) {
        errors.push(`${String(field)} must be at most ${rule.max} characters`);
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push(rule.message || `${String(field)} format is invalid`);
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value, values);
      if (customError) {
        errors.push(customError);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }, [validationRules, values]);

  const validateForm = useCallback((): FormValidationResult => {
    const fieldResults: Record<string, FieldValidationResult> = {};
    const generalErrors: string[] = [];

    Object.keys(values).forEach(field => {
      const fieldKey = field as keyof T;
      fieldResults[field] = validateField(fieldKey, values[fieldKey]);
    });

    const isValid = Object.values(fieldResults).every(result => result.isValid);

    return {
      isValid,
      fieldResults,
      generalErrors,
      errors: Object.fromEntries(
        Object.entries(fieldResults).map(([field, result]) => [
          field,
          result.errors.join(', ')
        ])
      )
    };
  }, [values, validateField]);

  const setFieldValue = useCallback((field: keyof T, value: unknown): void => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Validate field immediately if it's been touched
    if (touchedFields.has(field)) {
      const validation = validateField(field, value);
      if (validation.isValid) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      } else {
        setErrors(prev => ({
          ...prev,
          [field]: validation.errors.join(', ')
        }));
      }
    }
  }, [touchedFields, validateField]);

  const setFieldError = useCallback((field: keyof T, error: string): void => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const clearFieldError = useCallback((field: keyof T): void => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearErrors = useCallback((): void => {
    setErrors({} as Record<keyof T, string>);
  }, []);

  const markFieldTouched = useCallback((field: keyof T): void => {
    setTouchedFields(prev => new Set(prev).add(field));
  }, []);

  const resetForm = useCallback((): void => {
    setValues(initialValues);
    setErrors({} as Record<keyof T, string>);
    setTouchedFields(new Set());
  }, [initialValues]);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0 && Object.keys(values).length > 0;
  }, [errors, values]);

  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  return {
    values,
    errors,
    isValid,
    isDirty,
    touchedFields,
    validateField,
    validateForm,
    setFieldValue,
    setFieldError,
    clearFieldError,
    clearErrors,
    markFieldTouched,
    resetForm
  };
};