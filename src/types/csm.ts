import { Timestamp } from 'firebase/firestore';
import type { Company } from './api';

export type DateInput = Timestamp | Date | string | null | undefined | { seconds: number; nanoseconds?: number };

// ========================================================================
// CSM FORM TYPES - Updated for Dynamic Forms
// ========================================================================
// for csm
export interface CSMVendor {
  id?: string; // Firestore Document ID  
  companyId: string; // อ้างอิงไปยัง companies collection
  vdCode: string; // Vendor Code - รหัสบริษัทที่ใช้อ้างอิง
  vdName: string; // ชื่อบริษัท/หน่วยงาน
  freqAss: string; // รอบ/ความถี่ในการตรวจประเมิน เช่น '1year', '2year', '4year'
  isActive: boolean;
  category: string; // หมวดหมู่บริษัท เช่น 1-admin, 2-service, 3-structure, 4-transporter
  workingArea?: string[]; // พื้นที่ที่ทำงาน
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

// Category configurations สำหรับ CSMVendor
export interface CSMVendorCategory {
  code: string; // เช่น 'admin', 'service', 'structure', 'transporter'
  name: string;
  description: string;
  color: string; // สีสำหรับแสดงผล
  defaultFrequency?: string; // ค่าเริ่มต้น แต่ไม่บังคับ  
}

//  Auditor information สำหรับ CSMAssessment
export interface CSMAuditee{
  name: string; // ชื่อผู้รับการตรวจประเมิน
  email: string; // อีเมลผู้รับการตรวจประเมิน
  phone?: string; // เบอร์ติดต่อผู้รับการตรวจประเมิน
  position?: string; // ตำแหนน่งงาน(ถ้ามี)
}

export const CSM_VENDOR_CATEGORIES: CSMVendorCategory[] = [
  {
    code: '1',
    name: 'Administrative',
    description: 'บริษัทด้านบริหารจัดการ',
    color: 'bg-blue-100 text-blue-800',
    defaultFrequency: '1year'
  },
  {
    code: '2',
    name: 'Service Provider',
    description: 'บริษัทให้บริการ',
    color: 'bg-green-100 text-green-800',
    defaultFrequency: '1year'
  },
  {
    code: '3',
    name: 'Structure/Construction',
    description: 'บริษัทก่อสร้าง/โครงสร้าง',
    color: 'bg-orange-100 text-orange-800',
    defaultFrequency: '2year'
  },
  {
    code: '4',
    name: 'Transportation',
    description: 'กลุ่มงานที่เกี่ยวข้องกับการขนส่ง',
    color: 'bg-purple-100 text-purple-800',
    defaultFrequency: '4year'
  },
  {
    code: 'maintenance',
    name: 'Maintenance',
    description: 'บริษัทซ่อมบำรุง',
    color: 'bg-yellow-100 text-yellow-800',
    defaultFrequency: '1year'
  },
  {
    code: 'security',
    name: 'Security',
    description: 'บริษัทรักษาความปลอดภัย',
    color: 'bg-red-100 text-red-800',
    defaultFrequency: '1year'
  }
];
//  Assessment frequency options
export const ASSESSMENT_FREQUENCIES = [
  { value: '1year', label: 'ทุกปี', months: 12 },
  { value: '2year', label: 'ทุก 2 ปี', months: 24 },
  { value: '3year', label: 'ทุก 3 ปี', months: 36 },
  { value: '4year', label: 'ทุก 4 ปี', months: 48 },
  { value: '5year', label: 'ทุก 5 ปี', months: 60 }
];


/////////////////////// FORM /////////////////

export interface CSMFormField  {
  id?:string;
  ckItem: string; // รหัสข้อ เช่น "1", "2", "3"
  ckType: string | "M" | "P"; // M = Mandatory, P = Optional
  ckQuestion: string; // คำถาม
  ckRequirement: string; // เกณฑ์การประเมิน
  fScore?: string; // น้ำหนักคะแนน สำหรับคำนวณ (default = "5")
  required?: boolean; // จำเป็นต้องตอบหรือไม่
  allowAttach?: boolean; // อนุญาตให้แนบไฟล์หรือไม่
  type: string | 'text';

}
export interface CSMFormDoc {
  id?: string; // Firestore Document ID
  formCode: string; // รหัสฟอร์ม เช่น "CSMChecklist"
  formTitle: string; // ชื่อแบบฟอร์ม
  isActive: boolean; // เปิดใช้งานหรือไม่
  applicableTo: string[]; // ใช้สำหรับอะไร เช่น ["csm", "safety"]
  fields: CSMFormField[]; // รายการคำถาม
  createdAt: DateInput;
  updatedAt: DateInput;
  createdBy: string;  
}
// Score types - คะแนนที่สามารถให้ได้
export type Score = 'n/a' | '0' | '1' | '2' | '3' | '4' | '5' ;

// AssessmentAnswer - คำตอบสำหรับแต่ละคำถาม
export interface CSMAssessmentAnswer {
  ckItem: string; // รหัสข้อคำถาม
  ckType: string | "M" | "P"; // ประเภทคำถาม (M/P)
  ckQuestion?: string; // คำถาม (copy มาจาก FormField)
  comment: string; // ความเห็น/หมายเหตุ
  score?: string; // คะแนนที่ให้ (0-5 หรือ n/a)
  tScore?: string; // คะแนนรวมหลังคูณน้ำหนัก (คำนวณอัตโนมัติ)
  action?: string; // สำหรับใช้ในอนาคต
  files: string[]; // URL ไฟล์ที่แนบมา (สูงสุด 2 ไฟล์ต่อข้อ)
  isFinish?: boolean; // ประเมินข้อนี้เสร็จแล้วหรือไม่
}
// CsmAssessment - ข้อมูลการประเมิน (สำหรับสร้างใหม่) แก้ไขให้รองรับ null values สำหรับ optional fields
export interface CSMAssessment {
  id?: string;
  companyId: string;
  vdCode: string;
  vdName: string; // เพิ่มชื่อ vendor
  formId: string;
  formVersion: string;
  answers: CSMAssessmentAnswer[];
  
