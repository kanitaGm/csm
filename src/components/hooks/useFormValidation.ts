// 📁 src/components/hooks/useFormValidation.ts (ไฟล์ใหม่)
import { useState, useEffect } from 'react';

export const useFormValidation = <T>(schema: any, data: T) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);
  
  useEffect(() => {
    const validationErrors: Record<string, string> = {};
    
    Object.keys(schema).forEach(field => {
      const rules = schema[field];
      const value = (data as any)[field];
      
      if (rules.required && (!value || value.toString().trim() === '')) {
        validationErrors[field] = rules.message || `${field} is required`;
        return;
      }
      
      if (value && rules.pattern && !rules.pattern.test(value)) {
        validationErrors[field] = rules.message || `${field} format is invalid`;
        return;
      }
      
      if (value && rules.minLength && value.length < rules.minLength) {
        validationErrors[field] = rules.message || `${field} is too short`;
        return;
      }
      
      if (value && rules.enum && !rules.enum.includes(value)) {
        validationErrors[field] = rules.message || `${field} value is invalid`;
        return;
      }
    });
    
    setErrors(validationErrors);
    setIsValid(Object.keys(validationErrors).length === 0);
  }, [schema, data]);
  
  return { errors, isValid };
};