// 📁 src/features/csm/pages/CSMEvaluatePage.tsx
// Updated to use CSMVendor instead of Company collection
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Send, AlertCircle, CheckCircle, 
  Building2, Calendar, User, FileText, MapPin 
} from 'lucide-react';
import type { CSMVendor, Company, CSMAssessment, CSMFormDoc, CSMAssessmentAnswer, 
  CSMAuditee, CSMFormField} from '../../../types';
import {  getCategoryInfo} from '../../../types';

import { csmVendorService } from '../../../services/csmVendorService';
import csmService from '../../../services/csmService';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/ToastContainer';
import { SkeletonLoader } from '../../../components/ui/SkeletonLoader';
import QuestionForm from '../components/QuestionForm';


interface CSMEvaluatePageProps {
  vdCode?: string;
}
// Helper function to format date safely

const CSMEvaluatePage: React.FC<CSMEvaluatePageProps> = ({ vdCode: propVdCode }) => {
  const { vdCode: paramVdCode } = useParams<{ vdCode: string }>();
  const navigate = useNavigate();
  const vdCode = propVdCode || paramVdCode;
  
  // Updated to use CSMVendor instead of Company
  const [vendor, setVendor] = useState<CSMVendor | null>(null);
  const [company, setCompany] = useState<Company | null>(null); // Still need company for additional details
  const [assessment, setAssessment] = useState<CSMAssessment | null>(null);
  const [form, setForm] = useState<CSMFormDoc | null>(null);
  const [answers, setAnswers] = useState<CSMAssessmentAnswer[]>([]);
  const [auditor, setAuditor] = useState<CSMAuditee>({
    name: '',
    email: '',
    phone: '',
    position: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  
  const { toasts, addToast, removeToast } = useToast();

  // Load vendor, company, and assessment data
  const loadData = useCallback(async () => {
    if (!vdCode) {
      addToast({
        type: 'error',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'ไม่พบรหัส vendor'
      });
      return;
    }

    try {
      setLoading(true);

      // Get vendor with company information using the new service
      const vendorWithCompany = await csmVendorService.getVendorWithCompany(vdCode);
      
      if (!vendorWithCompany) {
        addToast({
          type: 'error',
          title: 'ไม่พบข้อมูล',
          message: 'ไม่พบข้อมูล vendor นี้'
        });
        navigate('/csm');
        return;
      }

      setVendor(vendorWithCompany.vendor);
      setCompany(vendorWithCompany.company);

      // Get active form for CSM
      const csmForm = await csmService.forms.getCSMChecklist();
      
      if (!csmForm) {
        addToast({
          type: 'error',
          title: 'ไม่พบแบบฟอร์ม',
          message: 'ไม่พบแบบฟอร์มประเมิน CSM ที่เปิดใช้งาน'
        });
        return;
      }
      
      setForm(csmForm);

      // Check if there's an existing assessment
      const existingAssessments = await csmService.assessments.getByVdCode(vdCode);
      const currentAssessment = existingAssessments.find((a: CSMAssessment) => 
        a.formId === csmForm.id && !a.isFinish
      );

      if (currentAssessment) {
        setAssessment(currentAssessment);
        setAnswers(currentAssessment.answers || []);
        setAuditor(currentAssessment.auditor || {
          name: '',
          email: '',
          phone: '',
          position: ''
        });
        setReadOnly(currentAssessment.isFinish || false);
      } else {
        // Initialize new assessment
        const newAssessment: Omit<CSMAssessment, 'id'> = {
          companyId: vendorWithCompany.vendor.companyId,
          vdCode: vendorWithCompany.vendor.vdCode,
          vdName: vendorWithCompany.vendor.vdName,
          formId: csmForm.id || '',
          formVersion: '1.0', // You might want to get this from the form
          answers: [],
          auditor: {
            name: '',
            email: '',
            phone: '',
            position: ''
          },
          vdCategory: vendorWithCompany.vendor.category,
          vdWorkingArea: vendorWithCompany.vendor.workingArea?.join(', ') || '',
          isActive: true,
          isFinish: false,
          createdAt: new Date(),
        };
        
        setAssessment(newAssessment as CSMAssessment);
        
        // Initialize answers for all form fields
        const initialAnswers: CSMAssessmentAnswer[] = csmForm.fields.map((field: CSMFormField) => ({
          ckItem: field.ckItem,
          ckType: field.ckType,
          ckQuestion: field.ckQuestion,
          comment: '',
          score: field.ckType === 'M' ? '0' : 'n/a',
          tScore: '0',
          files: [],
          isFinish: false
        }));
        
        setAnswers(initialAnswers);
      }

    } catch (error) {
      console.error('Error loading assessment data:', error);
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
      });
    } finally {
      setLoading(false);
    }
  }, [vdCode, addToast, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate assessment progress and scores
  const assessmentStats = useMemo(() => {
    if (!form || answers.length === 0) {
      return {
        totalQuestions: 0,
        answeredQuestions: 0,
        mandatoryQuestions: 0,
        mandatoryAnswered: 0,
        progressPercentage: 0,
        totalScore: 0,
        maxScore: 0,
        avgScore: 0
      };
    }

    const totalQuestions = form.fields.length;
    const mandatoryQuestions = form.fields.filter(f => f.ckType === 'M').length;
    
    const answeredQuestions = answers.filter(a => 
      a.comment.trim() !== '' && a.score !== undefined
    ).length;
    
    const mandatoryAnswered = answers.filter(a => 
      a.ckType === 'M' && a.comment.trim() !== '' && a.score !== undefined
    ).length;

    const progressPercentage = totalQuestions > 0 
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0;

    // Calculate scores
    const totalScore = answers.reduce((sum, answer) => {
      const score = parseFloat(answer.score || '0');
      return sum + (isNaN(score) ? 0 : score);
    }, 0);

    const maxScore = answers.reduce((sum, answer) => {
      const field = form.fields.find(f => f.ckItem === answer.ckItem);
      const fieldScore = parseFloat(field?.fScore || '5');
      return sum + (isNaN(fieldScore) ? 5 : fieldScore);
    }, 0);

    const avgScore = maxScore > 0 ? totalScore / maxScore * 5 : 0;

    return {
      totalQuestions,
      answeredQuestions,
      mandatoryQuestions,
      mandatoryAnswered,
      progressPercentage,
      totalScore,
      maxScore,
      avgScore: Math.round(avgScore * 100) / 100
    };
  }, [form, answers]);

  // Handle answers change
  const handleAnswersChange = useCallback((newAnswers: CSMAssessmentAnswer[]) => {
    setAnswers(newAnswers);
  }, []);

  // Handle auditor change
  const handleAuditorChange = useCallback((field: keyof CSMAuditee, value: string) => {
    setAuditor(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Save assessment (draft)
  const handleSave = useCallback(async () => {
    if (!vendor || !assessment || !form) return;

    try {
      setSaving(true);

      const updatedAssessment: CSMAssessment = {
        ...assessment,
        answers,
        auditor,
        totalScore: assessmentStats.totalScore.toString(),
        maxScore: assessmentStats.maxScore.toString(),
        avgScore: assessmentStats.avgScore.toString(),
        updatedAt: new Date(),
        lastModifiedBy: auditor.email || 'system'
      };

      if (assessment.id) {
        // Update existing assessment
        await csmService.assessments.update(assessment.id, updatedAssessment);
      } else {
        // Create new assessment
        const newId = await csmService.assessments.create(updatedAssessment);
        setAssessment({ ...updatedAssessment, id: newId });
      }

      addToast({
        type: 'success',
        title: 'บันทึกสำเร็จ',
        message: 'บันทึกข้อมูลเรียบร้อยแล้ว'
      });

    } catch (error) {
      console.error('Error saving assessment:', error);
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
      });
    } finally {
      setSaving(false);
    }
  }, [vendor, assessment, form, answers, auditor, assessmentStats, addToast]);

  // Submit assessment (final)
  const handleSubmit = useCallback(async () => {
    if (!vendor || !assessment || !form) return;

    // Validate required fields
    if (!auditor.name || !auditor.email) {
      addToast({
        type: 'error',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณากรอกข้อมูลผู้ประเมินให้ครบถ้วน'
      });
      return;
    }

    // Check if all mandatory questions are answered
    if (assessmentStats.mandatoryAnswered < assessmentStats.mandatoryQuestions) {
      addToast({
        type: 'error',
        title: 'คำถามไม่ครบถ้วน',
        message: `กรุณาตอบคำถามบังคับให้ครบถ้วน (${assessmentStats.mandatoryAnswered}/${assessmentStats.mandatoryQuestions})`
      });
      return;
    }

    try {
      setSubmitting(true);

      const finalAssessment: CSMAssessment = {
        ...assessment,
        answers,
        auditor,
        totalScore: assessmentStats.totalScore.toString(),
        maxScore: assessmentStats.maxScore.toString(),
        avgScore: assessmentStats.avgScore.toString(),
        isFinish: true,
        updatedAt: new Date(),
        lastModifiedBy: auditor.email
      };

      if (assessment.id) {
        await csmService.assessments.update(assessment.id, finalAssessment);
      } else {
        const newId = await csmService.assessments.create(finalAssessment);
        setAssessment({ ...finalAssessment, id: newId });
      }

      addToast({
        type: 'success',
        title: 'ส่งผลประเมินสำเร็จ',
        message: 'ส่งผลการประเมินเรียบร้อยแล้ว'
      });

      setReadOnly(true);

    } catch (error) {
      console.error('Error submitting assessment:', error);
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาดในการส่งผลการประเมิน'
      });
    } finally {
      setSubmitting(false);
    }
  }, [vendor, assessment, form, answers, auditor, assessmentStats, addToast]);

  // Get risk level based on score
  const getRiskLevel = useCallback((score: number): string => {
    if (score >= 4) return 'Low';
    if (score >= 3) return 'Moderate';
    return 'High';
  }, []);

  const riskLevel = getRiskLevel(assessmentStats.avgScore);

  if (loading) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <div className="mb-8">
          <SkeletonLoader className="w-64 h-8 mb-4" />
          <SkeletonLoader className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="p-6 bg-white border rounded-lg shadow-sm">
                <SkeletonLoader className="w-3/4 h-6 mb-4" />
                <SkeletonLoader className="w-full h-4 mb-2" />
                <SkeletonLoader className="w-2/3 h-4" />
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <SkeletonLoader className="w-1/2 h-6 mb-4" />
              <SkeletonLoader className="w-full h-4 mb-2" />
              <SkeletonLoader className="w-3/4 h-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900">ไม่พบข้อมูล Vendor</h2>
          <p className="mb-4 text-gray-600">ไม่พบข้อมูล vendor ที่ต้องการประเมิน</p>
          <button
            onClick={() => navigate('/csm')}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            กลับไปหน้ารายการ
          </button>
        </div>
      </div>
    );
  }

  const categoryInfo = getCategoryInfo(vendor.category);

  return (
    <div className="container px-4 py-8 mx-auto">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/csm')}
            className="p-2 transition-colors border rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              ประเมิน CSM: {vendor.vdName}
            </h1>
            <p className="mt-1 text-gray-600">
              รหัส Vendor: {vendor.vdCode} • หมวดหมู่: {categoryInfo?.name || vendor.category}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!readOnly && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting || assessmentStats.mandatoryAnswered < assessmentStats.mandatoryQuestions}
                className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'กำลังส่ง...' : 'ส่งผลประเมิน'}
              </button>
            </>
          )}
          
          {readOnly && (
            <div className="flex items-center gap-2 px-4 py-2 text-green-800 bg-green-100 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              ประเมินเสร็จสิ้นแล้ว
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Vendor Information */}
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-900">
              <Building2 className="w-5 h-5" />
              ข้อมูล Vendor
            </h3>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  ชื่อ Vendor
                </label>
                <p className="text-gray-900">{vendor.vdName}</p>
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  รหัส Vendor
                </label>
                <p className="text-gray-900">{vendor.vdCode}</p>
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  หมวดหมู่
                </label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryInfo?.color || 'bg-gray-100 text-gray-800'}`}>
                  {categoryInfo?.name || vendor.category}
                </span>
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  รอบประเมิน
                </label>
                <p className="text-gray-900">{vendor.freqAss}</p>
              </div>
            </div>

            {vendor.workingArea && vendor.workingArea.length > 0 && (
              <div className="mt-4">
                <label className="flex items-center block gap-1 mb-2 text-sm font-medium text-gray-700">
                  <MapPin className="w-4 h-4" />
                  พื้นที่ทำงาน
                </label>
                <div className="flex flex-wrap gap-2">
                  {vendor.workingArea.map((area, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-sm text-blue-800 bg-blue-100 rounded"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {company && (
              <div className="pt-4 mt-4 border-t">
                <h4 className="mb-2 font-medium text-gray-900">ข้อมูลติดต่อ</h4>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div>
                    <span className="text-gray-600">ผู้ติดต่อ: </span>
                    <span className="text-gray-900">{company.contactPerson || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">อีเมล: </span>
                    <span className="text-gray-900">{company.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">โทรศัพท์: </span>
                    <span className="text-gray-900">{company.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ที่อยู่: </span>
                    <span className="text-gray-900">{company.address || '-'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Auditor Information */}
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-900">
              <User className="w-5 h-5" />
              ข้อมูลผู้ประเมิน
            </h3>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  ชื่อผู้ประเมิน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={auditor.name}
                  onChange={(e) => handleAuditorChange('name', e.target.value)}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="ระบุชื่อผู้ประเมิน"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  อีเมล <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={auditor.email}
                  onChange={(e) => handleAuditorChange('email', e.target.value)}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="ระบุอีเมลผู้ประเมิน"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  เบอร์ติดต่อ
                </label>
                <input
                  type="tel"
                  value={auditor.phone || ''}
                  onChange={(e) => handleAuditorChange('phone', e.target.value)}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="ระบุเบอร์ติดต่อ"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  ตำแหน่ง
                </label>
                <input
                  type="text"
                  value={auditor.position || ''}
                  onChange={(e) => handleAuditorChange('position', e.target.value)}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="ระบุตำแหน่ง"
                />
              </div>
            </div>
          </div>

          {/* Assessment Questions */}
          {form && (
            <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
              <div className="p-6 border-b bg-gray-50">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <FileText className="w-5 h-5" />
                  {form.formTitle}
                </h3>
                <p className="mt-1 text-gray-600">
                  รหัสฟอร์ม: {form.formCode} • รุ่น: {assessment?.formVersion || '1.0'}
                </p>
              </div>
              
              <div className="p-6">
                <QuestionForm
                  formFields={form.fields}
                  initialAnswers={answers}
                  vdCode={vendor.vdCode}
                  onAnswersChange={handleAnswersChange}
                  onSave={handleSave}
                  readOnly={readOnly}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Summary */}
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">สถานะการประเมิน</h3>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between mb-2 text-sm text-gray-600">
                <span>ความคืบหน้า</span>
                <span>{assessmentStats.progressPercentage}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 transition-all duration-300 bg-blue-600 rounded-full"
                  style={{ width: `${assessmentStats.progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">คำถามทั้งหมด:</span>
                <span className="font-medium">{assessmentStats.totalQuestions}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">ตอบแล้ว:</span>
                <span className="font-medium text-blue-600">
                  {assessmentStats.answeredQuestions}/{assessmentStats.totalQuestions}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">คำถามบังคับ:</span>
                <span className={`font-medium ${
                  assessmentStats.mandatoryAnswered === assessmentStats.mandatoryQuestions 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {assessmentStats.mandatoryAnswered}/{assessmentStats.mandatoryQuestions}
                </span>
              </div>
            </div>

            {/* Validation Messages */}
            {assessmentStats.mandatoryAnswered < assessmentStats.mandatoryQuestions && (
              <div className="p-3 mt-4 border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">กรุณาตอบคำถามบังคับให้ครบถ้วน</p>
                    <p>ยังขาดอีก {assessmentStats.mandatoryQuestions - assessmentStats.mandatoryAnswered} คำถาม</p>
                  </div>
                </div>
              </div>
            )}

            {(!auditor.name || !auditor.email) && !readOnly && (
              <div className="p-3 mt-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">กรุณากรอกข้อมูลผู้ประเมิน</p>
                    <p>ต้องระบุชื่อและอีเมลผู้ประเมิน</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Score Summary */}
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">สรุปคะแนน</h3>
            
            <div className="space-y-4">
              <div className="text-center">
                <div className="mb-1 text-3xl font-bold text-gray-900">
                  {assessmentStats.avgScore.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">คะแนนเฉลี่ย (จาก 5)</div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">คะแนนรวม:</span>
                <span className="font-medium">
                  {assessmentStats.totalScore}/{assessmentStats.maxScore}
                </span>
              </div>

              {/* Risk Level */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">ระดับความเสี่ยง:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    riskLevel === 'Low' ? 'bg-green-100 text-green-800' :
                    riskLevel === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {riskLevel}
                  </span>
                </div>
              </div>

              {/* Risk Level Description */}
              <div className="text-xs text-gray-500">
                {riskLevel === 'Low' && 'ความเสี่ยงต่ำ: คะแนน 4.0 ขึ้นไป'}
                {riskLevel === 'Moderate' && 'ความเสี่ยงปานกลาง: คะแนน 3.0-3.9'}
                {riskLevel === 'High' && 'ความเสี่ยงสูง: คะแนนต่ำกว่า 3.0'}
              </div>
            </div>
          </div>

          {/* Assessment Info */}
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-900">
              <Calendar className="w-5 h-5" />
              ข้อมูลการประเมิน
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">สถานะ:</span>
                <span className={`font-medium ${
                  readOnly ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {readOnly ? 'เสร็จสิ้น' : 'กำลังดำเนินการ'}
                </span>
              </div>



              {assessment?.lastModifiedBy && (
                <div className="flex justify-between">
                  <span className="text-gray-600">แก้ไขโดย:</span>
                  <span className="text-gray-900">{assessment.lastModifiedBy}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {!readOnly && (
            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">การดำเนินการ</h3>
              
              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center w-full gap-2 px-4 py-2 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'กำลังบันทึก...' : 'บันทึกฉบับร่าง'}
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={
                    submitting || 
                    assessmentStats.mandatoryAnswered < assessmentStats.mandatoryQuestions ||
                    !auditor.name || 
                    !auditor.email
                  }
                  className="flex items-center justify-center w-full gap-2 px-4 py-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'กำลังส่ง...' : 'ส่งผลประเมิน'}
                </button>

                <div className="text-xs text-center text-gray-500">
                  เมื่อส่งผลประเมินแล้วจะไม่สามารถแก้ไขได้
                </div>
              </div>
            </div>
          )}

          {/* Assessment History Link */}
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">ประวัติการประเมิน</h3>
            
            <button
              onClick={() => navigate(`/csm/history/${vendor.vdCode}`)}
              className="w-full px-4 py-2 text-blue-600 transition-colors border border-blue-600 rounded-lg hover:bg-blue-50"
            >
              ดูประวัติการประเมินทั้งหมด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSMEvaluatePage;  