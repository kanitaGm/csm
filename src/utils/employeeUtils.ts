// src/components/utils/employeeUtils.ts

import { Timestamp } from 'firebase/firestore';
import type { EmployeeProfile, EmployeeFormState } from '../types';

/** 
 * Clean employee ID (remove spaces and unwanted special characters) 
 */
export const sanitizeEmpId = (id: string): string => {
  if (!id) return "";
  return id.replace(/\//g, '-').replace(/[^a-zA-Z0-9_-]/g, '');
};

export const sanitizeWord = (key: string): string => {
  if (!key) return "";
  return key.normalize('NFC'); // normalize Unicode (important for languages with diacritics)
};

export const sanitizeId = (id: string): string => {
  if (!id) return "";
  return id.replace(/\//g, '-').replace(/[^a-zA-Z0-9_-]/g, '').normalize('NFC');
};

/** 
 * Create keyword array for Firestore search 
 * Enhanced to support CSV import data
 */
export const createSearchKeywords = (form: Partial<EmployeeProfile> | Record<string, unknown>): string[] => {
  const keywords = new Set<string>();

  // Helper function to add keywords with type safety
  const addKeyword = (text?: string | null | number | unknown): void => {
    if (text === null || text === undefined || String(text).trim() === '') return;

    const clean = String(text)
      .toLowerCase()
      .normalize('NFC')
      .trim();
    
    if (clean) {
      keywords.add(clean);
      // Create prefix keywords for autocomplete search
      for (let i = 1; i < clean.length; i++) {
        keywords.add(clean.slice(0, i));
      }
    }
  };

  // Add keywords from various fields
  // Support both EmployeeProfile and CSV data structure
  addKeyword(form.empId);
  addKeyword(form.idCard);
  addKeyword(form.email);
  addKeyword(form.position);
  addKeyword(form.department);
  addKeyword(form.company);
  addKeyword(form.level);
  addKeyword(form.status);
  addKeyword(form.firstName || (form as Record<string, unknown>).firstname);
  addKeyword(form.lastName || (form as Record<string, unknown>).lastname);
  addKeyword(form.fullName || (form as Record<string, unknown>).fullname);
  addKeyword(form.displayName);
  addKeyword(form.nickname);
  addKeyword((form as Record<string, unknown>).phoneNumber || form.phone);
  
  // Add keywords from combined names
  const firstName = form.firstName || (form as Record<string, unknown>).firstname;
  const lastName = form.lastName || (form as Record<string, unknown>).lastname;
  const displayName = form.displayName;
  
  if (firstName && lastName) {
    addKeyword(`${firstName} ${lastName}`);
    addKeyword(`${lastName} ${firstName}`);
  }
  
  if (displayName && firstName) {
    addKeyword(`${displayName} ${firstName}`);
    addKeyword(`${firstName} ${displayName}`);
  }
  
  if (displayName && lastName) {
    addKeyword(`${displayName} ${lastName}`);
    addKeyword(`${lastName} ${displayName}`);
  }

  return Array.from(keywords);
};

// Function to format ID card number
export const formatIdCard = (value: string): string => {
  if (!value) return '';
  const onlyDigits = value.replace(/\D/g, '');
  // Format as x-xxxx-xxxxx-xx-x
  let formatted = onlyDigits.slice(0, 1);
  if (onlyDigits.length > 1) {
    formatted += '-' + onlyDigits.slice(1, 5);
  }
  if (onlyDigits.length > 5) {
    formatted += '-' + onlyDigits.slice(5, 10);
  }
  if (onlyDigits.length > 10) {
    formatted += '-' + onlyDigits.slice(10, 12);
  }
  if (onlyDigits.length > 12) {
    formatted += '-' + onlyDigits.slice(12, 13);
  }
  return formatted;
};

// Format date for display and export
export const formatDate = (dateValue: unknown): string => {
  if (!dateValue) return '';
  
  try {
    let date: Date;
    
    if (dateValue instanceof Timestamp) {
      date = dateValue.toDate();
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else {
      return '';
    }
    
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.warn('Date formatting error:', error);
    return '';
  }
};

/**
 * Convert form data to payload ready for Firestore 'employees' collection
 */
export const normalizeEmployeePayload = (form: Partial<EmployeeFormState>): Omit<EmployeeProfile, 'id' | 'createdAt' | 'updatedAt'> => {
  const fullName = `${form.prefix?.trim() || ''}${form.firstName?.trim() || ''} ${form.lastName?.trim() || ''}`.trim();
  if (!fullName) {
    throw new Error("Full name is required to create employee profile.");
  }

  return {
    empId: form.empId ? sanitizeEmpId(form.empId.trim()) : '',
    idCard: form.idCard ? sanitizeEmpId(form.idCard.trim()) : '',
    prefix: form.prefix || '',
    firstname: form.firstName?.trim() || '',
    lastname: form.lastName?.trim() || '',
    fullname: fullName,
    displayName: form.displayName ? sanitizeWord(form.displayName.trim()) : '',
    nickname: form.nickname?.trim() || '',
    email: form.email?.trim().toLowerCase() || '',
    phone: form.phoneNumber?.trim() || '',
    address: form.address?.trim() || '',
    position: form.position?.trim() || '',
    department: form.department?.trim() || '',
    company: form.company?.trim() || '',    
    zoneId: form.zoneId || '',
    siteId: form.siteId || '',
    plantId: form.plantId || '',
    countryId: form.countryId || '',
    employeeType: form.employeeType || 'pending',
    dateOfBirth: form.dateOfBirth ? Timestamp.fromDate(new Date(form.dateOfBirth)) : null,
    startDate: form.startDate ? Timestamp.fromDate(new Date(form.startDate)) : null,
    cardExpiryDate: form.cardExpiryDate ? Timestamp.fromDate(new Date(form.cardExpiryDate)) : null,
    profileImageUrl: form.profileImageUrl || '',
    status: form.status || 'active',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    lastUpdatedBy: form.lastUpdatedBy || 'System',
    searchKeywords: createSearchKeywords({ ...form, fullName }),
  };
};

/** 
 * Validate form data
 */
export const validateSingleEmployee = (form: Partial<EmployeeFormState>): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  if (!form.empId?.trim()) errors.empId = 'Employee ID is required.';
  if (!form.idCard?.trim()) errors.idCard = 'ID Card is required.';
  if (!form.firstName?.trim()) errors.firstname = 'First Name is required.';
  if (!form.lastName?.trim()) errors.lastname = 'Last Name is required.';
  if (!form.employeeType) errors.employeeType = 'Employee Type is required.';
  if (!form.company) errors.company = 'Company is required.';
  
  return errors;
};

/**
 * Convert CSV data to system format
 * Enhanced for CSV import functionality
 */
export const normalizeCSVEmployeeData = (
  csvData: Record<string, unknown>
): Partial<EmployeeFormState> => {
  // Validate and normalize employee type
  const validateEmployeeType = (
    value: unknown
  ): 'employee' | 'contractor' | 'transporter' | 'driver' | 'pending' | '' => {
    const validTypes = ['employee', 'contractor', 'transporter', 'driver', 'pending', ''] as const;
    type EmployeeType = typeof validTypes[number];
    const normalized = String(value || 'employee').trim().toLowerCase();
    if (validTypes.includes(normalized as EmployeeType)) {
      return normalized as EmployeeType;
    }
    return 'employee';
  };

  // Validate and normalize status
  const validateStatus = (
    value: unknown
  ): 'active' | 'inactive' | 'terminated' | 'pending' => {
    const validStatuses = ['active', 'inactive', 'terminated', 'pending'] as const;
    type StatusType = typeof validStatuses[number];
    const normalized = String(value || 'active').trim().toLowerCase();
    if (validStatuses.includes(normalized as StatusType)) {
      return normalized as StatusType;
    }
    return 'active';
  };

  // Helper to convert date string to Date | null
  const parseDate = (value: unknown): string | Date | null => {
    if (!value) return null;
    const date = new Date(String(value));
    return isNaN(date.getTime()) ? null : date;
  };

  return {
    empId: String(csvData.empId || '').trim(),
    idCard: String(csvData.idCard || '').trim(),
    prefix: String(csvData.prefix || '').trim(),
    firstName: String(csvData.firstName || '').trim(),
    lastName: String(csvData.lastName || '').trim(),
    displayName: String(csvData.displayName || '').trim(),
    nickname: String(csvData.nickname || '').trim(),
    email: String(csvData.email || '').trim().toLowerCase(),
    phoneNumber: String(csvData.phoneNumber || '').trim(),
    address: String(csvData.address || '').trim(),
    position: String(csvData.position || '').trim(),
    department: String(csvData.department || '').trim(),
    company: String(csvData.company || '').trim(),
    level: String(csvData.level || '').trim(),
    employeeType: validateEmployeeType(csvData.employeeType),
    companyId: String(csvData.companyId || '').trim(),
    countryId: String(csvData.countryId || '').trim(),
    zoneId: String(csvData.zoneId || '').trim(),
    siteId: String(csvData.siteId || '').trim(),
    plantId: String(csvData.plantId || '').trim(),
    profileImageUrl: String(csvData.profileImageUrl || '').trim(),
    dateOfBirth: parseDate(csvData.dateOfBirth)|| '',
    startDate: parseDate(csvData.startDate) || '',
    cardExpiryDate: parseDate(csvData.cardExpiryDate)|| '',
    status: validateStatus(csvData.status),
    lastUpdatedBy: String(csvData.lastUpdatedBy || 'CSV Import').trim(),
  };
};


/**
 * Validate employee data for CSV import
 */
export const validateCSVEmployeeData = (data: Record<string, unknown>): string[] => {
  const errors: string[] = [];
  
  if (!data.empId || !String(data.empId).trim()) {
    errors.push('Employee ID is required');
  }
  
  if (!data.idCard || !String(data.idCard).trim()) {
    errors.push('ID Card is required');
  }
  
  if (!data.firstName || !String(data.firstName).trim()) {
    errors.push('First Name is required');
  }
  
  if (!data.lastName || !String(data.lastName).trim()) {
    errors.push('Last Name is required');
  }
  
  if (!data.company || !String(data.company).trim()) {
    errors.push('Company is required');
  }
  
  // Validate email format if provided
  if (data.email && String(data.email).trim()) {
    const email = String(data.email).trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
  }
  
  // Validate ID Card length
  if (data.idCard) {
    const idCard = String(data.idCard).replace(/\D/g, '');
    if (idCard.length !== 13) {
      errors.push('ID Card must be 13 digits');
    }
  }
  
  // Validate phone number format if provided
  if (data.phoneNumber && String(data.phoneNumber).trim()) {
    const phone = String(data.phoneNumber).replace(/[-\s]/g, '');
    if (!/^[0-9]{10}$/.test(phone)) {
      errors.push('Phone number must be 10 digits');
    }
  }
  
  return errors;
};