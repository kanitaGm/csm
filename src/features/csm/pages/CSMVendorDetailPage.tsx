// 📁 src/features/csm/pages/CSMVendorDetailPage.tsx
// CSM vendor detail page with comprehensive information
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, CheckCircle, Clock, AlertTriangle,
  Building2, MapPin, Activity, FileText,
  Eye, Plus
} from 'lucide-react';
import type { CSMVendor, CSMAssessment } from '../../../types';
import { csmVendorService } from '../../../services/csmVendorService';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/ToastContainer';
import { SkeletonLoader } from '../../../components/ui/SkeletonLoader';
import { getCategoryInfo, getFrequencyInfo } from '../../../types/csm';

const CSMVendorDetailPage: React.FC = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();

  const [vendor, setVendor] = useState<CSMVendor | null>(null);
  //const [company, setCompany] = useState<Company | null>(null);
  const [assessments, setAssessments] = useState<CSMAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadVendorData = useCallback(async () => {
    if (!vendorId) return;

    try {
      setLoading(true);

      // Load vendor data
      const vendorData = await csmVendorService.getAll().then(vendors => 
        vendors.find(v => v.id === vendorId) || null
      );
      
      if (!vendorData) {
        addToast({
          type: 'error',
          title: 'ไม่พบข้อมูล',
          message: 'ไม่พบข้อมูลผู้รับเหมาที่ระบุ'
        });
        navigate('/csm');
        return;
      }

      setVendor(vendorData);

      // Load company data if available
      if (vendorData.companyId) {
        try {
          // Assuming there's a company service
          // const companyData = await companyService.getById(vendorData.companyId);
          // setCompany(companyData);
        } catch (error) {
          console.warn('Could not load company data:', error);
        }
      }

      // Load assessment history
      const assessmentHistory = await csmVendorService.getAssessmentHistory(vendorData.vdCode);
      setAssessments(assessmentHistory);

    } catch (error) {
      console.error('Error loading vendor data:', error);
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลผู้รับเหมาได้'
      });
    } finally {
      setLoading(false);
    }
  }, [vendorId, navigate, addToast]);

  useEffect(() => {
    if (vendorId) {
      loadVendorData();
    }
  }, [vendorId, loadVendorData]);

  const handleDelete = async () => {
    if (!vendor || !confirm('คุณต้องการลบผู้รับเหมานี้หรือไม่?')) return;

    try {
      setDeleting(true);
      await csmVendorService.delete(vendor.id!);
      
      addToast({
        type: 'success',
        title: 'สำเร็จ',
        message: 'ลบผู้รับเหมาเรียบร้อยแล้ว'
      });

      navigate('/csm');
    } catch (error) {
      console.error('Error deleting vendor:', error);
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถลบผู้รับเหมาได้'
      });
    } finally {
      setDeleting(false);
    }
  };

  const getAssessmentStatus = () => {
    if (assessments.length === 0) return 'not-assessed';
    
    const latestAssessment = assessments[0];
    const assessmentCreatedAt = latestAssessment.createdAt;
    
    // Safe date conversion with proper typing
    let assessmentDate: Date;
    if (assessmentCreatedAt instanceof Date) {
      assessmentDate = assessmentCreatedAt;
    } else if (typeof assessmentCreatedAt === 'string') {
      assessmentDate = new Date(assessmentCreatedAt);
    } else if (assessmentCreatedAt && typeof assessmentCreatedAt === 'object' && 'toDate' in assessmentCreatedAt) {
      // Handle Firestore Timestamp
      assessmentDate = (assessmentCreatedAt as { toDate(): Date }).toDate();
    } else {
      assessmentDate = new Date(); // fallback
    }
    
    const daysSinceAssessment = Math.floor((Date.now() - assessmentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const frequencyInfo = getFrequencyInfo(vendor?.freqAss || '1year');
    const daysInFrequency = frequencyInfo ? frequencyInfo.months * 30 : 365;
    
    if (daysSinceAssessment > daysInFrequency) return 'expired';
    if (!latestAssessment.isFinish) return 'in-progress';
    return 'completed';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-3 py-1 text-sm text-green-800 bg-green-100 rounded-full">
            <CheckCircle className="w-4 h-4 mr-1" />
            ประเมินแล้ว
          </span>
        );
      case 'in-progress':
        return (
          <span className="inline-flex items-center px-3 py-1 text-sm text-yellow-800 bg-yellow-100 rounded-full">
            <Clock className="w-4 h-4 mr-1" />
            กำลังประเมิน
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-3 py-1 text-sm text-red-800 bg-red-100 rounded-full">
            <AlertTriangle className="w-4 h-4 mr-1" />
            หมดอายุ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 text-sm text-gray-800 bg-gray-100 rounded-full">
            <Clock className="w-4 h-4 mr-1" />
            ยังไม่ประเมิน
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="max-w-6xl px-4 mx-auto sm:px-6 lg:px-8">
          <SkeletonLoader rows={8} />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="max-w-6xl px-4 mx-auto text-center sm:px-6 lg:px-8">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">ไม่พบข้อมูลผู้รับเหมา</h1>
          <button
            onClick={() => navigate('/csm')}
            className="text-blue-600 hover:text-blue-800"
          >
            กลับไปยังรายการผู้รับเหมา
          </button>
        </div>
      </div>
    );
  }

  const categoryInfo = getCategoryInfo(vendor.category);
  const frequencyInfo = getFrequencyInfo(vendor.freqAss);
  const assessmentStatus = getAssessmentStatus();

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="max-w-6xl px-4 mx-auto sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/csm')}
            className="flex items-center mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            กลับไปยังรายการผู้รับเหมา
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{vendor.vdName}</h1>
                <p className="text-gray-600">รหัส: {vendor.vdCode}</p>
                <div className="flex items-center mt-2 space-x-4">
                  {getStatusBadge(assessmentStatus)}
                  {vendor.isActive ? (
                    <span className="px-2 py-1 text-xs text-green-800 bg-green-100 rounded">ใช้งาน</span>
                  ) : (
                    <span className="px-2 py-1 text-xs text-red-800 bg-red-100 rounded">ไม่ใช้งาน</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => navigate(`/csm/e/${vendor.vdCode}`)}
                className="flex items-center px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                ประเมิน
              </button>
              <button
                onClick={() => navigate(`/csm/vendors/${vendor.id}/edit`)}
                className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                แก้ไข
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? 'กำลังลบ...' : 'ลบ'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Basic Information */}
            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <h2 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                <Building2 className="w-5 h-5 mr-2" />
                ข้อมูลพื้นฐาน
              </h2>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">รหัสผู้รับเหมา</label>
                  <p className="font-mono text-gray-900">{vendor.vdCode}</p>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">ชื่อผู้รับเหมา</label>
                  <p className="text-gray-900">{vendor.vdName}</p>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">รหัสบริษัท</label>
                  <p className="font-mono text-gray-900">{vendor.companyId}</p>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">หมวดหมู่</label>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${categoryInfo?.color || 'bg-gray-100 text-gray-800'}`}>
                      {categoryInfo?.name || vendor.category}
                    </span>
                  </div>
                  {categoryInfo && (
                    <p className="mt-1 text-sm text-gray-600">{categoryInfo.description}</p>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">ความถี่การประเมิน</label>
                  <p className="text-gray-900">{frequencyInfo ? frequencyInfo.label : 'ไม่ระบุ'}</p>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">สถานะ</label>
                  <span className={`px-2 py-1 text-xs rounded ${
                    vendor.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {vendor.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                  </span>
                </div>
              </div>
            </div>

            {/* Working Areas */}
            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <h2 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                <MapPin className="w-5 h-5 mr-2" />
                พื้นที่ปฏิบัติงาน
              </h2>

              {vendor.workingArea && vendor.workingArea.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {vendor.workingArea.map((area, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 text-sm text-blue-800 bg-blue-100 rounded-full"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="italic text-gray-500">ไม่ได้ระบุพื้นที่ปฏิบัติงาน</p>
              )}
            </div>

            {/* Assessment History */}
            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center text-lg font-semibold text-gray-900">
                  <Activity className="w-5 h-5 mr-2" />
                  ประวัติการประเมิน
                </h2>
                <button
                  onClick={() => navigate(`/csm/assessments/${vendor.vdCode}/history`)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  ดูทั้งหมด
                </button>
              </div>

              {assessments.length > 0 ? (
                <div className="space-y-3">
                  {assessments.slice(0, 5).map((assessment) => {
                    // Safe date conversion with proper typing
                    let displayDate: string;
                    const createdAt = assessment.createdAt;
                    
                    if (createdAt instanceof Date) {
                      displayDate = createdAt.toLocaleDateString('th-TH');
                    } else if (typeof createdAt === 'string') {
                      displayDate = new Date(createdAt).toLocaleDateString('th-TH');
                    } else if (createdAt && typeof createdAt === 'object' && 'toDate' in createdAt) {
                      // Handle Firestore Timestamp with proper typing
                      displayDate = (createdAt as { toDate(): Date }).toDate().toLocaleDateString('th-TH');
                    } else {
                      displayDate = 'ไม่ทราบวันที่';
                    }

                    return (
                      <div
                        key={assessment.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            assessment.isFinish ? 'bg-green-500' : 'bg-yellow-500'
                          }`} />
                          <div>
                            <p className="font-medium text-gray-900">
                              การประเมิน {displayDate}
                            </p>
                            <p className="text-sm text-gray-600">
                              {assessment.isFinish ? 'เสร็จสิ้น' : 'กำลังดำเนินการ'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/csm/a/${assessment.id}`)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          ดูรายละเอียด
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">ยังไม่มีประวัติการประเมิน</p>
                  <button
                    onClick={() => navigate(`/csm/e/${vendor.vdCode}`)}
                    className="mt-2 text-blue-600 hover:text-blue-800"
                  >
                    เริ่มประเมินเลย
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">สถิติโดยสรุป</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">การประเมินทั้งหมด</span>
                  <span className="font-semibold text-gray-900">{assessments.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">การประเมินที่เสร็จสิ้น</span>
                  <span className="font-semibold text-gray-900">
                    {assessments.filter(a => a.isFinish).length}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">คะแนนล่าสุด</span>
                  <span className="font-semibold text-gray-900">
                    {assessments.length > 0 && assessments[0].totalScore 
                      ? `${assessments[0].totalScore}/100`
                      : 'ไม่มีข้อมูล'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">การดำเนินการ</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/csm/e/${vendor.vdCode}`)}
                  className="flex items-center justify-center w-full px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  เริ่มประเมินใหม่
                </button>
                
                <button
                  onClick={() => navigate(`/csm/assessments/${vendor.vdCode}/history`)}
                  className="flex items-center justify-center w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  ดูประวัติการประเมิน
                </button>
                
                <button
                  onClick={() => navigate(`/csm/vendors/${vendor.id}/edit`)}
                  className="flex items-center justify-center w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  แก้ไขข้อมูล
                </button>
              </div>
            </div>

            {/* Metadata */}
            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">ข้อมูลระบบ</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">สร้างเมื่อ:</span>
                  <p className="text-gray-900">
                    {(() => {
                      const createdAt = vendor.createdAt;
                      if (createdAt instanceof Date) {
                        return createdAt.toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                      } else if (typeof createdAt === 'string') {
                        return new Date(createdAt).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                      } else if (createdAt && typeof createdAt === 'object' && 'toDate' in createdAt) {
                        // Handle Firestore Timestamp with proper typing
                        return (createdAt as { toDate(): Date }).toDate().toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                      }
                      return 'ไม่ทราบวันที่';
                    })()}
                  </p>
                </div>
                
                <div>
                  <span className="text-gray-600">อัปเดตล่าสุด:</span>
                  <p className="text-gray-900">
                    {(() => {
                      const updatedAt = vendor.updatedAt;
                      if (updatedAt instanceof Date) {
                        return updatedAt.toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                      } else if (typeof updatedAt === 'string') {
                        return new Date(updatedAt).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                      } else if (updatedAt && typeof updatedAt === 'object' && 'toDate' in updatedAt) {
                        // Handle Firestore Timestamp with proper typing
                        return (updatedAt as { toDate(): Date }).toDate().toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                      }
                      return 'ไม่ทราบวันที่';
                    })()}
                  </p>
                </div>
                
                {vendor.createdBy && (
                  <div>
                    <span className="text-gray-600">สร้างโดย:</span>
                    <p className="text-gray-900">{vendor.createdBy}</p>
                  </div>
                )}
                
                {vendor.lastUpdatedBy&& (
                  <div>
                    <span className="text-gray-600">อัปเดตโดย:</span>
                    <p className="text-gray-900">{vendor.lastUpdatedBy}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default CSMVendorDetailPage;