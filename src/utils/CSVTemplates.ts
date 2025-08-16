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
    lastUpdatedBy: (userEmail?: string) => userEmail || 'system'
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
    lastUpdatedBy: (userEmail?: string) => userEmail || 'system'
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
    roles: 'roles',
    managedCountry: 'managedCountry',
    managedZones: 'managedZones',
    managedSites: 'managedSites'
  },  
  requiredFields: ['email', 'empId', 'roles','displayName'],
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
    'roles': 'User Role (superadmin/admin/regionalAdmin/zoneAdmin/siteAdmin/plantAdmin/user/guest)',
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
    
    roles: (value: unknown) => {
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
    roles: (value: unknown) => {
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
    workingArea: 'workingArea',
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
  collection: 'csmVendors',
  description: 'Import/export ข้อมูลบริษัท (vendors) สำหรับระบบ CSM และประเภทอื่นๆ',  
  fieldMapping: {
    companyId: 'companyId',
    vdCode: 'vdCode',
    vdName: 'vdName',
    workingArea: 'workingArea',
    category: 'category',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  requiredFields: ['companyId', 'vdCode', 'vdName', 'category'],
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
    vdName: 'ชื่อบริษัท',
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
    vdCode: (value: unknown) => {
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


// CSM Assessment Template
export const CSM_ASSESSMENT_TEMPLATE: CSVTemplateConfig = {
  name: 'CSM Assessment Import',
  collection: 'csmAssessments',
  description: 'Import CSM assessment data from CSV file',
  
  fieldMapping: {
    vdCode: 'vdCode',
    vdName: 'vdName',
    companyId: 'companyId',
    category: 'category',
    workingArea: 'workingArea',
    assessmentDate: 'assessmentDate',
    assessorName: 'assessorName',
    assessorEmail: 'assessorEmail',
    auditeeName: 'auditeeName',
    auditeePosition: 'auditeePosition',
    totalScore: 'totalScore',
    maxScore: 'maxScore',
    avgScore: 'avgScore',
    riskLevel: 'riskLevel',
    status: 'status',
    isFinish: 'isFinish',
    isApproved: 'isApproved',
    notes: 'notes',
    finishedAt: 'finishedAt',
    approvedAt: 'approvedAt',
    approvedBy: 'approvedBy'
  },
  
  requiredFields: ['vdCode', 'vdName', 'category', 'assessmentDate'],
  dateFields: ['assessmentDate', 'finishedAt', 'approvedAt'],
  
  defaultValues: {
    isActive: true,
    status: 'in-progress',
    isFinish: false,
    isApproved: false,
    createdAt: () => new Date(),
    updatedAt: () => new Date(),
    createdBy: (userEmail?: string) => userEmail || 'system'
  },
  
  fieldDescriptions: {
    'vdCode': 'Vendor Code (รหัสผู้รับเหมา) - Required',
    'vdName': 'Vendor Name (ชื่อผู้รับเหมา) - Required',
    'companyId': 'Company ID (รหัสบริษัท)',
    'category': 'CSM Category (หมวดหมู่ CSM: 1/2/3/4) - Required',
    'workingArea': 'Working Area (พื้นที่ทำงาน)',
    'assessmentDate': 'Assessment Date (วันที่ประเมิน DD/MM/YYYY) - Required',
    'assessorName': 'Assessor Name (ชื่อผู้ประเมิน)',
    'assessorEmail': 'Assessor Email (อีเมลผู้ประเมิน)',
    'auditeeName': 'Auditee Name (ชื่อผู้ถูกประเมิน)',
    'auditeePosition': 'Auditee Position (ตำแหน่งผู้ถูกประเมิน)',
    'totalScore': 'Total Score (คะแนนรวม 0-100)',
    'maxScore': 'Maximum Score (คะแนนเต็ม)',
    'avgScore': 'Average Score (คะแนนเฉลี่ย %)',
    'riskLevel': 'Risk Level (ระดับความเสี่ยง: Low/Moderate/High)',
    'status': 'Assessment Status (สถานะการประเมิน)',
    'isFinish': 'Is Finished (เสร็จสิ้นแล้ว: true/false)',
    'isApproved': 'Is Approved (อนุมัติแล้ว: true/false)',
    'notes': 'Additional Notes (หมายเหตุเพิ่มเติม)',
    'finishedAt': 'Finished Date (วันที่เสร็จสิ้น DD/MM/YYYY)',
    'approvedAt': 'Approved Date (วันที่อนุมัติ DD/MM/YYYY)',
    'approvedBy': 'Approved By (ผู้อนุมัติ)'
  },
  
  validationRules: {
    vdCode: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Vendor Code is required';
      }
      if (value.trim().length < 3) {
        return 'Vendor Code must be at least 3 characters';
      }
      return null;
    },
    
    vdName: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Vendor Name is required';
      }
      if (value.trim().length < 2) {
        return 'Vendor Name must be at least 2 characters';
      }
      return null;
    },
    
    category: (value: unknown) => {
      const validCategories = ['1', '2', '3', '4'];
      if (!isString(value) || !value.trim()) {
        return 'Category is required';
      }
      if (!validCategories.includes(value.trim())) {
        return 'Category must be 1, 2, 3, or 4';
      }
      return null;
    },
    
    assessmentDate: (value: unknown) => {
      if (!isString(value) || !value.trim()) {
        return 'Assessment Date is required';
      }
      // Basic date format validation (DD/MM/YYYY or YYYY-MM-DD)
      const dateRegex = /^(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})$/;
      if (!dateRegex.test(value.trim())) {
        return 'Assessment Date must be in DD/MM/YYYY or YYYY-MM-DD format';
      }
      return null;
    },
    
    totalScore: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return null; // Optional field
      }
      const score = Number(value);
      if (isNaN(score)) {
        return 'Total Score must be a number';
      }
      if (score < 0 || score > 1000) {
        return 'Total Score must be between 0 and 1000';
      }
      return null;
    },
    
    maxScore: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return null; // Optional field
      }
      const score = Number(value);
      if (isNaN(score)) {
        return 'Max Score must be a number';
      }
      if (score < 0 || score > 1000) {
        return 'Max Score must be between 0 and 1000';
      }
      return null;
    },
    
    avgScore: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return null; // Optional field
      }
      const score = Number(value);
      if (isNaN(score)) {
        return 'Average Score must be a number';
      }
      if (score < 0 || score > 100) {
        return 'Average Score must be between 0 and 100 (percentage)';
      }
      return null;
    },
    
    riskLevel: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return null; // Optional field
      }
      const validLevels = ['low', 'moderate', 'high'];
      if (!isString(value) || !validLevels.includes(value.toLowerCase().trim())) {
        return 'Risk Level must be Low, Moderate, or High';
      }
      return null;
    },
    
    assessorEmail: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return null; // Optional field
      }
      if (!isString(value)) {
        return 'Invalid email format';
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        return 'Invalid email format';
      }
      return null;
    },
    
    isFinish: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return null; // Optional field
      }
      const validBooleans = ['true', 'false', '1', '0', 'yes', 'no'];
      if (!isString(value) && typeof value !== 'boolean') {
        return 'Is Finished must be true/false, yes/no, or 1/0';
      }
      if (isString(value) && !validBooleans.includes(value.toLowerCase().trim())) {
        return 'Is Finished must be true/false, yes/no, or 1/0';
      }
      return null;
    },
    
    isApproved: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return null; // Optional field
      }
      const validBooleans = ['true', 'false', '1', '0', 'yes', 'no'];
      if (!isString(value) && typeof value !== 'boolean') {
        return 'Is Approved must be true/false, yes/no, or 1/0';
      }
      if (isString(value) && !validBooleans.includes(value.toLowerCase().trim())) {
        return 'Is Approved must be true/false, yes/no, or 1/0';
      }
      return null;
    }
  },
  
  transformers: {
    vdCode: (value: unknown) => {
      if (!isString(value)) return '';
      return sanitizeId(value.trim().toUpperCase());
    },
    
    vdName: (value: unknown) => {
      if (!isString(value)) return '';
      return value.trim();
    },
    
    companyId: (value: unknown) => {
      if (!isString(value)) return '';
      return sanitizeId(value);
    },
    
    category: (value: unknown) => {
      if (!isString(value)) return '';
      return value.trim();
    },
    
    workingArea: (value: unknown) => {
      if (!isString(value)) return '';
      return value.trim();
    },
    
    assessorName: (value: unknown) => {
      if (!isString(value)) return '';
      return value.trim();
    },
    
    assessorEmail: (value: unknown) => {
      if (!isString(value)) return '';
      return value.toLowerCase().trim();
    },
    
    auditeeName: (value: unknown) => {
      if (!isString(value)) return '';
      return value.trim();
    },
    
    auditeePosition: (value: unknown) => {
      if (!isString(value)) return '';
      return value.trim();
    },
    
    totalScore: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const num = Number(value);
      return !isNaN(num) ? num : null;
    },
    
    maxScore: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const num = Number(value);
      return !isNaN(num) ? num : null;
    },
    
    avgScore: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const num = Number(value);
      return !isNaN(num) ? num : null;
    },
    
    riskLevel: (value: unknown) => {
      if (!isString(value)) return '';
      const level = value.toLowerCase().trim();
      // Normalize to standard format
      switch (level) {
        case 'low':
        case 'ต่ำ':
        case 'l':
          return 'Low';
        case 'moderate':
        case 'medium':
        case 'ปานกลาง':
        case 'm':
          return 'Moderate';
        case 'high':
        case 'สูง':
        case 'h':
          return 'High';
        default:
          return level;
      }
    },
    
    status: (value: unknown) => {
      if (!isString(value)) return 'in-progress';
      const status = value.toLowerCase().trim();
      // Normalize status values
      switch (status) {
        case 'completed':
        case 'complete':
        case 'เสร็จ':
        case 'เสร็จสิ้น':
          return 'completed';
        case 'in-progress':
        case 'progress':
        case 'กำลังดำเนินการ':
        case 'ดำเนินการ':
          return 'in-progress';
        case 'not-started':
        case 'not started':
        case 'ยังไม่เริ่ม':
          return 'not-started';
        default:
          return 'in-progress';
      }
    },
    
    isFinish: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return false;
      }
      if (typeof value === 'boolean') {
        return value;
      }
      if (isString(value)) {
        const boolVal = value.toLowerCase().trim();
        return ['true', '1', 'yes', 'เสร็จ', 'จริง'].includes(boolVal);
      }
      return Boolean(value);
    },
    
    isApproved: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return false;
      }
      if (typeof value === 'boolean') {
        return value;
      }
      if (isString(value)) {
        const boolVal = value.toLowerCase().trim();
        return ['true', '1', 'yes', 'อนุมัติ', 'จริง'].includes(boolVal);
      }
      return Boolean(value);
    },
    
    notes: (value: unknown) => {
      if (!isString(value)) return '';
      return value.trim();
    },
    
    approvedBy: (value: unknown) => {
      if (!isString(value)) return '';
      return value.trim();
    }
  }
};

// อัพเดท CSV_TEMPLATES Registry
export const CSV_TEMPLATES: Record<string, CSVTemplateConfig> = {  
  companies: COMPANIES_TEMPLATE,  
  csmVendors: CSMVENDOR_TEMPLATE,
  csmAssessments: CSM_ASSESSMENT_TEMPLATE,  // เพิ่มบรรทัดนี้
  employees: EMPLOYEE_TEMPLATE,
  trainings: TRAINING_TEMPLATE,
  users: USER_ROLES_TEMPLATE,  
};


// Helper functions
export const getTemplateByCollection = (collection: string): CSVTemplateConfig | null => {
  //console.log('getTemplateByCollection called with:', collection);
  //console.log('Available templates in CSV_TEMPLATES:', Object.keys(CSV_TEMPLATES));
  const template = CSV_TEMPLATES[collection] || null;
  //console.log('Template found:', template ? template.name : 'null');
  
  return template;
};

export const getAllTemplates = (): CSVTemplateConfig[] => {
  const templates = Object.values(CSV_TEMPLATES);
  //console.log('getAllTemplates returning:', templates.map(t => ({ name: t.name, collection: t.collection })));
  return templates;
};
