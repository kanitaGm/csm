// src/components/utils/CSVTemplates.ts
//validateCSVEmployeeData
import { sanitizeEmpId, sanitizeId } from './employeeUtils';

// Type Guards สำหรับตรวจสอบว่าเป็น string หรือไม่
const isString = (value: unknown): value is string => {
  return typeof value === 'string' || value instanceof String;
};

// Type Guard สำหรับตรวจสอบว่าเป็น object หรือไม่
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

// Interface สำหรับ template configuration
export interface CSVTemplateConfig {
  name: string;
  collection: string;
  description: string;
  fieldMapping: Record<string, string>;
  requiredFields: string[];
  validationRules: Record<string, (value: unknown) => string | null>;
  defaultValues: Record<string, unknown | ((userEmail?: string) => unknown)>;
  dateFields: string[];
  fieldDescriptions: Record<string, string>;
  transformers?: Record<string, (value: unknown) => unknown>;
  rowTransformer?: (record: unknown) => unknown;
}

export interface CSVTemplateField {
  key: string;
  description?: string;
}


// Employee Template
export const EMPLOYEE_TEMPLATE: CSVTemplateConfig = {
  name: 'Employee Import',
  collection: 'employees',
  description: 'Import employee data from CSV file',
  fieldMapping: {
    empId: 'empId',
    idCard: 'idCard',
    prefix: 'prefix',
    firstName: 'firstName', 
    lastName: 'lastName',
    displayName: 'displayName',
    nickname: 'nickname',
    email: 'email',
    position: 'position',
    phoneNumber: 'phoneNumber', 
    address: 'address',
    dateOfBirth: 'dateOfBirth',
    startDate: 'startDate',
    cardExpiryDate: 'cardExpiryDate',
    employeeType: 'employeeType',
    level: 'level',
    department: 'department',
    company: 'company',
    companyId: 'companyId',
    countryId: 'countryId',
    zoneId: 'zoneId',
    siteId: 'siteId',
    plantId: 'plantId',
    profileImageUrl: 'profileImageUrl',
    fullName: 'fullName'
  },  
  requiredFields: ['empId', 'idCard', 'firstName', 'lastName', 'company'],
  dateFields: ['dateOfBirth', 'startDate', 'cardExpiryDate'],  
  defaultValues: {
    status: 'active',
    createdAt: () => new Date(),
    createdBy: (userEmail?: string) => userEmail || 'system',
    lastUpdateBy: (userEmail?: string) => userEmail || 'system'
  },  
  fieldDescriptions: {
    'empId': 'Employee ID (Unique)',
    'idCard': 'ID Card Number (13 digits)',
    'prefix': 'Name Prefix (Mr./Ms./Mrs.)',
    'firstName': 'First Name',
    'lastName': 'Last Name',
    'displayName': 'Display Name / Local Name',
    'nickname': 'Nickname',
    'email': 'Email Address',
    'position': 'Job Position',
    'phoneNumber': 'Phone Number',
    'address': 'Address',
    'dateOfBirth': 'Date of Birth (YYYY-MM-DD)',
    'startDate': 'Start Date (YYYY-MM-DD)',
    'cardExpiryDate': 'Card Expiry Date (YYYY-MM-DD)',
    'employeeType': 'Employee Type (employee/contractor/transporter/driver)',
    'level': 'Employee Level',
    'department': 'Department',
    'company': 'Company Name',
    'companyId': 'Company ID',
    'countryId': 'Country ID',
    'zoneId': 'Zone ID',
    'siteId': 'Site ID',
    'plantId': 'Plant ID',
    'profileImageUrl': 'Profile Image URL',
    'fullName': 'English Fullname'
  },  
  validationRules: {
    empId: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Employee ID is required';
      }
      return null;
    },    
    idCard: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'ID Card is required';
      }
      const cleaned = value.trim().replace(/\s+/g, '').replace(/[^0-9]/g, '');
      if (cleaned.length !== 13) {
        return 'ID Card must be 13 digits';
      }
      return null;
    },    
    firstName: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'First Name is required';
      }
      return null;
    },    
    lastName: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Last Name is required';
      }
      return null;
    },
    
    company: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Company is required';
      }
      return null;
    },
    
    email: (value: unknown) => {
      if (isString(value) && value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          return 'Invalid email format';
        }
      }
      return null;
    },
    
    phoneNumber: (value: unknown) => {
      if (isString(value) && value.trim()) {
        const cleaned = value.replace(/[-\s]/g, '');
        if (!/^[0-9]{10}$/.test(cleaned)) {
          return 'Phone number must be 10 digits';
        }
      }
      return null;
    },
    
    dateOfBirth: (value: unknown) => {
      if (isString(value) && value.trim()) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
          return 'Date must be in YYYY-MM-DD format';
        }
      }
      return null;
    },
    
    startDate: (value: unknown) => {
      if (isString(value) && value.trim()) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
          return 'Date must be in YYYY-MM-DD format';
        }
      }
      return null;
    },
    
    cardExpiryDate: (value: unknown) => {
      if (isString(value) && value.trim()) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
          return 'Date must be in YYYY-MM-DD format';
        }
      }
      return null;
    },

    employeeType: (value: unknown) => {
      if (isString(value) && value.trim()) {
        const validTypes = ['employee', 'contractor', 'transporter', 'driver', 'pending'];
        if (!validTypes.includes(value.toLowerCase().trim())) {
          return 'Employee type must be: employee, contractor, transporter, driver, or pending';
        }
      }
      return null;
    },

    status: (value: unknown) => {
      if (isString(value) && value.trim()) {
        const validStatuses = ['active', 'inactive', 'terminated', 'pending', 'blacklist'];
        if (!validStatuses.includes(value.toLowerCase().trim())) {
          return 'Status must be: active, inactive, terminated, pending, or blacklist';
        }
      }
      return null;
    }
  },  
  transformers: {
    email: (value: unknown) => {
      if (isString(value)) {
        return value.toLowerCase().trim();
      }
      return value;
    },
    
    empId: (value: unknown) => {
      if (!isString(value)) return '';
      return sanitizeEmpId(value); // ใช้ฟังก์ชันจาก employeeUtils
    },
    
    idCard: (value: unknown) => {
      if (isString(value)) {
        return value.trim().replace(/\s+/g, '').replace(/[^0-9]/g, '');
      }
      return '';
    },
    
    firstName: (value: unknown) => {
      if (isString(value)) {
        return value.trim();
      }
      return value;
    },
    
    lastName: (value: unknown) => {
      if (isString(value)) {
        return value.trim();
      }
      return value;
    },
    
    displayName: (value: unknown) => {
      if (isString(value)) {
        return value.trim().normalize('NFC');
      }
      return value;
    },
    
    company: (value: unknown) => {
      if (isString(value)) {
        return value.trim();
      }
      return value;
    }
  },
    // Row transformer เพื่อสร้าง fullName อัตโนมัติ
  rowTransformer: (record: unknown) => {
    if (isRecord(record)) {
      const { firstName, lastName, prefix } = record;
      if (isString(firstName) && isString(lastName)) {
        const prefixStr = isString(prefix) ? prefix : '';
        record.fullName = `${prefixStr} ${firstName} ${lastName}`.trim();
      }
    }
    return record;
  }

};

