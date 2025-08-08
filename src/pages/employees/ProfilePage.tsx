// src/pages/employees/ProfilePage.tsx - Clean Working Version
// src/pages/employees/ProfilePage.tsx - Clean Working Version

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { 
  FaUserCircle, 
  FaInfoCircle, 
  FaArrowLeft, 
  FaSpinner,
  FaExclamationTriangle,
  FaFileAlt,
  FaBuilding,
  FaEnvelope,
  FaMapMarkerAlt,
  FaIdCard,
  FaEye,
  FaCalendarAlt,
  FaEyeSlash,
  FaToggleOn,
  FaToggleOff,
  FaDownload
} from 'react-icons/fa';
import { FaArrowDownShortWide, FaRotateRight } from "react-icons/fa6";
import { auth, db } from '../../services/firebase';
import type { EmployeeProfile, TrainingRecord, PaginationState, TrainingSummary } from '../../types/types';
import { signInAnonymously } from 'firebase/auth';
import Papa from 'papaparse';

// Import dateUtils
import { formatDateShort, isDateExpired, type DateInput } from '../../components/utils/dateUtils';

// Constants
const ITEMS_PER_PAGE = 25;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Simple Cache
class SimpleCache {
  private cache = new Map<string, { data: unknown; expiry: number }>();

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: unknown, ttl = CACHE_TTL): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const cache = new SimpleCache();

// Custom Hooks
const useDebounce = (value: string, delay: number): string => {
  const [debouncedValue, setDebouncedValue] = useState<string>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Components
const LoadingSpinner: React.FC<{ message?: string }> = React.memo(({ message = 'กำลังโหลด...' }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <FaSpinner className="mb-4 text-4xl text-blue-500 animate-spin" />
    <p className="text-gray-600">{message}</p>
  </div>
));

const ErrorAlert: React.FC<{ message: string; onBack?: () => void; onRetry?: () => void }> = React.memo(({ message, onBack, onRetry }) => (
  <div className="p-4 mb-4 border border-red-200 rounded-lg bg-red-50">
    <div className="flex items-start">
      <FaExclamationTriangle className="text-red-400 mt-0.5 mr-3 flex-shrink-0" />
      <div className="flex-1">
        <div className="text-sm text-red-800 whitespace-pre-line">{message}</div>
        <div className="flex mt-3 space-x-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <FaRotateRight className="w-3 h-3 mr-1" />
              ลองใหม่
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <FaArrowLeft className="w-3 h-3 mr-1" />
              กลับ
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
));

const PaginationControls: React.FC<{
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  loading?: boolean;
}> = React.memo(({ pagination, onPageChange, loading = false }) => {
  const { currentPage, totalPages, totalItems, hasPrevPage, hasNextPage } = pagination;

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
      <div className="text-sm text-gray-700">
        แสดงรายการที่ {((currentPage - 1) * pagination.itemsPerPage) + 1} - {Math.min(currentPage * pagination.itemsPerPage, totalItems)} 
        จาก {totalItems} รายการ
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevPage || loading}
          className="px-3 py-1 text-sm transition-colors bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ก่อนหน้า
        </button>
        
        <span className="px-3 py-1 text-sm">
          หน้า {currentPage} จาก {totalPages}
        </span>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage || loading}
          className="px-3 py-1 text-sm transition-colors bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ถัดไป
        </button>
      </div>
    </div>
  );
});

