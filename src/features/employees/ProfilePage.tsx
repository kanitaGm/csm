// src/features/employees/ProfilePage.tsx - Complete Optimized Version

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
  FaDownload,
  FaSearch,
  FaTable,
  FaThLarge
} from 'react-icons/fa';
import { FaArrowDownShortWide, FaRotateRight } from "react-icons/fa6";
import { auth, db } from '../../config/firebase';
import type { EmployeeProfile, TrainingRecord, TrainingSummary } from '../../types';
import { signInAnonymously } from 'firebase/auth';
import Papa from 'papaparse';

// Import dateUtils
import { formatDateShort, isDateExpired, type DateInput } from '../../utils/dateUtils';

// Constants
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

// Debounce hook
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
    <div className="relative">
      <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
    </div>
    <p className="mt-4 text-gray-600 animate-pulse">{message}</p>
  </div>
));

const ErrorAlert: React.FC<{ message: string; onBack?: () => void; onRetry?: () => void }> = React.memo(({ message, onBack, onRetry }) => (
  <div className="p-4 mb-4 border border-red-200 rounded-xl bg-red-50 backdrop-blur-sm">
    <div className="flex items-start">
      <FaExclamationTriangle className="text-red-400 mt-0.5 mr-3 flex-shrink-0" />
      <div className="flex-1">
        <div className="text-sm text-red-800 whitespace-pre-line">{message}</div>
        <div className="flex mt-3 space-x-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105"
            >
              <FaRotateRight className="w-3 h-3 mr-1" />
              ลองใหม่
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transform hover:scale-105"
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
    data: false,
    export: false
  });
  const [errors, setErrors] = useState<string>('');
  
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  // Optimized computed values - รวมการคำนวณทั้งหมดใน useMemo เดียว
  const { filteredRecords, summary } = useMemo(() => {
    // Search filter
    const searchFiltered = debouncedSearch
      ? allTrainingRecords.filter(record => 
          record.courseName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          record.evidenceText?.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
      : allTrainingRecords;
    
    // Show all toggle filter
    const finalRecords = showAllRecords 
      ? searchFiltered 
      : searchFiltered.filter(record => {
          if (!record.expiryDate) return true;
          return !isDateExpired(record.expiryDate);
        });
    
    // Calculate summary
    const active = searchFiltered.filter(record => {
      if (!record.expiryDate) return true;
      return !isDateExpired(record.expiryDate);
    }).length;
    
    const expired = searchFiltered.length - active;
    const uniqueCourses = [...new Set(
      searchFiltered
        .map(r => r.courseName)
        .filter((courseName): courseName is string => Boolean(courseName))
    )];
    
    const computedSummary: TrainingSummary = {
      total: searchFiltered.length,
      active,
      expired,
      uniqueCourses
    };
    
    return {
      filteredRecords: finalRecords,
      summary: computedSummary
    };
  }, [allTrainingRecords, debouncedSearch, showAllRecords]);
  
  // Callbacks
  const handleImageLoad = useCallback(() => setImageLoading(false), []);
  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);
  
  const handleToggleRecords = useCallback(() => {
    setShowAllRecords(prev => !prev);
  }, []);
  
  const handleExport = useCallback(() => {
    if (!employeeProfile || filteredRecords.length === 0) return;
    
    setLoading(prev => ({ ...prev, export: true }));
    
    try {
      const csvData = filteredRecords.map(record => ({
        'รหัสพนักงาน': employeeProfile.empId,
        'ชื่อ-นามสกุล': typeof employeeProfile.fullname === 'string' ? employeeProfile.fullname : 
                        typeof employeeProfile.displayName === 'string' ? employeeProfile.displayName : 'ไม่ระบุชื่อ',
        'หลักสูตร': record.courseName,
        'วันที่อบรม': formatDateShort((record.trainingDate || record.trainingDateFieldValue) as DateInput),
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
      setErrors(`การส่งออกข้อมูลล้มเหลว: ${errorMessage}`);
    } finally {
      setLoading(prev => ({ ...prev, export: false }));
    }
  }, [employeeProfile, filteredRecords]);
  
  // Optimized data fetching - รวมการดึงข้อมูลทั้งหมดในฟังก์ชันเดียว
  const fetchAllData = useCallback(async (useCache = true) => {
    if (!empIdFromParams) return;
    
    const cacheKey = `profile_data_${empIdFromParams}`;
    
    if (useCache) {
      const cached = cache.get(cacheKey) as { employee: EmployeeProfile; records: TrainingRecord[] } | null;
      if (cached) {
        setEmployeeProfile(cached.employee);
        setAllTrainingRecords(cached.records);
        return;
      }
    }
    
    setLoading(prev => ({ ...prev, data: true }));
    setErrors('');
    
    try {
      // Parallel fetch for better performance
      const [employeeSnapshot, trainingSnapshot] = await Promise.all([
        getDocs(query(collection(db, "employees"), where("empId", "==", empIdFromParams))),
        getDocs(query(collection(db, "trainings"), where("empId", "==", empIdFromParams), orderBy("trainingDate", "desc")))
      ]);

      if (employeeSnapshot.empty) {
        throw new Error(`ไม่พบข้อมูลพนักงานสำหรับรหัส: ${empIdFromParams}`);
      }

      const employeeData = { 
        id: employeeSnapshot.docs[0].id, 
        ...employeeSnapshot.docs[0].data() 
      } as EmployeeProfile;
      
      const trainingRecords = trainingSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as TrainingRecord[];
      
      // Cache the combined data
      cache.set(cacheKey, { employee: employeeData, records: trainingRecords });
      
      setEmployeeProfile(employeeData);
      setAllTrainingRecords(trainingRecords);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
      setErrors(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, data: false }));
    }
  }, [empIdFromParams]);
  
  const refreshData = useCallback(async () => {
    cache.clear();
    await fetchAllData(false);
  }, [fetchAllData]);
  
  // Optimized effects
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
        setAuthInitialized(true);
      } catch (error) {
        console.error('❌ Anonymous authentication failed:', error);
        setErrors('ไม่สามารถเข้าถึงระบบได้ กรุณาลองใหม่อีกครั้ง');
        setLoading(prev => ({ ...prev, initial: false }));
      }
    };
    initAuth();
  }, []);
  
  // Single effect for data initialization
  useEffect(() => {
    if (!empIdFromParams || !authInitialized) return;
    
    const initializeData = async () => {
      await fetchAllData();
      setLoading(prev => ({ ...prev, initial: false }));
    };
    
    initializeData();
  }, [empIdFromParams, authInitialized, fetchAllData]);
  
  // Update training summary when records change
  useEffect(() => {
    setTrainingSummary(summary);
  }, [summary]);
  
  // Rendering
  if (!authInitialized || loading.initial) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container px-4 py-8 mx-auto">
          <LoadingSpinner message={!authInitialized ? "กำลังเชื่อมต่อระบบ..." : "กำลังโหลดข้อมูล..."} />
        </div>
      </div>
    );
  }
  
  if (errors && !employeeProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container px-4 py-8 mx-auto">
          <ErrorAlert 
            message={errors} 
            onBack={() => navigate('/')}
            onRetry={() => fetchAllData(false)}
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container px-4 py-8 mx-auto max-w-7xl">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">          
          <button
            onClick={refreshData}
            disabled={loading.data}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 transform bg-white border border-gray-300 shadow-sm rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 hover:scale-105"
          >
            <FaRotateRight className={`mr-2 w-4 h-4 ${loading.data ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
        </div>

        {/* Employee Profile */}
        {employeeProfile && (
          <div className="mb-8 overflow-hidden transition-all duration-300 bg-white shadow-xl rounded-2xl backdrop-blur-sm bg-white/80 hover:shadow-2xl">
            <div className="p-8">
              <div className="flex flex-col items-center space-y-6 lg:flex-row lg:items-start lg:space-y-0 lg:space-x-8">

                <div className="relative flex-shrink-0 group">
                  <div className="w-32 h-32 transition-transform duration-300 transform group-hover:scale-105">
                    {employeeProfile.profileImageUrl && !imageError && (
                      <img 
                        src={employeeProfile.profileImageUrl}
                        alt={typeof employeeProfile.fullname === 'string' ? employeeProfile.fullname : 'Profile'}
                        className="object-cover w-32 h-32 border-4 border-white rounded-full shadow-lg"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                      />
                    )}
                    
                    {(imageLoading || imageError || !employeeProfile.profileImageUrl) && (
                      <div className="flex items-center justify-center w-32 h-32 rounded-full shadow-lg bg-gradient-to-br from-gray-100 to-gray-200">
                        <FaUserCircle className="w-24 h-24 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 transition-opacity duration-300 rounded-full opacity-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 group-hover:opacity-100"></div>
                </div>

                <div className="flex-1 text-center lg:text-left">
                  <h1 className="mb-3 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    {typeof employeeProfile.fullname === 'string' ? employeeProfile.fullname : 
                     typeof employeeProfile.displayName === 'string' ? employeeProfile.displayName : 'ไม่ระบุชื่อ'}
                  </h1>
                  <p className="flex items-center justify-center mb-6 text-xl font-semibold text-blue-600 lg:justify-start">
                    <FaIdCard className="mr-2" />
                    รหัสพนักงาน: {employeeProfile.empId}
                  </p>

                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center p-3 transition-colors duration-200 rounded-lg bg-gray-50 hover:bg-gray-100">
                      <FaUserCircle className="mr-3 text-gray-400" />
                      <div>
                        <span className="block text-xs font-medium text-gray-500">ตำแหน่ง</span>
                        <span className="block text-gray-900">{employeeProfile.position || 'ไม่ระบุ'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-3 transition-colors duration-200 rounded-lg bg-gray-50 hover:bg-gray-100">
                      <FaBuilding className="mr-3 text-gray-400" />
                      <div>
                        <span className="block text-xs font-medium text-gray-500">บริษัท</span>
                        <span className="block text-gray-900">{employeeProfile.company || 'ไม่ระบุ'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-3 transition-colors duration-200 rounded-lg bg-gray-50 hover:bg-gray-100">
                      <FaEnvelope className="mr-3 text-gray-400" />
                      <div>
                        <span className="block text-xs font-medium text-gray-500">อีเมล</span>
                        <span className="block text-gray-900 truncate">{employeeProfile.email || 'ไม่ระบุ'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-3 transition-colors duration-200 rounded-lg bg-gray-50 hover:bg-gray-100">
                      <FaMapMarkerAlt className="mr-3 text-gray-400" />
                      <div>
                        <span className="block text-xs font-medium text-gray-500">ไซต์</span>
                        <span className="block text-gray-900">
                          {typeof employeeProfile.siteId === 'string' ? employeeProfile.siteId : 
                           typeof employeeProfile.site === 'string' ? employeeProfile.site : 'ไม่ระบุ'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Training Records */}
        <div className="overflow-hidden transition-all duration-300 bg-white shadow-xl rounded-2xl backdrop-blur-sm bg-white/80 hover:shadow-2xl">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <h2 className="flex items-center text-xl font-bold text-gray-900">
                <FaArrowDownShortWide className="mr-3 text-blue-600" />
                ประวัติการอบรม
              </h2>        
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-x-3 sm:space-y-0">
              {/* Search and Stats */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <FaSearch className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาหลักสูตร..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64 py-2 pl-10 pr-4 text-sm transition-colors border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
                
                {/* Training Summary Stats - Subtle */}
                {trainingSummary && (
                  <div className="items-center hidden space-x-2 text-xs sm:flex">
                    <span className="inline-flex items-center px-2 py-1 text-gray-600 bg-gray-100 border rounded-md">
                      <FaFileAlt className="w-3 h-3 mr-1" />
                      ทั้งหมด: {trainingSummary.total}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 text-green-700 border border-green-200 rounded-md bg-green-50">
                      <FaEye className="w-3 h-3 mr-1" />
                      ใช้งานได้: {trainingSummary.active}
                    </span>
                    {trainingSummary.expired > 0 && (
                      <span className="inline-flex items-center px-2 py-1 text-red-700 border border-red-200 rounded-md bg-red-50">
                        <FaEyeSlash className="w-3 h-3 mr-1" />
                        หมดอายุ: {trainingSummary.expired}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2"> 
                {/* View Mode Toggle */}
                <div className="flex items-center p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'table' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <FaTable className="w-3 h-3 mr-1" />
                    ตาราง
                  </button>
                  <button
                    onClick={() => setViewMode('card')}
                    className={`flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'card' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <FaThLarge className="w-3 h-3 mr-1" />
                    การ์ด
                  </button>
                </div>
                
                {/* Toggle All Records */}
                {trainingSummary && trainingSummary.expired > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">แสดงทั้งหมด</span>
                    <button
                      onClick={handleToggleRecords}
                      className="flex items-center focus:outline-none group"
                      title={showAllRecords ? "แสดงเฉพาะรายการที่ยังไม่หมดอายุ" : "แสดงประวัติทั้งหมด รวมที่หมดอายุ"}
                    >
                      {showAllRecords ? (
                        <FaToggleOn className="text-2xl text-blue-500 transition-all duration-200 group-hover:text-blue-600" />
                      ) : (
                        <FaToggleOff className="text-2xl text-gray-400 transition-all duration-200 group-hover:text-gray-500" />
                      )}
                    </button>
                  </div>
                )}
              
                {/* Export Button - Subtle */}
                <button
                  onClick={handleExport}
                  disabled={loading.export || !employeeProfile || filteredRecords.length === 0}
                  className="hidden sm:inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500/20 disabled:opacity-50 transition-colors"
                >
                  {loading.export ? (
                    <FaSpinner className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <FaDownload className="w-3 h-3 mr-1" />
                  )}
                  CSV
                </button>              
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Errors */}
            {errors && (
              <ErrorAlert 
                message={errors}
                onRetry={() => fetchAllData(false)}
              />
            )}

            {/* Loading State */}
            {loading.data && (
              <LoadingSpinner message="กำลังโหลดข้อมูล..." />
            )}

            {/* Empty State */}
            {!loading.data && filteredRecords.length === 0 && (
              <div className="py-16 text-center text-gray-500">
                <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200">
                  <FaFileAlt className="text-3xl text-gray-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-800">ไม่พบประวัติการอบรม</h3>
                <p className="mb-4 text-gray-600">
                  {allTrainingRecords.length === 0 
                    ? "ไม่มีข้อมูลการอบรมในระบบ" 
                    : debouncedSearch
                      ? `ไม่พบผลลัพธ์สำหรับ "${debouncedSearch}"`
                      : showAllRecords 
                        ? "ไม่พบข้อมูล"
                        : "ไม่พบประวัติการอบรมที่ยังไม่หมดอายุ"
                  }
                </p>
                {!showAllRecords && trainingSummary && trainingSummary.expired > 0 && !debouncedSearch && (
                  <button
                    onClick={handleToggleRecords}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 transition-all duration-200 transform border border-blue-200 bg-blue-50 rounded-xl hover:bg-blue-100 hover:border-blue-300 hover:scale-105"
                  >
                    <FaEyeSlash className="mr-2" />
                    แสดงประวัติที่หมดอายุ ({trainingSummary.expired} รายการ)
                  </button>
                )}
              </div>
            )}

            {/* Training Records */}
            {!loading.data && filteredRecords.length > 0 && (
              <div className="space-y-6">
                {/* Table View */}
                {viewMode === 'table' && (
                  <div className="overflow-x-auto">
                    <div className="overflow-hidden border border-gray-200 shadow-sm rounded-xl">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                              #
                            </th>
                            <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                              <div className="flex items-center">
                                <FaInfoCircle className="mr-1 text-blue-500" />
                                หลักสูตร
                              </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                              <div className="flex items-center">
                                <FaCalendarAlt className="mr-1 text-green-500" />
                                วันอบรม
                              </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                              สถานะ/หมดอายุ
                            </th>
                            <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                              <div className="flex items-center">
                                <FaFileAlt className="mr-1 text-orange-500" />
                                เอกสาร
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredRecords.map((record, index) => {
                            const isExpired = record.expiryDate && isDateExpired(record.expiryDate);
                            
                            return (
                              <tr 
                                key={record.id} 
                                className={`transition-colors hover:bg-gray-50 ${
                                  isExpired ? 'bg-red-50/30 opacity-75' : ''
                                }`}
                              >
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                                  {index + 1}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="max-w-xs">
                                    <div className={`font-medium text-sm ${isExpired ? 'text-gray-500' : 'text-gray-900'}`}>
                                      {record.courseName || 'ไม่ระบุชื่อหลักสูตร'}
                                    </div>
                                    {isExpired && (
                                      <span className="inline-flex items-center mt-1 px-2 py-0.5 text-xs font-medium text-red-600 bg-red-100 rounded-full">
                                        หมดอายุ
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                  {formatDateShort(record.trainingDate || record.trainingDateFieldValue as DateInput)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {!record.expiryDate ? (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                                      Lifetime
                                    </span>
                                  ) : isExpired ? (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded-full">
                                      {formatDateShort(record.expiryDate)}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                                      {formatDateShort(record.expiryDate)}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {(() => {
                                      const files = record.files || record.certificateURL || record.fileUrls || record.documents;
                                      
                                      if (files && Array.isArray(files) && files.length > 0) {
                                        return files
                                          .filter((fileUrl: string) => fileUrl && fileUrl.trim())
                                          .slice(0, 2)
                                          .map((fileUrl: string, fileIndex: number) => (
                                            <a
                                              key={fileIndex}
                                              href={fileUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center px-2 py-1 text-xs text-blue-600 transition-colors border border-blue-200 rounded bg-blue-50 hover:bg-blue-100"
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
                                            className="inline-flex items-center px-2 py-1 text-xs text-blue-600 transition-colors border border-blue-200 rounded bg-blue-50 hover:bg-blue-100"
                                          >
                                            <FaEye className="w-3 h-3 mr-1" />
                                            ดู
                                          </a>
                                        );
                                      } else if (record.evidenceText && record.evidenceText.trim()) {
                                        return (
                                          <div 
                                            className="inline-flex items-center px-2 py-1 text-xs text-gray-600 truncate border rounded bg-gray-50 max-w-20" 
                                            title={record.evidenceText}
                                          >
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
                  </div>
                )}

                {/* Card View */}
                {viewMode === 'card' && (
                  <div className="space-y-4">
                    {filteredRecords.map((record, index) => {
                      const isExpired = record.expiryDate && isDateExpired(record.expiryDate);
                      
                      return (
                        <div 
                          key={record.id}
                          className={`p-4 rounded-lg border transition-all duration-200 ${
                            isExpired 
                              ? 'bg-red-50/30 border-red-200 opacity-75' 
                              : 'bg-white border-gray-200 hover:shadow-md hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <span className="flex items-center justify-center w-6 h-6 mr-3 text-xs font-bold text-white bg-blue-500 rounded-full">
                                  {index + 1}
                                </span>
                                <h3 className={`font-bold ${isExpired ? 'text-gray-500' : 'text-gray-900'}`}>
                                  {record.courseName || 'ไม่ระบุชื่อหลักสูตร'}
                                </h3>
                              </div>
                              <p className="text-sm text-gray-600">
                                วันที่อบรม: {formatDateShort(record.trainingDate || record.trainingDateFieldValue as DateInput)} 
                                {record.expiryDate && ( <span> | วันหมดอายุ: {formatDateShort(record.expiryDate)}</span>)}
                              </p>
                            </div>
                            <div>
                              {!record.expiryDate ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                                  ตลอดชีพ
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded-full">
                                  หมดอายุ
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                                  ใช้งานได้
                                </span>
                              )}
                            </div>
                          </div>
                          

                          
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const files = record.files || record.certificateURL || record.fileUrls || record.documents;
                              
                              if (files && Array.isArray(files) && files.length > 0) {
                                return files
                                  .filter((fileUrl: string) => fileUrl && fileUrl.trim())
                                  .slice(0, 2)
                                  .map((fileUrl: string, fileIndex: number) => (
                                    <a
                                      key={fileIndex}
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-2 py-1 text-xs text-blue-600 transition-colors border border-blue-200 rounded bg-blue-50 hover:bg-blue-100"
                                    >
                                      <FaFileAlt className="w-3 h-3 mr-1" />
                                      ไฟล์ {fileIndex + 1}
                                    </a>
                                  ));
                              } else if (files && typeof files === 'string' && files.trim()) {
                                return (
                                  <a
                                    href={files}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 text-xs text-blue-600 transition-colors border border-blue-200 rounded bg-blue-50 hover:bg-blue-100"
                                  >
                                    <FaEye className="w-3 h-3 mr-1" />
                                    ดูเอกสาร
                                  </a>
                                );
                              } else if (record.evidenceText && record.evidenceText.trim()) {
                                return (
                                  <div className="px-2 py-1 text-xs text-gray-600 bg-gray-100 border rounded">
                                    {record.evidenceText.length > 30 ? `${record.evidenceText.substring(0, 30)}...` : record.evidenceText}
                                  </div>
                                );
                              }
                              return (
                                <span className="text-xs text-gray-400">ไม่มีเอกสาร</span>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Results Summary */} 
                  <div className="flex items-center space-x-3">
                    {debouncedSearch && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-sm text-blue-600 underline hover:text-blue-700"
                      >
                        ล้างการค้นหา
                      </button>
                    )}                 
                  </div>
                
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg bg-white/80 backdrop-blur-sm">
            <FaInfoCircle className="mr-2 text-blue-500" />
            <span>ระบบจัดการประวัติการอบรม</span>
            <span className="mx-2">•</span>
            <span>อัพเดทล่าสุด: {new Date().toLocaleDateString('th-TH')} | {new Date().toLocaleTimeString('th-TH')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}