// Training Template
export const TRAINING_TEMPLATE: CSVTemplateConfig = {
  name: 'Training Records Import',
  collection: 'trainings',
  description: 'Import training records from CSV file',
  
  fieldMapping: {
    empId: 'empId',
    courseId: 'courseId',    
    courseName: 'courseName',
    trainingDate: 'trainingDate',
    expiryDate: 'expiryDate',
    status: 'status',
    certificateURL: 'certificateURL',
    evidenceText: 'evidenceText',
    instructor: 'instructor',
    location: 'location',
    duration: 'duration',
    score: 'score'
  },
  
  requiredFields: ['empId', 'courseName', 'trainingDate', 'status'],
  dateFields: ['trainingDate', 'expiryDate'],
  
  defaultValues: {
    createdAt: () => new Date(),
    createdBy: (userEmail?: string) => userEmail || 'system',
    lastUpdateBy: (userEmail?: string) => userEmail || 'system'
  },
  
  fieldDescriptions: {
    'empId': 'Employee ID',
    'courseName': 'Training Course Name',
    'trainingDate': 'Training Date (YYYY-MM-DD)',
    'expiryDate': 'Certificate Expiry Date (YYYY-MM-DD)',
    'status': 'Status (lifetime/expired/active/pending)',
    'certificateURL': 'Certificate URL',
    'evidenceText': 'Evidence/Notes',
    'instructor': 'Instructor Name',
    'location': 'Training Location',
    'duration': 'Duration (hours)',
    'score': 'Test Score'
  },
  
  validationRules: {
    empId: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Employee ID is required';
      }
      return null;
    },
    
    courseName: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Course Name is required';
      }
      return null;
    },
    
    trainingDate: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Training Date is required';
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
        return 'Date must be in YYYY-MM-DD format';
      }
      return null;
    },
    
    status: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Status is required';
      }
      const validStatuses = ['lifetime', 'expired', 'active', 'pending'];
      if (!validStatuses.includes(value.toLowerCase().trim())) {
        return 'Status must be: lifetime, expired, active, or pending';
      }
      return null;
    },
    
    expiryDate: (value: unknown) => {
      if (isString(value) && value.trim()) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
          return 'Date must be in YYYY-MM-DD format';
        }
      }
      return null;
    },
    
    duration: (value: unknown) => {
      if (value !== null && value !== undefined && value !== '') {
        const num = Number(value);
        if (isNaN(num)) {
          return 'Duration must be a number';
        }
      }
      return null;
    },
    
    score: (value: unknown) => {
      if (value !== null && value !== undefined && value !== '') {
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 100) {
          return 'Score must be a number between 0-100';
        }
      }
      return null;
    }
  },
  
  transformers: {    
    empId: (value: unknown) => {
      if (!isString(value)) return '';
      return sanitizeEmpId(value); // ใช้ฟังก์ชันจาก employeeUtils
    },
    
    courseName: (value: unknown) => {
      if (isString(value)) {
        return value.trim().normalize('NFC');
      }
      return value;
    },
    
    status: (value: unknown) => {
      if (isString(value)) {
        return value.toLowerCase().trim();
      }
      return value;
    },
    
    duration: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const num = Number(value);
      return !isNaN(num) ? num : null;
    },
    
    score: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const num = Number(value);
      return !isNaN(num) ? num : null;
    }
  }
};

