// ========================================
// scr/features/csm/pages/CSMEvaluatePage.tsx - Fixed Version with Layout and Save Issues
// ========================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { 
  ArrowLeft, Save, CheckCircle, AlertTriangle, 
  FileText, Building2,  Users, Shield, Send, 
  ChevronRight, ChevronLeft, 
} from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../contexts/AuthContext';
import { useDebouncedAutoSave } from '../../../hooks/useDebouncedAutoSave';
import { enhancedCSMService } from '../../../services/enhancedCsmService';
// เปลี่ยนจาก fileUtils เป็น utils ใหม่
import { UniversalFileUpload } from '../../../components/ui/UniversalFileUpload';
import type { FileAttachment } from '../../../hooks/useFileUpload';
//import { validateFile, getFileMetadata } from '../../../utils';
import type {  
  CSMAssessment, 
  CSMAssessmentAnswer, 
  CSMAuditor,
  CSMAuditee,
  AssessmentStatus,
} from '../../../types/csm';
import type { ScoreOption, Score } from '../../../types/forms';

/////////////
interface FileAttachmentFixed {
  readonly id: string
  readonly name: string
  readonly size: number
  readonly type: string
  readonly url: string | undefined // Fixed: explicit undefined
  readonly base64?: string | undefined
  readonly status: string
  readonly compressionRatio: number
}
interface QuestionFileAttachmentFixed {
  readonly id: string
  readonly name: string
  readonly size: number
  readonly type: string
  readonly url: string | undefined // Fixed: explicit undefined
  readonly base64?: string | undefined
  readonly compressionRatio?: number | undefined // Fixed: explicit undefined
  readonly originalSize: number
}
// Fixed: File upload options
interface UseFileUploadOptionsFixed {
  readonly disabled?: boolean | undefined // Fixed: explicit undefined
  readonly label?: string | undefined
  readonly description?: string | undefined
  readonly className?: string | undefined
  readonly showPreview?: boolean | undefined
  readonly showCompressionInfo?: boolean | undefined
  readonly acceptedFileTypes?: string | undefined
  readonly maxFiles?: number
  readonly maxFileSize?: number
  readonly allowedTypes?: readonly string[]
  readonly imageOptions?: {
    readonly maxSizeMB?: number
    readonly maxWidthOrHeight?: number
    readonly quality?: number
    readonly fileType?: string
  }
  readonly pdfMinSize?: number
  readonly imageMinSize?: number
}

// ========================================
// CONSTANTS & TYPES
// ========================================
const SCORE_OPTIONS: ScoreOption[] = [
  { value: '2', label: '2', description: 'ผ่าน/ดี', color: 'bg-green-400' },
  { value: '1', label: '1', description: 'ต้องปรับปรุง', color: 'bg-yellow-400' },
  { value: '0', label: '0', description: 'ไม่ผ่าน/ไม่มี', color: 'bg-red-400' },
  { value: 'n/a', label: 'N/A', description: 'ไม่เกี่ยวข้อง', color: 'bg-gray-400' }
];

const RISK_LEVELS = [
  { value: 'Low', label: 'ต่ำ', color: 'bg-green-100 text-green-500' },
  { value: 'Moderate', label: 'ปานกลาง', color: 'bg-yellow-100 text-yellow-500' },
  { value: 'High', label: 'สูง', color: 'bg-red-100 text-red-500' }
];

// ========================================
interface QuestionProgress {
  completed: number;
  total: number;
  percentage: number;
}

// ========================================
interface QuestionFileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  base64?: string;
  compressionRatio?: number;
  originalSize?: number;
}

// ========================================
// HELPER FUNCTIONS
// ========================================
const calculateAssessmentStatus = (
  answers: CSMAssessmentAnswer[],
  confirmations: Record<string, boolean>,
  totalQuestions: number
): AssessmentStatus => {
  const answeredQuestions = answers.filter(a => a.score && a.score !== '').length;
  const confirmedQuestions = Object.values(confirmations).filter(Boolean).length;
  
  if (answeredQuestions === 0) return 'not-started';
  if (confirmedQuestions === totalQuestions) return 'completed';
  return 'in-progress';
};

const calculateProgress = (
  answers: CSMAssessmentAnswer[],
  confirmations: Record<string, boolean>,
  totalQuestions: number
) => {
  const answeredQuestions = answers.filter(a => a.score && a.score !== '').length;
  const confirmedQuestions = Object.values(confirmations).filter(Boolean).length;
  
  return {
    totalQuestions,
    answeredQuestions,
    confirmedQuestions,
    percentage: totalQuestions > 0 ? Math.round((confirmedQuestions / totalQuestions) * 100) : 0
  };
};

const validateRequiredFields = (
  auditor: CSMAuditor, 
  auditee: CSMAuditee, 
  assessmentInfo: { riskLevel: string; workingArea: string; category: string }
): boolean => {
  return !!(
    auditor.name && 
    auditee.name && 
    assessmentInfo.riskLevel &&
    assessmentInfo.workingArea &&
    assessmentInfo.category
  );
};

// ========================================
// COMPONENTS
// ========================================

// Progress Bar Component
const ProgressBar: React.FC<{ progress: QuestionProgress }> = ({ progress }) => (
  <div className="w-full h-4 bg-gray-200 rounded-full">
    <div 
      className="flex items-center justify-end h-4 pr-3 transition-all duration-300 bg-blue-600 rounded-full"
      style={{ width: `${progress.percentage}%` }}
    >
      {progress.percentage > 15 && (
        <span className="text-xs font-medium text-white">
          {progress.completed}/{progress.total}
        </span>
      )}
    </div>
  </div>
);

