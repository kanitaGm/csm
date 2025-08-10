import { Timestamp } from 'firebase/firestore';
import type { Company } from './api';

export type DateInput = Timestamp | Date | string | null | undefined | { seconds: number; nanoseconds?: number };

// ========================================================================
// CSM FORM TYPES - Updated for Dynamic Forms
// ========================================================================
// for csm
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
  id?: string; // Firestore Document ID
  vdCode: string; // รหัสบริษัท (required)
  vdName: string; // ชื่อบริษัท (required)
  vdCategory?: string | null; // หมวดหมู่บริษัท (optional)
  vdRefDoc?: string | null; // เลขที่อ้างอิง (สัญญา, PO) (optional)
  vdWorkingArea?: string | null; // พื้นที่ปฏิบัติงาน (optional)
  riskLevel: 'Low' | 'Moderate' | 'High' | ''; // ระดับความเสี่ยง (required with default)
  assessor?: string | null; // ผู้ประเมิน (optional)
  isActive: boolean; // เป็นการประเมินล่าสุดหรือไม่ (required)
  updateBy: string; // email ผู้อัปเดต (required)
  createdAt: DateInput; // วันที่สร้าง (required) - ใช้ DateInput
  updatedAt: DateInput; // วันที่อัปเดต (required) - ใช้ DateInput
  finalScore?: string | null; // คะแนนรวมทั้งหมด (calculated)
  avgScore?: string | null; // คะแนนเฉลี่ย (calculated)
  answers: CSMAssessmentAnswer[]; // รายการคำตอบ (required)
  isApproved?: boolean; // สำหรับ lock ยืนยันว่าประเมินบริษัทชุดนี้เรียบร้อยแล้วจะแก้ไขไม่ได้ (optional)
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