// User Roles Template
export const USER_ROLES_TEMPLATE: CSVTemplateConfig = {
  name: 'User Roles Import',
  collection: 'users',
  description: 'Import user roles and permissions from CSV file',
  
  fieldMapping: {
    empId: 'empId',
    email: 'email',
    displayName: 'displayName',
    role: 'role',
    managedCountry: 'managedCountry',
    managedZones: 'managedZones',
    managedSites: 'managedSites'
  },  
  requiredFields: ['email', 'empId', 'role','displayName'],
  dateFields: [],  
  defaultValues: {
    isActive: true,
    passcode: 'pass*123',
    createdAt: () => new Date(),
    updatedAt: () => new Date(),
    createdBy: (userEmail?: string) => userEmail || 'system'
  },  
  fieldDescriptions: {
    'empId': 'Employee ID',
    'email': 'User Email Address',
    'displayName': 'User Fullname',
    'role': 'User Role (superadmin/admin/regionalAdmin/zoneAdmin/siteAdmin/plantAdmin/user/guest)',
    'managedCountry': 'Managed Country',
    'managedZones': 'Managed Zones (comma-separated)',
    'managedSites': 'Managed Sites (comma-separated)'
  },  
  validationRules: {
    email: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Email is required';
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        return 'Invalid email format';
      }
      return null;
    },
    
    empId: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Employee ID is required';
      }
      return null;
    },
    
    role: (value: unknown) => {
      const validRoles = ['superadmin', 'admin', 'regionalAdmin', 'zoneAdmin', 'siteAdmin', 'plantAdmin', 'user', 'guest'];
      if (!isString(value) || !value.trim()) {
        return 'Role is required';
      }
      if (!validRoles.includes(value.toLowerCase().trim())) {
        return `Role must be one of: ${validRoles.join(', ')}`;
      }
      return null;
    }
  },  
  transformers: {    
    email: (value: unknown) => {
      if (isString(value)) {
        return value.toLowerCase().trim();
      }
      return value;
    },    
    role: (value: unknown) => {
      if (isString(value)) {
        return value.toLowerCase().trim();
      }
      return value;
    },    
    empId: (value: unknown) => {
      if (!isString(value)) return '';
      return sanitizeEmpId(value); // ใช้ฟังก์ชันจาก employeeUtils
    }
  }
};