// Assessment Status Badge
const AssessmentStatusBadge: React.FC<{
  status: AssessmentStatus;
  progress: ReturnType<typeof calculateProgress>;
}> = ({ status, progress }) => {
  const getStatusConfig = (status: AssessmentStatus) => {
    switch (status) {
      case 'not-started':
        return { color: 'bg-gray-100 text-gray-800', icon: '⚪', label: 'ยังไม่เริ่ม' };
      case 'in-progress':
        return { color: 'bg-blue-100 text-blue-800', icon: '🔄', label: 'กำลังประเมิน' };
      case 'completed':
        return { color: 'bg-green-100 text-green-800', icon: '✅', label: 'เสร็จสิ้น' };
      case 'submitted':
        return { color: 'bg-purple-100 text-purple-800', icon: '📤', label: 'ส่งแล้ว' };
      case 'approved':
        return { color: 'bg-emerald-100 text-emerald-800', icon: '✅', label: 'อนุมัติแล้ว' };
      case 'rejected':
        return { color: 'bg-red-100 text-red-800', icon: '❌', label: 'ไม่อนุมัติ' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: '❓', label: 'ไม่ทราบสถานะ' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      <span className="mr-2">{config.icon}</span>
      <span>{config.label}</span>
      {status === 'in-progress' && (
        <span className="ml-2 text-xs">
          ({progress.confirmedQuestions}/{progress.totalQuestions})
        </span>
      )}
    </div>
  );
};


// File Upload Component // Enhanced File Upload Wrapper for Question
const QuestionFileUpload: React.FC<{
  files: QuestionFileAttachment[];
  onChange: (files: QuestionFileAttachment[]) => void;
  disabled?: boolean;
  questionIndex: number;
}> = ({ files, onChange, disabled, questionIndex }) => {
  const { addToast } = useToast();

  // Convert between old and new file format
  const convertToUniversalFiles = (oldFiles: QuestionFileAttachment[]): FileAttachment[] => {
    return oldFiles.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.url,
      base64: file.base64,
      status: 'completed',
      compressionRatio: file.compressionRatio || 0
    }));
  };

  const convertFromUniversalFiles = (newFiles: FileAttachment[]): QuestionFileAttachment[] => {
    return newFiles.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.url,
      base64: file.base64,
      compressionRatio: file.compressionRatio,
      originalSize: file.compressionRatio ? Math.round(file.size / (1 - file.compressionRatio / 100)) : file.size
    }));
  };

  const handleFilesChange = (newFiles: FileAttachment[]) => {
    const convertedFiles = convertFromUniversalFiles(newFiles);
    onChange(convertedFiles);

    // Show summary notification
    if (newFiles.length > files.length) {
      const addedCount = newFiles.length - files.length;
      addToast({
        type: 'success',
        title: 'เพิ่มไฟล์แล้ว',
        message: `เพิ่มไฟล์หลักฐานสำหรับข้อ ${questionIndex + 1} จำนวน ${addedCount} ไฟล์`,
        duration: 3000
      });
    }
  };

  return (
    <UniversalFileUpload
      files={convertToUniversalFiles(files)}
      onFilesChange={handleFilesChange}
      options={{
        disabled,
        label: `แนบไฟล์หลักฐาน ข้อ ${questionIndex + 1} (ถ้ามี)`,
        description: 'รองรับ: JPG, PNG, WebP, PDF, DOC, DOCX (ขนาดไม่เกิน 10MB)',
        className: '',
        showPreview: true,
        showCompressionInfo: true,
        acceptedFileTypes: 'image/*,.pdf,.doc,.docx',
        maxFiles: 10,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        imageOptions: {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 600,
          quality: 0.8,
          fileType: 'image/webp'
        },
        pdfMinSize: 500 * 1024, // 500KB
        imageMinSize: 100 * 1024, // 100KB
      }}
    />
  );
};

// Add this component for showing file attachment summary
const FileAttachmentSummary: React.FC<{
  questionFiles: Record<string, QuestionFileAttachment[]>;
  totalQuestions: number;
}> = ({ questionFiles, totalQuestions }) => {
  const totalFiles = Object.values(questionFiles).reduce((sum, files) => sum + files.length, 0);
  const questionsWithFiles = Object.keys(questionFiles).filter(key => questionFiles[key].length > 0).length;
  
  if (totalFiles === 0) return null;
  
  return (
    <div className="p-4 mb-6 border border-blue-200 rounded-lg bg-blue-50">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-blue-900">📎 สรุปไฟล์แนบ</h4>
          <p className="text-xs text-blue-800">
            มีไฟล์แนบทั้งหมด {totalFiles} ไฟล์ ใน {questionsWithFiles} ข้อ จาก {totalQuestions} ข้อ
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-900">{totalFiles}</div>
          <div className="text-xs text-blue-700">ไฟล์</div>
        </div>
      </div>
    </div>
  );
};


// Question Confirm Button
const QuestionConfirmButton: React.FC<{
  isConfirmed: boolean;
  onConfirm: (confirmed: boolean) => void;
  disabled?: boolean;
  hasScore?: boolean;
}> = ({ isConfirmed, onConfirm, disabled, hasScore }) => (
  <div className="p-4 mt-6 border rounded-lg bg-gray-50">
    <label className="flex items-start space-x-3 cursor-pointer">
      <input
        type="checkbox"
        checked={isConfirmed}
        onChange={(e) => onConfirm(e.target.checked)}
        disabled={disabled || !hasScore}
        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
      />
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-700">
          {isConfirmed ? '✅ ประเมินข้อนี้เสร็จแล้ว' : '☐ ยืนยันว่าข้อนี้ประเมินเสร็จแล้ว'}
        </span>
        {!hasScore && (
          <p className="mt-1 text-xs text-orange-600">
            กรุณาให้คะแนนก่อนยืนยัน
          </p>
        )}
        {isConfirmed && (
          <p className="mt-1 text-xs text-green-600">
            ข้อนี้ได้รับการยืนยันแล้ว และจะถูกนับรวมในผลการประเมิน ✓
          </p>
        )}
      </div>
    </label>
  </div>
);

