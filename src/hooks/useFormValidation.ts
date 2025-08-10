// 📁 src/components/hooks/useFormValidation.ts 
import { useState, useEffect } from 'react';

// กำหนด type สำหรับ validation rules
interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  enum?: unknown[]; // เปลี่ยนเป็น unknown[] เพื่อรองรับทุก type
  message?: string;
}

// กำหนด type สำหรับ schema
type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule;
};

export const useFormValidation = <T extends Record<string, unknown>>(
  schema: ValidationSchema<T>, 
  data: T
) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);
  
  useEffect(() => {
    const validationErrors: Record<string, string> = {};
    
    // ใช้ Object.keys กับ schema ที่มี type ชัดเจนแล้ว
    (Object.keys(schema) as Array<keyof T>).forEach(field => {
      const rules = schema[field];
      const value = data[field];
      
      // ตรวจสอบว่ามี rules หรือไม่
      if (!rules) return;
      
      // ตรวจสอบ required
      if (rules.required && (!value || String(value).trim() === '')) {
        validationErrors[String(field)] = rules.message || `${String(field)} is required`;
        return;
      }
      
      // ตรวจสอบ pattern (เฉพาะ string)
      if (value && rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        validationErrors[String(field)] = rules.message || `${String(field)} format is invalid`;
        return;
      }
      
      // ตรวจสอบ minLength (เฉพาะ string หรือ array)
      if (value && rules.minLength && 
          (typeof value === 'string' || Array.isArray(value)) && 
          value.length < rules.minLength) {
        validationErrors[String(field)] = rules.message || `${String(field)} is too short`;
        return;
      }
      
      // ตรวจสอบ enum
      if (value && rules.enum) {
        const enumValues = rules.enum;
        const isValidEnum = enumValues.some(enumValue => enumValue === value);
        
        if (!isValidEnum) {
          validationErrors[String(field)] = rules.message || `${String(field)} value is invalid`;
          return;
        }
      }
    });
    
    setErrors(validationErrors);
    setIsValid(Object.keys(validationErrors).length === 0);
  }, [schema, data]);
  
  return { errors, isValid };
};