// User Companies Template
export const COMPANIES_TEMPLATE: CSVTemplateConfig = {
  name: 'Companies Import',
  collection: 'companies',
  description: 'Import/export ข้อมูลบริษัท',  
  fieldMapping: {
    companyId: 'companyId',
    name: 'name',
    type: 'type',
    address: 'address',
    phone: 'phone',
    email: 'email',
    workingArea: 'workinArea',
    contactPerson: 'contactPerson',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  requiredFields: ['companyId', 'name', 'type'],
  dateFields: ['createdAt', 'updatedAt'],
  defaultValues: {
    isActive: true,
    createdAt: () => new Date(),
    updatedAt: () => new Date(),
    createdBy: (userEmail?: string) => userEmail || 'system',
  },

  fieldDescriptions: {
    companyId: 'รหัสบริษัทที่ไม่ซ้ำกัน (Unique company code)',
    name: 'ชื่อบริษัท',
    type: 'ประเภทบริษัท เช่น csm, safety, hr',
    address: 'ที่อยู่บริษัท',
    phone: 'เบอร์ติดต่อ',
    email: 'อีเมลบริษัท',
    contactPerson: 'ผู้ติดต่อ',
    createdAt: 'วันที่สร้างเอกสาร (รูปแบบวันที่)',
    updatedAt: 'วันที่แก้ไขล่าสุด (รูปแบบวันที่)',
    workingArea: 'สถานที่รับงาน/ทำงานในกลุ่มบริษัท',
  },

  validationRules: {
    companyId: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Company ID is required';
      }
      return null;
    },
    name: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Company name is required';
      }
      return null;
    },
    type: (value: unknown) => {
      const validTypes = ['csm', 'safety'];
      if (!isString(value) || !value.trim()) {
        return 'Type is required';
      }
      if (!validTypes.includes(value.toLowerCase().trim())) {
        return `Type must be one of: ${validTypes.join(', ')}`;
      }
      return null;
    },
    email: (value: unknown) => {
      if (value === undefined || value === null || value === '') return null; // ไม่บังคับ
      if (!isString(value)) return 'Invalid email format';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        return 'Invalid email format';
      }
      return null;
    },
  },

  transformers: {
    companyId: (value: unknown) => {
      if (!isString(value)) return '';
      return sanitizeId(value);
    },
    name: (value: unknown) => {
      if (isString(value)) {
        return value.trim();
      }
      return value;
    },
    type: (value: unknown) => {
      if (isString(value)) {
        return value.toLowerCase().trim();
      }
      return value;
    },
    email: (value: unknown) => {
      if (isString(value)) {
        return value.toLowerCase().trim();
      }
      return value;
    },
  },
};


// User Companies Template
export const CSMVENDOR_TEMPLATE: CSVTemplateConfig = {
  name: 'CSM Vendor Import',
  collection: 'csmVendor',
  description: 'Import/export ข้อมูลบริษัท (vendors) สำหรับระบบ CSM และประเภทอื่นๆ',  
  fieldMapping: {
    companyId: 'companyId',
    vdCode: 'companyId',
    vdName: 'vdName',
    workingArea: 'workinArea',
    category: 'category',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  requiredFields: ['companyId', 'vdCoe', 'vdName', 'category'],
  dateFields: ['createdAt', 'updatedAt'],
  defaultValues: {
    isActive: true,
    createdAt: () => new Date(),
    updatedAt: () => new Date(),
    createdBy: (userEmail?: string) => userEmail || 'system',
  },

  fieldDescriptions: {
    companyId: 'รหัสบริษัทที่ไม่ซ้ำกัน (Unique company code)',
    vdCode: 'รหัสบริษัททีใช้ประเมิน CSM มาจากรหัวบริษัท_category+WorkingAres=a',
    vdnName: 'ชื่อบริษัท',
    type: 'ประเภทบริษัท เช่น csm, safety, hr',
    workingArea: 'สถานที่รับงาน/ทำงานในกลุ่มบริษัท',
    category: 'Category',
  },

  validationRules: {
    companyId: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Company ID is required';
      }
      return null;
    },
    veCode: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Vendor Code is required';
      }
      return null;
    },    
    vdName: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Vendor name is required';
      }
      return null;
    }
  },

  transformers: {
    companyId: (value: unknown) => {
      if (!isString(value)) return '';
      return sanitizeId(value);
    },
    vdCode: (value: unknown) => {
      if (!isString(value)) return '';
      return sanitizeId(value);
    },
    vdName: (value: unknown) => {
      if (isString(value)) {
        return value.trim();
      }
      return value;
    }
  },
};


// Template Registry
export const CSV_TEMPLATES: Record<string, CSVTemplateConfig> = {
  company: COMPANIES_TEMPLATE,
  vendor: CSMVENDOR_TEMPLATE,
  employees: EMPLOYEE_TEMPLATE,
  trainingRecords: TRAINING_TEMPLATE,
  users: USER_ROLES_TEMPLATE,  

};

// Helper functions
export const getTemplateByCollection = (collection: string): CSVTemplateConfig | null => {
  return CSV_TEMPLATES[collection] || null;
};

export const getAllTemplates = (): CSVTemplateConfig[] => {
  return Object.values(CSV_TEMPLATES);
};