// Score Selector Component
const ScoreSelector: React.FC<{
  value: string;
  onChange: (score: Score) => void;
  disabled?: boolean;
  allowNA?: boolean;
  questionType?: string;
}> = ({ value, onChange, disabled, allowNA = true}) => {

  //console.log(questionType)
  const availableOptions = allowNA 
    ? SCORE_OPTIONS 
    : SCORE_OPTIONS.filter((opt: ScoreOption) => opt.value !== 'n/a');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-base font-medium text-gray-700">
          คะแนนประเมิน
        </label>
      </div>
      
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {availableOptions.map((option: ScoreOption) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`
              relative p-2 rounded-lg border-2 transition-all duration-200 text-center
              ${value === option.value
                ? `${option.color} text-white border-transparent shadow-lg transform scale-105`
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:shadow-md'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="mb-1 text-xl font-bold">{option.label}</div>
            <div className="text-xs leading-tight">{option.description}</div>
            {value === option.value && (
              <div className="absolute -top-1 -right-1">
                <CheckCircle className="w-8 h-8 text-white bg-green-500 rounded-full" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// Fixed Layout: Three blocks in a row
const InfoFormsSection: React.FC<{
  auditor: CSMAuditor;
  auditee: CSMAuditee;
  assessmentInfo: { riskLevel: string; workingArea: string; category: string };
  onAuditorChange: (auditor: CSMAuditor) => void;
  onAuditeeChange: (auditee: CSMAuditee) => void;
  onAssessmentInfoChange: (field: string, value: string) => void;
  disabled?: boolean;
}> = ({
  auditor,
  auditee,
  assessmentInfo,
  onAuditorChange,
  onAuditeeChange,
  onAssessmentInfoChange,
  disabled
}) => (
  <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-3"> 
    {/* ข้อมูลการประเมิน */}
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="flex items-center mb-3 text-base font-medium text-gray-900">
        <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
        ข้อมูลการประเมิน
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            ระดับความเสี่ยง <span className="text-red-500">*</span>
          </label>
          <select
            value={assessmentInfo.riskLevel}
            onChange={(e) => onAssessmentInfoChange('riskLevel', e.target.value)}
            disabled={disabled}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            required
          >
            <option value="">เลือกระดับความเสี่ยง</option>
            {RISK_LEVELS.map(risk => (
              <option key={risk.value} value={risk.value}>
                {risk.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            พื้นที่ปฏิบัติงาน <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={assessmentInfo.workingArea}
            onChange={(e) => onAssessmentInfoChange('workingArea', e.target.value)}
            disabled={disabled}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            placeholder="ระบุพื้นที่ปฏิบัติงาน"
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            หมวดหมู่งาน <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={assessmentInfo.category}
            onChange={(e) => onAssessmentInfoChange('category', e.target.value)}
            disabled={disabled}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            placeholder="ระบุหมวดหมู่งาน"
            required
          />
        </div>
      </div>
    </div>

    {/* ข้อมูลผู้รับการตรวจ (Auditee) */}
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="flex items-center mb-3 text-base font-medium text-gray-900">
        <Users className="w-4 h-4 mr-2 text-green-600" />
        ข้อมูลผู้รับการตรวจ (Auditee)
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            ชื่อผู้รับตรวจ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={auditee.name}
            onChange={(e) => onAuditeeChange({ ...auditee, name: e.target.value })}
            disabled={disabled}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            placeholder="ระบุชื่อผู้รับการตรวจ"
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            อีเมล
          </label>
          <input
            type="email"
            value={auditee.email}
            onChange={(e) => onAuditeeChange({ ...auditee, email: e.target.value })}
            disabled={disabled}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            placeholder="ระบุอีเมลผู้รับการตรวจ"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            ตำแหน่ง
          </label>
          <input
            type="text"
            value={auditee.position || ''}
            onChange={(e) => onAuditeeChange({ ...auditee, position: e.target.value })}
            disabled={disabled}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            placeholder="ระบุตำแหน่งงาน"
          />
        </div>
      </div>
    </div>

    {/* ข้อมูลผู้ตรวจประเมิน (Auditor) */}
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="flex items-center mb-3 text-base font-medium text-gray-900">
        <Shield className="w-4 h-4 mr-2 text-blue-600" />
        ข้อมูลผู้ตรวจประเมิน (Auditor)
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            ชื่อผู้ตรวจ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={auditor.name}
            onChange={(e) => onAuditorChange({ ...auditor, name: e.target.value })}
            disabled={disabled}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            placeholder="ระบุชื่อผู้ตรวจประเมิน"
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            อีเมล
          </label>
          <input
            type="email"
            value={auditor.email}
            onChange={(e) => onAuditorChange({ ...auditor, email: e.target.value })}
            disabled={disabled}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            placeholder="ระบุอีเมลผู้ตรวจประเมิน"
          />
        </div>
      </div>
    </div>
  </div>
);

// ========================================
// MAIN COMPONENT
// ========================================
const CSMEvaluatePage: React.FC = () => {
  const { vdCode } = useParams<{ vdCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<CSMAssessmentAnswer[]>([]);
  const [confirmations, setConfirmations] = useState<Record<string, boolean>>({});
  const [questionFiles, setQuestionFiles] = useState<Record<string, FileAttachment[]>>({});
  const [auditor, setAuditor] = useState<CSMAuditor>({
    name: user?.displayName || '',
    email: user?.email || ''
  });
  const [auditee, setAuditee] = useState<CSMAuditee>({
    name: '',
    email: '',
    position: ''
  });
  const [assessmentInfo, setAssessmentInfo] = useState({
    riskLevel: '',
    workingArea: '',
    category: ''
  });
  
  const finalVdCode = vdCode || searchParams.get('vdCode');

  // Permission Check
  const hasPermission = useMemo(() => {
    if (!user?.roles) {
      //console.log('❌ No user roles found');
      return false;
    }
    
    const allowedRoles = ['superAdmin', 'csmAuditor', 'auditor'];
    let userRoles: string[] = [];
    
    if (Array.isArray(user.roles)) {
      userRoles = user.roles;
    } else if (typeof user.roles === 'string') {
      const rolesString = user.roles as string;
      userRoles = rolesString.split(',').map((r: string) => r.trim()).filter((r: string) => r.length > 0);
    }
    
    const hasAccess = userRoles.some((role: string) => allowedRoles.includes(role));
    /*
    console.log('🔐 Permission check:', {
      userRoles: user.roles,
      parsedRoles: userRoles,
      allowedRoles,
      hasAccess
    });*/
    
    return hasAccess;
  }, [user?.roles]);

    // Data Fetching
  const { data: vendor, isLoading: vendorLoading, error: vendorError } = useQuery({
    queryKey: ['csm-vendor', finalVdCode],
    queryFn: async () => {
      if (!finalVdCode) return null;
      //console.log('🔍 Loading vendor:', finalVdCode);
      const result = await enhancedCSMService.vendors.getByVdCode(finalVdCode);
      //console.log('👥 Vendor result:', result);
      return result;
    },
    enabled: !!finalVdCode,
  });
  
  const { data: form, isLoading: formLoading, error: formError } = useQuery({
    queryKey: ['csm-form', 'CSMChecklist'],
    queryFn: async () => {
      //console.log('🔍 Loading CSM form...');
      const result = await enhancedCSMService.forms.getCSMChecklist();
      /*console.log('📋 Form result:', {
        found: !!result,
        title: result?.formTitle,
        fieldsCount: result?.fields?.length || 0
      });*/
      return result;
    },
    retry: 2,
    staleTime: 30000
  });

  const { data: existingAssessment, refetch: refetchAssessment } = useQuery({
    queryKey: ['csm-assessment', finalVdCode],
    queryFn: async () => {
      if (!finalVdCode) return null;
      //console.log('🔍 Loading existing assessment:', finalVdCode);
      const assessments = await enhancedCSMService.assessments.getByVdCode(finalVdCode);
      const existing = assessments.find(a => a.id && !a.isFinish) || null;
      //console.log('📊 Existing assessment:', !!existing, existing?.id);
      return existing;
    },
    enabled: !!finalVdCode,
  });

  // Progress Calculation
  const progress = useMemo((): QuestionProgress => {
    const completed = Object.values(confirmations).filter(Boolean).length;
    const total = form?.fields?.length || 0;
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [confirmations, form?.fields?.length]);

  // ========================================
  // DATA PERSISTENCE - FIXED AUTO-SAVE
  // ========================================
  
  // Create assessment save function - FIXED ID generation
const createAssessmentData = useCallback((overrides: Partial<CSMAssessment> = {}): Partial<CSMAssessment> => {
  if (!vendor || !form) {
    throw new Error('Missing vendor or form data');
  }

  const currentStatus = calculateAssessmentStatus(answers, confirmations, form.fields.length);
  const currentProgress = calculateProgress(answers, confirmations, form.fields.length);
  
  // Enhanced file handling in answers
  answers.map((answer, index) => {
    const questionFilesForIndex = questionFiles[index] || [];
    const fileData = questionFilesForIndex.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.url,
      base64: file.base64,
      compressionRatio: file.compressionRatio,
      originalSize: file.originalSize
    }));

    return {
      ...answer,
      isFinish: confirmations[index] || false,
      files: fileData // Enhanced file format
    };
  });
  
  return {
    companyId: vendor.companyId,
    vdCode: vendor.vdCode,
    vdName: vendor.vdName,
    docReference: vendor.vdCode,
    formCode: form.formCode || 'CSMChecklist',
    formVersion: '1.0',
    vdWorkingArea: assessmentInfo.workingArea || (Array.isArray(vendor.workingArea) ? vendor.workingArea.join(', ') : vendor.workingArea || ''),
    vdCategory: assessmentInfo.category || vendor.category,
    riskLevel: assessmentInfo.riskLevel,
    auditor,
    auditee,
    status: currentStatus,
    progress: currentProgress,
    lastModified: new Date(),
    isActive: true,
    isFinish: currentStatus === 'completed',
    updatedAt: new Date(),
    ...overrides
  };
}, [vendor, form, answers, confirmations, auditor, auditee, assessmentInfo, questionFiles]);

  // Auto-save functionality
  const autoSaveResult = useDebouncedAutoSave(
    { 
      answers, 
      auditor, 
      auditee, 
      assessmentInfo,
      confirmations
    },
    async (data) => {
      try {
        if (!vendor || !form) {
          //console.log('❌ Cannot auto-save: missing vendor or form');
          return;
        }

        // Only auto-save if there are meaningful changes
        const hasChanges = data.answers.some(a => a.score || a.comment || a.action) || 
                          data.auditor.name || 
                          data.auditee.name ||
                          Object.keys(data.confirmations).length > 0;
        
        if (!hasChanges) {
          //console.log('⚠️ Skipping auto-save: no meaningful changes');
          return;
        }

        // Validate required fields before saving
        if (!validateRequiredFields(data.auditor, data.auditee, data.assessmentInfo)) {
          //console.log('⚠️ Skipping auto-save: missing required fields');
          return;
        }
        
        /*
        console.log('💾 Auto-saving assessment data...', {
          answersCount: data.answers.length,
          auditorName: data.auditor.name,
          auditeeName: data.auditee.name,
          confirmationsCount: Object.keys(data.confirmations).length
        });*/
        
        const assessmentToSave = createAssessmentData();        
        //let savedAssessment;

    if (existingAssessment?.id) {
      try {
        // 🔧 เพิ่มการตรวจสอบ document ใน auto-save ด้วย
        const docRef = doc(db, 'csmAssessments', existingAssessment.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          await enhancedCSMService.assessments.update(existingAssessment.id, assessmentToSave);
        } else {
          // Document ไม่มี -> สร้างใหม่
          assessmentToSave.createdAt = new Date();
          await enhancedCSMService.assessments.create(assessmentToSave as Omit<CSMAssessment, 'id'>);
        }
      } catch (error) {
        // 🔧 Fallback สำหรับ auto-save
        console.warn('⚠️ Auto-save update failed, creating new:', error);
        assessmentToSave.createdAt = new Date();
        await enhancedCSMService.assessments.create(assessmentToSave as Omit<CSMAssessment, 'id'>);
      }
    }
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['csm-assessment', finalVdCode] });
        
        //console.log('💾 Auto-save completed successfully');
        
      } catch (error) {
        console.error('❌ Auto-save error:', error);
        addToast({
          type: 'warning',
          title: 'ไม่สามารถบันทึกอัตโนมัติได้',
          message: 'กรุณาบันทึกด้วยตนเอง',
          duration: 5000
        });
      }
    },
    { 
      delay: 45000  // Auto-save every 45 seconds to reduce conflicts
    }
  );

  // Manual Save Mutation - FIXED
  const saveAssessmentMutation = useMutation({
    mutationFn: async (data?: Partial<CSMAssessment>) => {
      if (!vendor || !form) {
        throw new Error('ข้อมูลไม่ครบถ้วน');
      }

      if (!validateRequiredFields(auditor, auditee, assessmentInfo)) {
        throw new Error('กรุณากรอกข้อมูลผู้ตรวจ ผู้รับตรวจ และข้อมูลการประเมินให้ครบถ้วน');
      }
      
      const assessmentToSave = createAssessmentData(data);
      
      /*
      console.log('💾 Manual saving assessment data...', {
        answersCount: assessmentToSave.answers?.length || 0,
        auditorName: assessmentToSave.auditor?.name,
        auditeeName: assessmentToSave.auditee?.name,
        status: assessmentToSave.status,
        riskLevel: assessmentToSave.riskLevel,
        existingId: existingAssessment?.id
      });*/
      
    if (existingAssessment?.id) {
      try {
        // 🔧 เพิ่มการตรวจสอบว่า document มีอยู่จริงหรือไม่
        const docRef = doc(db, 'csmAssessments', existingAssessment.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          // Document มีอยู่ -> update
          await enhancedCSMService.assessments.update(existingAssessment.id, assessmentToSave);
          return existingAssessment.id;
        } else {
          // Document ไม่มี -> สร้างใหม่
          //console.log('⚠️ Existing assessment document not found, creating new one');
          assessmentToSave.createdAt = new Date();
          const newId = await enhancedCSMService.assessments.create(assessmentToSave as Omit<CSMAssessment, 'id'>);
          return newId;
        }
      } catch (error) {
        // 🔧 Fallback mechanism
        console.error('❌ Error checking/updating document:', error);
        //console.log('🔄 Fallback: Creating new assessment');
        assessmentToSave.createdAt = new Date();
        const newId = await enhancedCSMService.assessments.create(assessmentToSave as Omit<CSMAssessment, 'id'>);
        return newId;
      }
    }
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'บันทึกสำเร็จ',
        message: 'ข้อมูลการประเมินได้รับการบันทึกแล้ว'
      });
      queryClient.invalidateQueries({ queryKey: ['csm-assessment', finalVdCode] });
      queryClient.invalidateQueries({ queryKey: ['csm-current-assessments'] });
      refetchAssessment();
    },
    onError: (error) => {
      console.error('❌ Manual save error:', error);
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: error instanceof Error ? error.message : 'ไม่สามารถบันทึกข้อมูลได้'
      });
    }
  });

  // Submit Assessment Mutation - FIXED to use updateWithSummary only on submit
  const submitAssessmentMutation = useMutation({
    mutationFn: async () => {
      if (!existingAssessment?.id) {
        // Save first if no existing assessment        
        const newId = await saveAssessmentMutation.mutateAsync(undefined);
        // Then update with summary
        if (!newId) {
          throw new Error('Failed to create assessment');
        }        
        return await enhancedCSMService.assessments.updateWithSummary(newId, {
          status: 'submitted',
          isFinish: true,
          finishedAt: new Date(),
          submittedAt: new Date()
        });
      } else {
        // Use updateWithSummary for final submission
        return await enhancedCSMService.assessments.updateWithSummary(existingAssessment.id, {
          status: 'submitted',
          isFinish: true,
          finishedAt: new Date(),
          submittedAt: new Date()
        });
      }
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: '✅ ส่งผลประเมินสำเร็จ',
        message: 'การประเมินได้รับการบันทึกและส่งเรียบร้อยแล้ว สรุปผลการประเมินได้ถูกสร้างขึ้นแล้ว'
      });
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['csm-assessment', finalVdCode] });
      queryClient.invalidateQueries({ queryKey: ['csm-current-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['csm-assessment-summaries'] });
      queryClient.invalidateQueries({ queryKey: ['csm-vendors'] });
      
      navigate('/csm');
    },
    onError: (error) => {
      console.error('Error submitting assessment:', error);
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถส่งผลประเมินได้'
      });
    }
  });

  // Event Handlers
  const handleAnswerChange = useCallback((index: number, changes: Partial<CSMAssessmentAnswer>) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      if (newAnswers[index]) {
        newAnswers[index] = { ...newAnswers[index], ...changes };
        //console.log('📝 Answer changed:', index, changes);
      }
      return newAnswers;
    });
  }, []);

  const handleConfirmChange = useCallback((index: number, confirmed: boolean) => {
    setConfirmations(prev => ({
      ...prev,
      [index]: confirmed
    }));
    //console.log('✅ Confirmation changed:', index, confirmed);
  }, []);

  const handleScoreChange = useCallback((index: number, score: Score) => {
    //console.log('🎯 Score changed:', index, score);
    handleAnswerChange(index, { 
      score,
      tScore: score === 'n/a' ? '0' : score 
    });
  }, [handleAnswerChange]);


const handleFileChange = useCallback((index: number, files: QuestionFileAttachment[]) => {
  setQuestionFiles(prev => ({
    ...prev,
    [index]: files
  }));
  
  const fileNames = files.map(f => f.name);  
  handleAnswerChange(index, { files: fileNames });
  //console.log('📎 Files attached to question', index, ':', files.length);
}, [handleAnswerChange]);

  const handleQuestionSelect = useCallback((index: number) => {
    setSelectedQuestionIndex(index);
  }, []);

  const handleNext = useCallback(() => {
    if (form && selectedQuestionIndex < form.fields.length - 1) {
      setSelectedQuestionIndex(prev => prev + 1);
    }
  }, [selectedQuestionIndex, form]);

  const handlePrev = useCallback(() => {
    if (selectedQuestionIndex > 0) {
      setSelectedQuestionIndex(prev => prev - 1);
    }
  }, [selectedQuestionIndex]);

  const handleManualSave = useCallback(() => {
    saveAssessmentMutation.mutate(undefined);
  }, [saveAssessmentMutation]);

  const handleSubmitAssessment = useCallback(() => {
    submitAssessmentMutation.mutate();
  }, [submitAssessmentMutation]);

  // Handle assessment info changes
  const handleAssessmentInfoChange = useCallback((field: string, value: string) => {
    setAssessmentInfo(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

   const fileUploadOptions: UseFileUploadOptionsFixed = {
    disabled: undefined, // Fixed: explicit undefined instead of boolean | undefined
    label: 'อัปโหลดไฟล์เอกสาร',
    description: 'รองรับไฟล์ PDF, DOC, DOCX, JPG, PNG',
    className: 'mb-4',
    showPreview: true,
    showCompressionInfo: true,
    acceptedFileTypes: '.pdf,.doc,.docx,.jpg,.jpeg,.png',
    maxFiles: 10,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    imageOptions: {
      maxSizeMB: 2,
      maxWidthOrHeight: 1920,
      quality: 0.8,
      fileType: 'image/jpeg'
    },
    pdfMinSize: 100 * 1024, // 100KB
    imageMinSize: 50 * 1024  // 50KB
  }

  // Fixed: Handle file upload results
  const handleFileUpload = useCallback((uploadedFiles: readonly File[]): void => {
    const newFiles: FileAttachmentFixed[] = uploadedFiles.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file), // Fixed: provide actual URL
      base64: undefined,
      status: 'uploaded',
      compressionRatio: 1
    }))

    setFiles(prev => [...prev, ...newFiles])
  }, []);

  // Fixed: Current question handling with null checks
  const currentQuestion = questions[currentQuestionIndex]
  
  const renderQuestionContent = (): React.ReactNode => {
    if (!currentQuestion) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">ไม่พบคำถาม</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Fixed: Safe property access */}
        <h2 className="text-xl font-semibold">{currentQuestion.text}</h2>
        <p className="text-gray-600">{currentQuestion.description}</p>
        
        {/* Fixed: Safe property access for type */}
        {currentQuestion.type === 'file_upload' && (
          <div>
            <UniversalFileUpload
              options={fileUploadOptions}
              onFilesSelected={handleFileUpload}
            />
          </div>
        )}

        {/* Fixed: Safe property access for attachments */}
        {currentQuestion.attachments && currentQuestion.attachments.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">ไฟล์แนบ:</h3>
            {currentQuestion.attachments.map((attachment, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <FileText className="w-4 h-4" />
                <span className="text-sm">{attachment.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Fixed: Return statement for render function
  const getQuestionScore = (questionId: string): number => {
    const answer = answers.find(a => a.questionId === questionId)
    if (!answer) return 0
    
    switch (answer.type) {
      case 'score':
        return typeof answer.value === 'number' ? answer.value : 0
      case 'boolean':
        return answer.value === true ? 100 : 0
      case 'multiple_choice':
        // Logic for multiple choice scoring
        return 75 // Example score
      default:
        return 0
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {renderQuestionContent()}
        </div>
      </div>
    </div>
  )
}  

  // ========================================
  // DATA LOADING EFFECTS
  // ========================================
  
  // Initialize answers when form loads
  useEffect(() => {
    if (form?.fields && answers.length === 0) {
      //console.log('🔄 Initializing answers for', form.fields.length, 'questions');
      
      const initialAnswers: CSMAssessmentAnswer[] = form.fields.map(field => ({
        ckItem: field.ckItem,
        ckType: field.ckType || '',
        ckQuestion: field.ckQuestion || '',
        comment: '',
        score: '',
        tScore: '0',
        action: '',
        files: [],
        isFinish: false
      }));
      
      setAnswers(initialAnswers);
    }
  }, [form?.fields, answers.length]);

  // Load existing assessment data
  useEffect(() => {
    
    if (existingAssessment && form?.fields && !answers.length) {
      /*
      console.log('♻️ Loading existing assessment data...', {
        id: existingAssessment.id,
        status: existingAssessment.status,
        answersCount: existingAssessment.answers?.length || 0
      });*/
      
      // Load Auditor Data
      if (existingAssessment.auditor) {
        //console.log('📝 Loading auditor:', existingAssessment.auditor.name);
        setAuditor(existingAssessment.auditor);
      }
      
      // Load Auditee Data
      if (existingAssessment.auditee) {
        //console.log('👥 Loading auditee:', existingAssessment.auditee.name);
        setAuditee(existingAssessment.auditee);
      }
      
      // Load Assessment Info
      setAssessmentInfo(prev => ({
        riskLevel: existingAssessment.riskLevel || prev.riskLevel,
        workingArea: existingAssessment.vdWorkingArea || prev.workingArea,
        category: existingAssessment.vdCategory || prev.category
      }));
      
      // Load Answers and Confirmations
      if (existingAssessment.answers && existingAssessment.answers.length > 0) {
        //console.log('📋 Loading answers:', existingAssessment.answers.length);
        
        const loadedAnswers = [...existingAssessment.answers];
        const loadedConfirmations: Record<string, boolean> = {};
        
        // Map confirmations from answers
        existingAssessment.answers.forEach((answer, index) => {
          if (answer.isFinish) {
            loadedConfirmations[index] = true;
          }
        });
        
        //console.log('✅ Setting answers:', loadedAnswers.length);
        //console.log('✅ Setting confirmations:', Object.keys(loadedConfirmations).length);
        
        setAnswers(loadedAnswers);
        setConfirmations(loadedConfirmations);
        
        // Show recovery message
        if (existingAssessment.status === 'in-progress') {
          const confirmedCount = Object.keys(loadedConfirmations).length;
          const totalCount = form.fields.length;
          addToast({
            type: 'info',
            title: '📂 กู้คืนข้อมูลการประเมิน',
            message: `พบข้อมูลการประเมินที่ยังไม่เสร็จ (${confirmedCount}/${totalCount} ข้อ)`,
            duration: 5000
          });
        }
      }
    }
  }, [existingAssessment, form, answers, addToast]);

  // Initialize assessment info from vendor
  useEffect(() => {
    if (vendor && !assessmentInfo.workingArea && !assessmentInfo.category) {
      setAssessmentInfo(prev => ({
        ...prev,
        workingArea: Array.isArray(vendor.workingArea) ? vendor.workingArea.join(', ') : vendor.workingArea || '',
        category: vendor.category || ''
      }));
    }
  }, [vendor, assessmentInfo]);

  // Error handling
  useEffect(() => {
    if (vendorError) {
      console.error('❌ Vendor loading error:', vendorError);
      addToast({
        type: 'error',
        title: 'ไม่สามารถโหลดข้อมูลผู้รับเหมาได้',
        message: 'กรุณาตรวจสอบรหัสและลองใหม่อีกครั้ง'
      });
    }
    
    if (formError) {
      console.error('❌ Form loading error:', formError);
      addToast({
        type: 'error',
        title: 'ไม่สามารถโหลดแบบฟอร์มได้',
        message: 'กรุณาลองใหม่อีกครั้ง'
      });
    }
  }, [vendorError, formError, addToast]);

  // Browser close warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedChanges = 
        answers.some(a => a.score && a.score !== '') || 
        auditor.name !== '' || 
        auditee.name !== '' ||
        Object.keys(confirmations).length > 0;
      
      if (hasUnsavedChanges && !autoSaveResult.isSaving && !saveAssessmentMutation.isPending) {
        e.preventDefault();
        e.returnValue = 'คุณมีข้อมูลการประเมินที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [answers, auditor.name, auditee.name, confirmations, autoSaveResult.isSaving, saveAssessmentMutation.isPending]);

// Add this useEffect to handle existing file loading:
useEffect(() => {
  if (existingAssessment?.answers && form?.fields) {
    const loadedFiles: Record<string, QuestionFileAttachment[]> = {};
    
    existingAssessment.answers.forEach((answer, index) => {
      if (answer.files && Array.isArray(answer.files)) {
        // Handle both old string array format and new object format
        const files: QuestionFileAttachment[] = answer.files
          .map((file: unknown, fileIndex: number) => {
            if (typeof file === 'string') {
              // Old format - just filename
              return {
                id: `existing-${index}-${fileIndex}`,
                name: file,
                size: 0,
                type: 'application/octet-stream',
                url: undefined,
                base64: undefined
              };
            } else if (file && typeof file === 'object') {
              // New format - full file object with proper type checking
              const fileObj = file as Record<string, unknown>;
              return {
                id: typeof fileObj.id === 'string' ? fileObj.id : `existing-${index}-${fileIndex}`,
                name: typeof fileObj.name === 'string' ? fileObj.name : 'Unknown file',
                size: typeof fileObj.size === 'number' ? fileObj.size : 0,
                type: typeof fileObj.type === 'string' ? fileObj.type : 'application/octet-stream',
                url: typeof fileObj.url === 'string' ? fileObj.url : undefined,
                base64: typeof fileObj.base64 === 'string' ? fileObj.base64 : undefined,
                compressionRatio: typeof fileObj.compressionRatio === 'number' ? fileObj.compressionRatio : undefined,
                originalSize: typeof fileObj.originalSize === 'number' ? fileObj.originalSize : undefined
              };
            } else {
              // Fallback for unexpected format
              return {
                id: `existing-${index}-${fileIndex}`,
                name: 'Unknown file',
                size: 0,
                type: 'application/octet-stream',
                url: undefined,
                base64: undefined
              };
            }
          })
          .filter((file): file is QuestionFileAttachment => 
            // Type guard to ensure all files are valid QuestionFileAttachment
            typeof file.id === 'string' && 
            typeof file.name === 'string' &&
            typeof file.size === 'number' &&
            typeof file.type === 'string'
          );
        
        if (files.length > 0) {
          loadedFiles[index] = files;
        }
      }
    });
    
    if (Object.keys(loadedFiles).length > 0) {
      //console.log('📎 Loading existing files for questions:', Object.keys(loadedFiles));
      setQuestionFiles(loadedFiles);
    }
  }
}, [existingAssessment, form]);


  // ========================================
  // RENDER CONDITIONS
  // ========================================
  
  if (!finalVdCode) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900">ไม่พบรหัสผู้รับเหมา</h3>
          <p className="text-gray-500">กรุณาตรวจสอบ URL และลองใหม่อีกครั้ง</p>
        </div>
      </div>
    );
  }
  
  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900">ไม่มีสิทธิ์เข้าถึง</h3>
          <p className="text-gray-500">คุณไม่มีสิทธิ์ในการประเมิน CSM</p>
          <div className="mt-2 text-xs text-gray-400">
            ต้องการสิทธิ์: csmAuditor, auditor, หรือ superAdmin
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Current roles: {typeof user?.roles === 'string' ? user.roles : JSON.stringify(user?.roles)}
          </div>
        </div>
      </div>
    );
  }
  
  if (vendorLoading || formLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">
            {vendorLoading ? 'กำลังโหลดข้อมูลผู้รับเหมา...' : 'กำลังโหลดแบบฟอร์ม...'}
          </p>
          {autoSaveResult.isSaving && (
            <p className="mt-2 text-xs text-blue-600">
              💾 กำลังบันทึกอัตโนมัติ...
            </p>
          )}
        </div>
      </div>
    );
  }
  
  if (!vendor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">ไม่พบข้อมูลผู้รับเหมา</h3>
          <p className="text-gray-500">รหัส: {finalVdCode}</p>
        </div>
      </div>
    );
  }
  
  if (!form || !form.fields || form.fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">ไม่พบแบบฟอร์มการประเมิน</h3>
          <p className="text-gray-500">ไม่สามารถโหลด CSMChecklist ได้</p>
          <div className="mt-2 text-xs text-gray-400">
            กรุณาตรวจสอบว่ามีแบบฟอร์มใน collection 'forms' หรือไม่
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = form.fields[selectedQuestionIndex];
  const currentAnswer = answers[selectedQuestionIndex];
  const isCurrentConfirmed = confirmations[selectedQuestionIndex] || false;
  const currentStatus = calculateAssessmentStatus(answers, confirmations, form.fields.length);
  const currentProgress = calculateProgress(answers, confirmations, form.fields.length);
  const hasCurrentScore = !!(currentAnswer?.score && currentAnswer.score !== '');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="p-4 mx-auto max-w-7xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/csm')}
                className="inline-flex items-center text-gray-600 transition-colors hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                กลับ
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  ประเมิน CSM: {vendor.vdName}
                </h1>
                <div className="flex items-center mt-1 space-x-4 text-sm text-gray-600">
                  <span>รหัส: {vendor.vdCode}</span>
                  <span>•</span>
                  <span>หมวดหมู่: {vendor.category}</span>
                </div>
              </div>
            </div>
            
            {/* Status and Save Controls */}
            <div className="flex items-center space-x-4">
              <AssessmentStatusBadge 
                status={currentStatus}
                progress={currentProgress}
              />
              
              <button
                onClick={handleManualSave}
                disabled={saveAssessmentMutation.isPending || autoSaveResult.isSaving}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveAssessmentMutation.isPending || autoSaveResult.isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              
              {/* Auto-save Status */}
              {autoSaveResult.isSaving ? (
                <div className="flex items-center text-sm text-blue-600">
                  <div className="w-3 h-3 mr-2 border-2 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  <span>กำลังบันทึก...</span>
                </div>
              ) : autoSaveResult.lastSaved ? (
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>บันทึกล่าสุด: {autoSaveResult.lastSaved.toLocaleTimeString('th-TH')}</span>
                </div>
              ) : null}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">ความคืบหน้า</span>
              <span className="text-sm text-gray-500">
                {progress.completed}/{progress.total} ข้อ ({progress.percentage}%)
              </span>
            </div>
            <ProgressBar progress={progress} />
          </div>

          {/* Validation Warnings */}
          {!validateRequiredFields(auditor, auditee, assessmentInfo) && (
            <div className="p-3 mb-4 border border-yellow-200 rounded-lg bg-yellow-50">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">ข้อมูลไม่ครบถ้วน</p>
                  <p className="text-xs text-yellow-700">กรุณากรอกข้อมูลผู้ตรวจ ผู้รับตรวจ และข้อมูลการประเมินให้ครบถ้วน</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 mx-auto max-w-7xl">
        {/* Info Forms Section - FIXED Layout */}
        <InfoFormsSection
          auditor={auditor}
          auditee={auditee}
          assessmentInfo={assessmentInfo}
          onAuditorChange={setAuditor}
          onAuditeeChange={setAuditee}
          onAssessmentInfoChange={handleAssessmentInfoChange}
          disabled={currentStatus === 'submitted'}
        />
        
        <FileAttachmentSummary 
          questionFiles={questionFiles} 
          totalQuestions={form.fields.length} 
        />             

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky p-4 bg-white rounded-lg shadow-sm top-6">
              <h3 className="mb-4 text-lg font-medium text-gray-900">รายการคำถาม</h3>
              <div className="space-y-2 overflow-y-auto max-h-96">
                {form.fields.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionSelect(index)}
                    className={`
                      w-full text-left p-3 rounded-lg border transition-all duration-200
                      ${selectedQuestionIndex === index
                        ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        ข้อ {question.ckItem}
                      </span>
                      <div className="flex items-center space-x-1">
                        {question.ckType === 'M' && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-800 rounded">
                            M
                          </span>
                        )}
                        {answers[index]?.score && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 rounded">
                            {answers[index].score}
                          </span>
                        )}
                        {confirmations[index] && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {question.ckQuestion}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <div className="p-6 bg-white rounded-lg shadow-sm">
              
              {/* Question Header */}
              <div className="pb-6 mb-6 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    ข้อ {selectedQuestionIndex + 1}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-medium
                      ${currentQuestion.ckType === 'M' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'} 
                    `}>
                      {currentQuestion.ckType === 'M' ? 'ข้อบังคับ [M]' : 'ข้อทั่วไป [P]'}
                    </span>
                    {hasCurrentScore && (
                      <span className="px-3 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                        คะแนน: {currentAnswer.score}
                      </span>
                    )}
                  </div>
                </div>
                
                {currentQuestion.ckQuestion && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-xl font-medium text-gray-800">Q: {currentQuestion.ckQuestion} ?</h3>
                  </div>
                )}
                
                {currentQuestion.ckRequirement && (
                  <div className="p-4 rounded-lg bg-blue-50">
                    <h4 className="mb-2 text-sm font-medium text-blue-900"><u>เกณฑ์การประเมิน:</u></h4>
                    <p className="text-sm leading-relaxed text-blue-800">
                      {currentQuestion.ckRequirement}
                    </p>
                  </div>
                )}
              </div>

              {/* Question Content */}
              {currentAnswer && (
                <div className="space-y-6">
                  {/* Score Selection */}
                  <ScoreSelector
                    value={currentAnswer.score || ''}
                    onChange={(score: Score) => handleScoreChange(selectedQuestionIndex, score)}
                    disabled={isCurrentConfirmed || currentStatus === 'submitted'}
                    allowNA={currentQuestion.ckType !== 'M'}
                    questionType={currentQuestion.ckType}
                  />

                  {/* Comment Section */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      หมายเหตุ / ข้อสังเกต
                    </label>
                    <textarea
                      value={currentAnswer.comment || ''}
                      onChange={(e) => handleAnswerChange(selectedQuestionIndex, { 
                        comment: e.target.value 
                      })}
                      placeholder="บันทึกข้อสังเกต หรือหมายเหตุเพิ่มเติม..."
                      rows={3}
                      disabled={isCurrentConfirmed || currentStatus === 'submitted'}
                      className="w-full p-3 transition-colors border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  {/* Action Section */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      การปฏิบัติที่แนะนำ-ข้อเสนอแนะเพื่อปรับปรุง (ถ้ามี)
                    </label>
                    <textarea
                      value={currentAnswer.action || ''}
                      onChange={(e) => handleAnswerChange(selectedQuestionIndex, { 
                        action: e.target.value 
                      })}
                      placeholder="ข้อแนะนำสำหรับการปรับปรุง..."
                      rows={1}
                      disabled={isCurrentConfirmed || currentStatus === 'submitted'}
                      className="w-full p-3 transition-colors border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  {/* File Upload Section */}
                  <QuestionFileUpload
                    files={questionFiles[selectedQuestionIndex] || []}
                    onChange={(files) => handleFileChange(selectedQuestionIndex, files)}
                    disabled={isCurrentConfirmed || currentStatus === 'submitted'}
                    questionIndex={selectedQuestionIndex}
                  />
             

                  {/* Confirmation Button */}
                  {currentStatus !== 'submitted' && (
                    <QuestionConfirmButton
                      isConfirmed={isCurrentConfirmed}
                      onConfirm={(confirmed: boolean) => handleConfirmChange(selectedQuestionIndex, confirmed)}
                      hasScore={hasCurrentScore}
                    />
                  )}
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-6 mt-8 border-t">
                <button
                  onClick={handlePrev} 
                  disabled={selectedQuestionIndex === 0}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  ข้อก่อนหน้า
                </button>
                
                <div className="px-3 py-1 text-sm text-gray-500 rounded-full bg-gray-50">
                  ข้อ {selectedQuestionIndex + 1} จาก {form.fields.length}
                </div>
                
                <button
                  onClick={handleNext}
                  disabled={selectedQuestionIndex >= form.fields.length - 1}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ข้อถัดไป
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>

              {/* Submit Section */}
              {currentProgress.percentage === 100 && currentStatus !== 'submitted' && (
                <div className="p-6 mt-8 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="mb-2 text-lg font-semibold text-green-900">
                        🎉 การประเมินเสร็จสมบูรณ์!
                      </h3>
                      <p className="mb-1 text-sm text-green-800">
                        คุณได้ประเมินครบทุกข้อแล้ว ({progress.completed}/{progress.total} ข้อ)
                      </p>
                      <p className="text-xs text-green-700">
                        พร้อมส่งผลการประเมินเพื่อขออนุมัติ
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={handleSubmitAssessment}
                        disabled={submitAssessmentMutation.isPending || !validateRequiredFields(auditor, auditee, assessmentInfo)}
                        className="inline-flex items-center px-6 py-3 font-medium text-white transition-colors bg-green-600 rounded-lg shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-5 h-5 mr-2" />
                        {submitAssessmentMutation.isPending ? 'กำลังส่ง...' : 'ส่งผลประเมิน'}
                      </button>
                      {!validateRequiredFields(auditor, auditee, assessmentInfo) && (
                        <p className="text-xs text-center text-red-600">
                          กรุณากรอกข้อมูลให้ครบถ้วน
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Summary */}
              {currentProgress.percentage < 100 && (
                <div className="p-4 mt-8 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">สถานะการประเมิน</h4>
                      <p className="text-xs text-blue-800">
                        ยังเหลืออีก {progress.total - progress.completed} ข้อที่ต้องประเมิน
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-900">{progress.percentage}%</div>
                      <div className="text-xs text-blue-700">เสร็จแล้ว</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Debug Panel (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed max-w-sm p-3 border border-yellow-200 rounded-lg shadow-lg bottom-4 right-4 bg-yellow-50">
          <details>
            <summary className="mb-2 text-sm font-medium text-yellow-800 cursor-pointer">
              🐛 Debug Info
            </summary>
            <div className="space-y-1 text-xs text-yellow-700">
              <div>📊 Total Answers: {answers.length}</div>
              <div>✅ Confirmed: {Object.values(confirmations).filter(Boolean).length}</div>
              <div>🎯 Current Score: {currentAnswer?.score || 'None'}</div>
              <div>👤 Auditor: {auditor.name || 'Not set'}</div>
              <div>👥 Auditee: {auditee.name || 'Not set'}</div>
              <div>⚠️ Risk: {assessmentInfo.riskLevel || 'Not set'}</div>
              <div>💾 Auto-save: {autoSaveResult.isSaving ? 'Saving...' : 'Idle'}</div>
              <div>🕐 Last saved: {autoSaveResult.lastSaved?.toLocaleTimeString('th-TH') || 'Never'}</div>
              <div>🆔 Assessment ID: {existingAssessment?.id || 'New'}</div>
              <div>📋 Status: {currentStatus}</div>
              <div>✅ Valid Fields: {validateRequiredFields(auditor, auditee, assessmentInfo) ? 'Yes' : 'No'}</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}; 

export default CSMEvaluatePage;