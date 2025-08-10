import { Timestamp } from 'firebase/firestore';

// TrainingRecord
export interface TrainingRecord {
  id: string; // Firestore Document ID
  empId: string;
  courseId?: string;
  courseName?: string;  
  trainingDate?: Timestamp | Date | string | null; 
  expiryDate?: Timestamp | Date | string | null; 
  status: 'lifetime' | 'expired' | 'active' | 'pending';
  files?: File[];
  evidenceText?: string;
  updatedAt?: Timestamp | Date | string; 
  updatedBy?: string;
  createdAt: Timestamp | Date | string;
  [key: string]: unknown; // ✅ เก็บไว้สำหรับ flexibility
}

export interface TrainingSummary {
  total: number;
  active: number;
  expired: number;
  uniqueCourses: string[];
}

export interface TrainingCourse {
  id: string;
  courseName: string;
  description?: string;
  duration?: number; // ชั่วโมง
  validityPeriod?: number; // จำนวนวันที่ใช้ได้
  isLifetime: boolean;
  category?: string;
}