// Main Component
export default function ProfilePage() {
  const { empId: empIdFromParams } = useParams<{ empId: string }>();
  const navigate = useNavigate();
  
  // Core state
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [allTrainingRecords, setAllTrainingRecords] = useState<TrainingRecord[]>([]);
  const [trainingSummary, setTrainingSummary] = useState<TrainingSummary | null>(null);
  
  // UI state
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [loading, setLoading] = useState({
    initial: true,
    employee: false,
    training: false,
    export: false
  });
  const [errors, setErrors] = useState<{
    employee?: string;
    training?: string;
  }>({});
  
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState<boolean>(false);
  
  // Search state
  //const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchTerm] = useState<string>('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: ITEMS_PER_PAGE,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  // Computed values
  const displayedRecords = useMemo(() => {
    // Apply search filter
    let filtered = allTrainingRecords;
    
    // Use debounced search
    if (debouncedSearch) {
      const searchTermLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(record => 
        record.courseName?.toLowerCase().includes(searchTermLower) ||
        record.empId?.toLowerCase().includes(searchTermLower)
      );
    }
    
    // Apply show all toggle (this is the main filter)
    const finalRecords = showAllRecords 
      ? filtered 
      : filtered.filter(record => {
          if (!record.expiryDate) return true;
          return !isDateExpired(record.expiryDate);
        });
    
    // Pagination
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    const paginatedRecords = finalRecords.slice(startIndex, endIndex);
    
    // Update pagination info
    const totalPages = Math.ceil(finalRecords.length / pagination.itemsPerPage);
    setPagination(prev => ({
      ...prev,
      totalPages,
      totalItems: finalRecords.length,
      hasNextPage: pagination.currentPage < totalPages,
      hasPrevPage: pagination.currentPage > 1
    }));
    
    return paginatedRecords;
  }, [allTrainingRecords, debouncedSearch, showAllRecords, pagination.currentPage, pagination.itemsPerPage]);
  
  // Callbacks
  const handleImageLoad = useCallback(() => setImageLoading(false), []);
  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);
  
  const handleToggleRecords = useCallback(() => {
    setShowAllRecords(prev => !prev);
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page
  }, []);
  
  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  }, []);
  
  const handleExport = useCallback(() => {
    if (!employeeProfile || displayedRecords.length === 0) return;
    
    setLoading(prev => ({ ...prev, export: true }));
    
    try {
      const csvData = displayedRecords.map(record => ({
        'รหัสพนักงาน': employeeProfile.empId,
        'ชื่อ-นามสกุล': employeeProfile.fullname || employeeProfile.displayName,
        'หลักสูตร': record.courseName,
        'วันที่อบรม': formatDateShort(record.trainingDate as DateInput || record.trainingDateFieldValue as DateInput),
        'วันหมดอายุ': record.expiryDate ? formatDateShort(record.expiryDate) : 'ไม่หมดอายุ',
        'สถานะ': !record.expiryDate ? 'Lifetime' : isDateExpired(record.expiryDate) ? 'หมดอายุแล้ว' : 'ยังใช้งานได้',
        'หมายเหตุ': record.evidenceText || ''
      }));
      
      const csv = Papa.unparse(csvData);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `training_history_${employeeProfile.empId}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setErrors(prev => ({ ...prev, training: `การส่งออกข้อมูลล้มเหลว: ${error.message}` }));
    } finally {
      setLoading(prev => ({ ...prev, export: false }));
    }
  }, [employeeProfile, displayedRecords]);
  
  // Data fetching functions
  const fetchEmployeeData = useCallback(async () => {
    if (!empIdFromParams) return;
    
    const cacheKey = `employee_${empIdFromParams}`;
    const cached = cache.get(cacheKey) as EmployeeProfile | null;
    if (cached) {
      setEmployeeProfile(cached);
      return;
    }
    
    setLoading(prev => ({ ...prev, employee: true }));
    setErrors(prev => ({ ...prev, employee: undefined }));
    
    try {
      const employeesRef = collection(db, "employees");
      const q = query(employeesRef, where("empId", "==", empIdFromParams));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const empDoc = querySnapshot.docs[0];
        const employeeData = { id: empDoc.id, ...empDoc.data() } as EmployeeProfile;
        cache.set(cacheKey, employeeData);
        setEmployeeProfile(employeeData);
      } else {
        throw new Error(`ไม่พบข้อมูลพนักงานสำหรับรหัส: ${empIdFromParams}`);
      }
    } catch (error: any) {
      setErrors(prev => ({ ...prev, employee: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, employee: false }));
    }
  }, [empIdFromParams]);
  
  const fetchTrainingData = useCallback(async () => {
    if (!empIdFromParams) return;
    
    const cacheKey = `training_${empIdFromParams}`;
    const cached = cache.get(cacheKey) as { records: TrainingRecord[]; summary: TrainingSummary } | null;
    if (cached) {
      setAllTrainingRecords(cached.records);
      setTrainingSummary(cached.summary);
      return;
    }
    
    setLoading(prev => ({ ...prev, training: true }));
    setErrors(prev => ({ ...prev, training: undefined }));
    
    try {
      const trainingsRef = collection(db, "trainings");
      const q = query(
        trainingsRef, 
        where("empId", "==", empIdFromParams), 
        orderBy("trainingDate", "desc")
      );
      const querySnapshot = await getDocs(q);

      const records = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as TrainingRecord[];
      
      // Calculate summary
      const active = records.filter(record => {
        if (!record.expiryDate) return true;
        return !isDateExpired(record.expiryDate);
      }).length;
      
      const expired = records.length - active;
      const uniqueCourses = [...new Set(
        records
          .map(r => r.courseName)
          .filter((courseName): courseName is string => Boolean(courseName))
      )];
      
      const summary: TrainingSummary = {
        total: records.length,
        active,
        expired,
        uniqueCourses
      };
      
      // Cache both records and summary
      cache.set(cacheKey, { records, summary });
      
      setAllTrainingRecords(records);
      setTrainingSummary(summary);
    } catch (error: any) {
      setErrors(prev => ({ ...prev, training: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, training: false }));
    }
  }, [empIdFromParams]);
  
  const refreshData = useCallback(async () => {
    cache.clear();
    await Promise.all([fetchEmployeeData(), fetchTrainingData()]);
  }, [fetchEmployeeData, fetchTrainingData]);
  
  // Effects
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
        setAuthInitialized(true);
      } catch (error) {
        console.error('❌ Anonymous authentication failed:', error);
        setErrors({ employee: 'ไม่สามารถเข้าถึงระบบได้ กรุณาลองใหม่อีกครั้ง' });
        setLoading(prev => ({ ...prev, initial: false }));
      }
    };
    initAuth();
  }, []);
  
  // Initial data fetch
  useEffect(() => {
    if (!empIdFromParams || !authInitialized) return;
    
    const initializeData = async () => {
      await Promise.all([fetchEmployeeData(), fetchTrainingData()]);
      setLoading(prev => ({ ...prev, initial: false }));
    };
    
    initializeData();
  }, [empIdFromParams, authInitialized, fetchEmployeeData, fetchTrainingData]);
  
  // Reset to first page when debounced search changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [debouncedSearch]);
  
  // Rendering
  if (!authInitialized || loading.initial) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container px-4 py-8 mx-auto">
          <LoadingSpinner message={!authInitialized ? "กำลังเชื่อมต่อระบบ..." : "กำลังโหลดข้อมูล..."} />
        </div>
      </div>
    );
  }
  
  if (errors.employee && !employeeProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container px-4 py-8 mx-auto">
          <ErrorAlert 
            message={errors.employee} 
            onBack={() => navigate('/')}
            onRetry={fetchEmployeeData}
          />
        </div>
      </div>
    );
  }
  
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-6xl px-4 py-8 mx-auto">
        
        {/* Refresh Button */}
        <div className="mb-4">
          <button
            onClick={refreshData}
            disabled={loading.employee || loading.training}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            <FaRotateRight className={`mr-1 w-3 h-3 ${(loading.employee || loading.training) ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
        </div>

        {/* Employee Profile */}
        {employeeProfile && (
          <div className="mb-6 overflow-hidden bg-white rounded-lg shadow-lg">
            <div className="p-6">
              <div className="flex flex-col items-center space-y-4 lg:flex-row lg:items-start lg:space-y-0 lg:space-x-6">

                <div className="relative flex-shrink-0 w-32 h-32 text-center">
                  {employeeProfile.profileImageUrl && !imageError && (
                    <img 
                      src={employeeProfile.profileImageUrl}
                      alt={employeeProfile.fullName || 'Profile'}
                      className="object-cover w-32 h-32 border-4 border-gray-200 rounded-full"
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                    />
                  )}
                  
                  {(imageLoading || imageError || !employeeProfile.profileImageUrl) && (
                    <div className="absolute inset-0 flex items-center justify-center w-32 h-32 bg-gray-100 rounded-full">
                      <FaUserCircle className="w-24 h-24 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center lg:text-left">
                  <h1 className="mb-2 text-3xl font-bold text-gray-900">
                    {employeeProfile.fullName || employeeProfile.displayName || 'ไม่ระบุชื่อ'}
                  </h1>
                  <p className="mb-4 text-xl font-semibold text-blue-600">
                    <FaIdCard className="inline mr-2" />
                    รหัสพนักงาน: {employeeProfile.empId}
                  </p>

                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div className="flex items-center">
                      <FaUserCircle className="mr-2 text-gray-400" />
                      <span className="font-medium">ตำแหน่ง:</span>
                      <span className="ml-2">{employeeProfile.position || 'ไม่ระบุ'}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <FaBuilding className="mr-2 text-gray-400" />
                      <span className="font-medium">บริษัท:</span>
                      <span className="ml-2">{employeeProfile.company || 'ไม่ระบุ'}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <FaEnvelope className="mr-2 text-gray-400" />
                      <span className="font-medium">อีเมล:</span>
                      <span className="ml-2">{employeeProfile.email || 'ไม่ระบุ'}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <FaMapMarkerAlt className="mr-2 text-gray-400" />
                      <span className="font-medium">ไซต์:</span>
                      <span className="ml-2">{employeeProfile.plantId  || 'ไม่ระบุ' || ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Training Records */}
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <h2 className="flex items-center text-lg font-semibold text-gray-900">
                <FaArrowDownShortWide className="mr-2 text-blue-600" />
                ประวัติการอบรม
                {trainingSummary && (
                  <div className="flex ml-3 space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      All: {trainingSummary.total}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <FaEye className="w-3 h-3 mr-1" />
                      Active: {trainingSummary.active}
                    </span>
                    {trainingSummary.expired > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <FaEyeSlash className="w-3 h-3 mr-1" />
                        Expired: {trainingSummary.expired}
                      </span>
                    )}
                  </div>
                )}
              </h2>

              <div className="flex items-center space-x-3">   
                {/* Toggle All Records */}
                {trainingSummary && trainingSummary.expired > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Show all</span>
                    <button
                      onClick={handleToggleRecords}
                      className="flex items-center focus:outline-none"
                      title={showAllRecords ? "แสดงเฉพาะรายการที่ยังไม่หมดอายุ" : "แสดงประวัติทั้งหมด รวมที่หมดอายุ"}
                    >
                      {showAllRecords ? (
                        <FaToggleOn className="text-2xl text-blue-500 transition-colors hover:text-blue-600" />
                      ) : (
                        <FaToggleOff className="text-2xl text-gray-400 transition-colors hover:text-gray-500" />
                      )}
                    </button>
                  </div>
                )}
              
            {/* Export Button */}
                <button
                  onClick={handleExport}
                  disabled={loading.export || !employeeProfile || displayedRecords.length === 0}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  {loading.export ? (
                    <FaSpinner className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <FaDownload className="w-3 h-3 mr-1" />
                  )}
                  ส่งออก CSV
                </button>              
              
              </div>
            </div>
          </div>

{/* 
          ///* Search and Controls 
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              ///* Search Box 
              <div className="flex-1 max-w-md">
                <SearchBox
                  value={searchTerm}
                  onChange={handleSearchChange}
                  loading={loading.training}
                />
              </div>           
            </div>
            ///* Search hint 
            {searchTerm && (
              <div className="mt-2 text-xs text-gray-500">
                💡 ค้นหาจะทำงานอัตโนมัติหลังหยุดพิมพ์ 300ms • กรองแล้ว {pagination.totalItems} รายการ
              </div>
            )}
          </div>
*/}

          {/* Content */}
          <div className="p-6">
            {/* Errors */}
            {errors.training && (
              <ErrorAlert 
                message={errors.training}
                onRetry={fetchTrainingData}
              />
            )}

            {/* Loading State */}
            {loading.training && (
              <LoadingSpinner message="กำลังโหลดข้อมูล..." />
            )}

            {/* Empty State */}
            {!loading.training && displayedRecords.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                <FaFileAlt className="mx-auto mb-4 text-4xl" />
                <p className="mb-2 text-lg font-medium">ไม่พบประวัติการอบรม</p>
                <p className="text-sm">
                  {allTrainingRecords.length === 0 
                    ? "ไม่มีข้อมูลการอบรมในระบบ" 
                    : showAllRecords 
                      ? searchTerm 
                        ? "ไม่พบข้อมูลที่ตรงกับคำค้นหา" 
                        : "ไม่พบข้อมูล"
                      : "ไม่พบประวัติการอบรมที่ยังไม่หมดอายุ"
                  }
                </p>
                {!showAllRecords && trainingSummary && trainingSummary.expired > 0 && (
                  <button
                    onClick={handleToggleRecords}
                    className="mt-2 text-sm text-blue-600 underline hover:text-blue-700"
                  >
                    แสดงประวัติที่หมดอายุ ({trainingSummary.expired} รายการ)
                  </button>
                )}
              </div>
            )}

            {/* Training Records Table */}
            {!loading.training && displayedRecords.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          No. 
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          <FaInfoCircle className="inline mr-1" />
                          Course Name
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          <FaCalendarAlt className="inline mr-1" />
                          Training Date
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Status / Expiry
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Files
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {displayedRecords.map((record, index) => {
                        //const status = getDateStatus(record.expiryDate);
                        const isExpired = record.expiryDate && isDateExpired(record.expiryDate);
                        const globalIndex = ((pagination.currentPage - 1) * pagination.itemsPerPage) + index + 1;
                        
                        return (
                          <tr 
                            key={record.id} 
                            className={`hover:bg-gray-50 transition-colors ${isExpired ? 'bg-red-50 opacity-75' : ''}`}
                          >
                            <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                              {globalIndex}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className={`font-medium ${isExpired ? 'text-gray-500' : 'text-gray-900'}`}>
                                {record.courseName || 'ไม่ระบุชื่อหลักสูตร'}
                                {isExpired && (
                                  <span className="ml-2 text-xs font-normal text-red-500">
                                    (หมดอายุ)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                              {formatDateShort(record.trainingDate as DateInput || record.trainingDateFieldValue as DateInput )}
                            </td>
                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                              {/* Enhanced Status with Expiry Date */}
                              {!record.expiryDate ? (
                                // Lifetime - No expiry date
                                <div className="flex flex-col">
                                  <span className="items-center justify-center px-3 py-1 text-xs font-medium text-green-800 bg-green-100 border border-green-200 rounded-full inline-flex-">
                                    Life-time
                                  </span>
                                </div>
                              ) : isExpired ? (
                                // Expired
                                <div className="flex flex-col">
                                  <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-600 bg-red-100 border border-red-200 rounded-full">
                                    ❌ {formatDateShort(record.expiryDate)}
                                  </span>
                                </div>
                              ) : (
                                // Still Valid
                                <div className="flex flex-col">
                                  <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-800 bg-blue-100 border border-blue-200 rounded-full">
                                    ✅  {formatDateShort(record.expiryDate)} 
                                  </span> 
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                              <div className="flex flex-wrap gap-1">
                                {(() => {
                                  const files = record.files || record.certificateURL || record.fileUrls || record.documents;
                                  
                                  if (files && Array.isArray(files) && files.length > 0) {
                                    return files
                                      .filter((fileUrl: string) => fileUrl && fileUrl.trim())
                                      .slice(0, 3) // Limit displayed files for performance
                                      .map((fileUrl: string, fileIndex: number) => (
                                        <a
                                          key={fileIndex}
                                          href={fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 transition-colors border border-blue-300 rounded bg-blue-50 hover:bg-blue-100"
                                        >
                                          <FaFileAlt className="w-3 h-3 mr-1" />
                                          {fileIndex + 1}
                                        </a>
                                      ));
                                  } else if (files && typeof files === 'string' && files.trim()) {
                                    return (
                                      <a
                                        href={files}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 transition-colors border border-blue-300 rounded bg-blue-50 hover:bg-blue-100"
                                      >
                                        <FaEye className="w-3 h-3 mr-1" />
                                      </a>
                                    );
                                  } else if (record.evidenceText && record.evidenceText.trim()) {
                                    return (
                                      <div className="max-w-xs px-2 py-1 text-xs text-gray-600 truncate rounded bg-gray-50" title={record.evidenceText}>
                                        {record.evidenceText}
                                      </div>
                                    );
                                  } else {
                                    return <span className="text-xs text-gray-400">-</span>;
                                  }
                                })()}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <PaginationControls
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  loading={loading.training}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}