  // ✅ เพิ่มข้อมูลผู้ตรวจประเมิน
  auditor: CSMAuditee; // ข้อมูลผู้ตรวจประเมิน
  assessor?: string; // เก็บไว้เพื่อ backward compatibility
  
  // Assessment metadata
  vdCategory?: string;
  vdRefDoc?: string;
  vdWorkingArea?: string;
  riskLevel?: string;
  
  // Scoring
  totalScore?: string;
  maxScore?: string;
  avgScore?: string;
  
  // Status and workflow
  isActive: boolean;
  isFinish?: boolean;
  isApproved?: boolean;
  approvedBy?: string;
  approvedAt?: Timestamp | Date | string;
  
  // Timestamps
  createdAt: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
  lastModifiedBy?: string;
  
  // Additional fields
  notes?: string;
  attachments?: string[];
}

// AssessmentDoc - ข้อมูลการประเมินที่ดึงจาก Firestore
export interface CSMAssessmentDoc extends CSMAssessment {
  id: string; // Firestore Document ID (required)
}

// CsmAssessmentSummary - สรุปการประเมินล่าสุดของแต่ละบริษัท ปรับปรุง riskLevel type ให้ชัดเจน
export interface CSMAssessmentSummary {
  vdCode: string; // รหัสบริษัท
  vdName: string; // ชื่อบริษัท
  lastAssessmentId: string; // ID ของผลประเมินรอบล่าสุด
  lastAssessmentDate: Date; // วันที่บันทึกล่าสุด - ใช้ Date เท่านั้น (สำหรับ frontend)
  totalScore: number; // คะแนนรวมจากคำตอบรอบล่าสุด
  avgScore: number; // คะแนนเฉลี่ยจากคำตอบรอบล่าสุด
  riskLevel: 'Low' | 'Moderate' | 'High' |  ''; // ระดับความเสี่ยง
  summaryByCategory?: Record<string, unknown>; // สรุปแยกตามหมวด (ถ้ามี)
  updatedAt: Date; // เวลาอัปเดตข้อมูลสรุป - ใช้ Date เท่านั้น (สำหรับ frontend)
}

export interface CSMFormListPageProps {
  onEditForm?: (formId: string) => void;
  onCreateForm?: () => void;
}

export interface CSMFormEditorPageProps {
  formId?: string;
  onSave?: (form: CSMFormDoc) => void;
  onCancel?: () => void;
}

// ========================================================================
// COMPONENT PROPS TYPES  fo CSM Components
export interface CSMListPageProps {
  onSelectCompany?: (company: Company) => void;
}

export interface CSMEvaluatePageProps {
  vdCode?: string;
}

export interface CMSQuestionFormProps {
  formFields: CSMFormField[];
  initialAnswers?: CSMAssessmentAnswer[];
  vdCode: string;
  onAnswersChange: (answers: CSMAssessmentAnswer[]) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

export interface CSMAssessmentSummaryProps {
  vdCode: string;
  onViewDetails?: (assessmentId: string) => void;
}


//////////////////
// Helper functions
export const getFrequencyInfo = (freqCode: string) => {
  return ASSESSMENT_FREQUENCIES.find(freq => freq.value === freqCode);
};

export const getCategoryInfo = (categoryCode: string): CSMVendorCategory | undefined => {
  return CSM_VENDOR_CATEGORIES.find(cat => cat.code === categoryCode);
};