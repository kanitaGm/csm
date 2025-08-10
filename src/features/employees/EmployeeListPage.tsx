// src/features/employees/EmployeeListPage.tsx - Enhanced Version
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FaPlus, FaSearch, FaFilter, FaEye, FaEdit, FaTrash, 
  FaTh, FaList, FaTable, FaChevronLeft, FaChevronRight, FaUsers,
   FaSortUp, FaSortDown, FaDownload, FaUpload,
  FaUserCircle, FaBuilding,  FaIdCard
} from 'react-icons/fa';
import { EmployeeService } from '../../services/employeeService';
import {  usePagination } from '../../hooks/useVirtualList';
import type {   EmployeeProfile,   EmployeeFilters,    
} from '../../services/employeeService';
//import type {PaginationState,ViewModeOption} from '../../types';

type ViewMode = 'card' | 'table' | 'grid' | 'compact';
type SortField = 'empId' | 'firstName' | 'lastName' | 'company' | 'department' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface ViewModeOption {
  id: ViewMode;
  label: string;
  icon: React.ComponentType;
  description: string;
}


const VIEW_MODES: ViewModeOption[] = [
  { id: 'card', label: 'Cards', icon: FaTh, description: 'Card view with photos' },
  { id: 'table', label: 'Table', icon: FaTable, description: 'Detailed table view' },
  { id: 'grid', label: 'Grid', icon: FaList, description: 'Compact grid layout' },
  { id: 'compact', label: 'Compact', icon: FaUsers, description: 'Dense list view' }
];

// ✅ Custom Hook for Debounced Search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ✅ Enhanced Employee Card Component
const EmployeeCard = React.memo<{
  employee: EmployeeProfile;
  canManage: boolean;
  onView: (empId: string) => void;
  onEdit: (empId: string) => void;
  onDelete: (id: string, name: string) => void;
}>(({ employee, canManage, onView, onEdit, onDelete }) => {
  const fullName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
  
  return (
    <div className="relative transition-all duration-300 bg-white border border-gray-200 shadow-sm group rounded-xl hover:shadow-lg hover:-translate-y-1">
      <div className="p-6">
        {/* Header with Avatar */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative w-16 h-16 overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-purple-300">
              {employee.profileImageUrl ? (
                <img 
                  src={employee.profileImageUrl} 
                  alt={fullName}
                  className="object-cover w-full h-full"
                  loading="lazy"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-lg font-semibold text-white">
                  {(employee.firstName?.[0] || '') + (employee.lastName?.[0] || '')}
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                employee.status === 'active' ? 'bg-green-500' :
                employee.status === 'inactive' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 transition-colors group-hover:text-blue-100">
                {fullName}
              </h3>
              <p className="flex items-center text-sm text-gray-600">
                <FaIdCard className="mr-1" />
                {employee.empId}
              </p>
            </div>
          </div>
          
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            employee.status === 'active' 
              ? 'bg-green-100 text-green-800'
              : employee.status === 'inactive'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {employee.status}
          </span>
        </div>

        {/* Employee Details */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <FaBuilding className="mr-2 text-gray-400" />
            <span className="font-medium">{employee.position}</span>
            <span className="mx-2">•</span>
            <span>{employee.department}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <span>{employee.company}</span>
          </div>
          {employee.email && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="truncate">{employee.email}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 transition-opacity opacity-0 group-hover:opacity-100">
          <button
            onClick={() => onView(employee.empId || '')}
            className="p-2 text-blue-600 transition-colors rounded-lg hover:text-blue-800 hover:bg-blue-50"
            title="View Details"
          >
            <FaEye size={14} />
          </button>
          {canManage && (
            <>
              <button
                onClick={() => onEdit(employee.empId || '')}
                className="p-2 text-yellow-600 transition-colors rounded-lg hover:text-yellow-800 hover:bg-yellow-50"
                title="Edit Employee"
              >
                <FaEdit size={14} />
              </button>
              <button
                onClick={() => onDelete(employee.id, fullName)}
                className="p-2 text-red-600 transition-colors rounded-lg hover:text-red-800 hover:bg-red-50"
                title="Delete Employee"
              >
                <FaTrash size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

// ✅ Enhanced Table Row Component
const EmployeeTableRow = React.memo<{
  employee: EmployeeProfile;
  canManage: boolean;
  onView: (empId: string) => void;
  onEdit: (empId: string) => void;
  onDelete: (id: string, name: string) => void;
}>(({ employee, canManage, onView, onEdit, onDelete }) => {
  const fullName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
  
  return (
    <tr className="transition-colors hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-10 h-10 overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-purple-500">
            {employee.profileImageUrl ? (
              <img 
                src={employee.profileImageUrl} 
                alt={fullName}
                className="object-cover w-full h-full"
                loading="lazy"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-sm font-medium text-white">
                {(employee.firstName?.[0] || '') + (employee.lastName?.[0] || '')}
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{fullName}</div>
            <div className="text-sm text-gray-500">{employee.empId}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{employee.position}</div>
        <div className="text-sm text-gray-500">{employee.department}</div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{employee.company}</td>
      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{employee.email}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
          employee.status === 'active' 
            ? 'bg-green-100 text-green-800'
            : employee.status === 'inactive'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {employee.status}
        </span>
      </td>
      <td className="px-6 py-4 text-center whitespace-nowrap">
        <div className="flex items-center justify-center space-x-1">
          <button
            onClick={() => onView(employee.empId || '')}
            className="p-2 text-blue-600 transition-colors rounded-lg hover:text-blue-800 hover:bg-blue-50"
            title="View"
          >
            <FaEye size={14} />
          </button>
          {canManage && (
            <>
              <button
                onClick={() => onEdit(employee.empId || '')}
                className="p-2 text-yellow-600 transition-colors rounded-lg hover:text-yellow-800 hover:bg-yellow-50"
                title="Edit"
              >
                <FaEdit size={14} />
              </button>
              <button
                onClick={() => onDelete(employee.id, fullName)}
                className="p-2 text-red-600 transition-colors rounded-lg hover:text-red-800 hover:bg-red-50"
                title="Delete"
              >
                <FaTrash size={14} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
});

// ✅ Grid View Component
const EmployeeGridItem = React.memo<{
  employee: EmployeeProfile;
  canManage: boolean;
  onView: (empId: string) => void;
  onEdit: (empId: string) => void;
  onDelete: (id: string, name: string) => void;
}>(({ employee, canManage, onView, onEdit, onDelete }) => {
  const fullName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
  
  return (
    <div className="p-4 transition-all duration-200 bg-white border border-gray-200 rounded-lg group hover:shadow-md">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 w-12 h-12 overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-purple-500">
          {employee.profileImageUrl ? (
            <img 
              src={employee.profileImageUrl} 
              alt={fullName}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full font-medium text-white">
              {(employee.firstName?.[0] || '') + (employee.lastName?.[0] || '')}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
          <p className="text-xs text-gray-500">{employee.empId}</p>
          <p className="text-xs text-gray-500 truncate">{employee.position}</p>
        </div>
        <div className="flex items-center space-x-1 transition-opacity opacity-0 group-hover:opacity-100">
          <button
            onClick={() => onView(employee.empId || '')}
            className="p-1 text-blue-600 rounded hover:bg-blue-50"
          >
            <FaEye size={12} />
          </button>
          {canManage && (
            <>
              <button
                onClick={() => onEdit(employee.empId || '')}
                className="p-1 text-yellow-600 rounded hover:bg-yellow-50"
              >
                <FaEdit size={12} />
              </button>
              <button
                onClick={() => onDelete(employee.id, fullName)}
                className="p-1 text-red-600 rounded hover:bg-red-50"
              >
                <FaTrash size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

// ✅ Compact View Component
const EmployeeCompactItem = React.memo<{
  employee: EmployeeProfile;
  canManage: boolean;
  onView: (empId: string) => void;
  onEdit: (empId: string) => void;
  onDelete: (id: string, name: string) => void;
}>(({ employee, canManage, onView, onEdit, onDelete }) => {
  const fullName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
  
  return (
    <div className="flex items-center justify-between px-4 py-3 transition-colors border-b border-gray-100 hover:bg-gray-50">
      <div className="flex items-center flex-1 min-w-0 space-x-3">
        <div className="flex-shrink-0 w-8 h-8 overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-purple-500">
          {employee.profileImageUrl ? (
            <img 
              src={employee.profileImageUrl} 
              alt={fullName}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-xs font-medium text-white">
              {(employee.firstName?.[0] || '') + (employee.lastName?.[0] || '')}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-4">
            <span className="font-medium text-gray-900">{fullName}</span>
            <span className="text-sm text-gray-500">{employee.empId}</span>
            <span className="text-sm text-gray-500 truncate">{employee.position}</span>
            <span className="text-sm text-gray-500">{employee.company}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 text-xs rounded-full ${
          employee.status === 'active' ? 'bg-green-100 text-green-800' :
          employee.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
        }`}>
          {employee.status}
        </span>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onView(employee.empId || '')}
            className="p-1 text-blue-600 rounded hover:bg-blue-50"
          >
            <FaEye size={12} />
          </button>
          {canManage && (
            <>
              <button
                onClick={() => onEdit(employee.empId || '')}
                className="p-1 text-yellow-600 rounded hover:bg-yellow-50"
              >
                <FaEdit size={12} />
              </button>
              <button
                onClick={() => onDelete(employee.id, fullName)}
                className="p-1 text-red-600 rounded hover:bg-red-50"
              >
                <FaTrash size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

// ✅ Loading Skeleton Components
const CardSkeleton = React.memo(() => (
  <div className="p-6 bg-white border border-gray-200 rounded-xl animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
        <div className="space-y-2">
          <div className="w-32 h-4 bg-gray-300 rounded"></div>
          <div className="w-20 h-3 bg-gray-300 rounded"></div>
        </div>
      </div>
      <div className="w-16 h-6 bg-gray-300 rounded-full"></div>
    </div>
    <div className="space-y-2">
      <div className="w-full h-3 bg-gray-300 rounded"></div>
      <div className="w-3/4 h-3 bg-gray-300 rounded"></div>
    </div>
  </div>
));

const TableSkeleton = React.memo(() => (
  <div className="animate-pulse">
    {Array.from({ length: 10 }).map((_, index) => (
      <div key={index} className="flex items-center px-6 py-4 space-x-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="w-1/4 h-4 bg-gray-300 rounded"></div>
          <div className="w-1/6 h-3 bg-gray-300 rounded"></div>
        </div>
        <div className="w-1/6 h-4 bg-gray-300 rounded"></div>
        <div className="h-4 bg-gray-300 rounded w-1/8"></div>
        <div className="w-16 h-6 bg-gray-300 rounded-full"></div>
        <div className="flex space-x-2">
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
        </div>
      </div>
    ))}
  </div>
));

// ✅ Enhanced Pagination Component
const PaginationControls = React.memo<{
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (page: number) => void;
  loading?: boolean;
  itemsPerPage: number;
  totalItems: number;
}>(({ currentPage, totalPages, hasNextPage, hasPrevPage, onPageChange, loading, itemsPerPage, totalItems }) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
      <div className="flex items-center text-sm text-gray-700">
        <span>
          แสดงรายการที่ {startItem.toLocaleString()} - {endItem.toLocaleString()} จาก {totalItems.toLocaleString()} รายการ
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevPage || loading}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaChevronLeft className="mr-1" size={12} />
          ก่อนหน้า
        </button>
        
        <div className="flex items-center space-x-1">
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' ? onPageChange(page) : undefined}
              disabled={page === '...' || loading}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                page === currentPage
                  ? 'bg-blue-600 text-white'
                  : page === '...'
                  ? 'text-gray-400 cursor-default'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage || loading}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ถัดไป
          <FaChevronRight className="ml-1" size={12} />
        </button>
      </div>
    </div>
  );
});

// ✅ Main Component
export default function EnhancedEmployeeListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Core states
  const [allEmployees, setAllEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // UI states
  const [viewMode, setViewMode] = useState<ViewMode>(
    (localStorage.getItem('employeeViewMode') as ViewMode) || 'card'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('empId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Filters
  const [filters, setFilters] = useState<EmployeeFilters>({
    company: searchParams.get('company') || '',
    employeeType: searchParams.get('type') || '',
    status: searchParams.get('status') || '',
    department: searchParams.get('dept') || '',
    level: searchParams.get('level') || '',
  });

  // ✅ Memoized permission check
  const canManage = useMemo(() => {
    return Boolean(user?.role && ['admin', 'superadmin'].includes(user.role));
  }, [user?.role]);

  // ✅ Filtered and sorted employees
  const filteredEmployees = useMemo(() => {
    let result = [...allEmployees];

    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      result = result.filter(emp => 
        emp.empId?.toLowerCase().includes(searchLower) ||
        emp.firstName?.toLowerCase().includes(searchLower) ||
        emp.lastName?.toLowerCase().includes(searchLower) ||
        emp.email?.toLowerCase().includes(searchLower) ||
        emp.department?.toLowerCase().includes(searchLower) ||
        emp.company?.toLowerCase().includes(searchLower) ||
        emp.position?.toLowerCase().includes(searchLower)
      );
    }

    // Apply filters
    if (filters.company) {
      result = result.filter(emp => emp.company === filters.company);
    }
    if (filters.employeeType) {
      result = result.filter(emp => emp.employeeType === filters.employeeType);
    }
    if (filters.status) {
      result = result.filter(emp => emp.status === filters.status);
    }
    if (filters.department) {
      result = result.filter(emp => emp.department === filters.department);
    }
    if (filters.level) {
      result = result.filter(emp => emp.level === filters.level);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allEmployees, debouncedSearchTerm, filters, sortField, sortDirection]);

  // ✅ Pagination for performance with large datasets
  const itemsPerPage = viewMode === 'compact' ? 50 : viewMode === 'table' ? 25 : 20;
  const {
    paginatedItems: displayEmployees,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage
  } = usePagination(filteredEmployees, itemsPerPage);

  // ✅ Load all employees initially
  const loadAllEmployees = useCallback(async () => {
    setLoading(true);
    try {
      // Load in batches for better performance
      const batchSize = 1000;
      let allData: EmployeeProfile[] = [];
      let hasMore = true;
      let lastDoc = null;

      while (hasMore) {
        const result = await EmployeeService.getEmployees({
          pageSize: batchSize,
          lastDoc,
          useCache: false
        });
        
        allData = [...allData, ...result.data];
        lastDoc = result.lastDoc;
        hasMore = result.hasMore;
        
        // Show progress for large datasets
        if (allData.length > 5000) {
          console.log(`Loaded ${allData.length} employees...`);
        }
      }
      
      setAllEmployees(allData);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Event handlers
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleFilterChange = useCallback((key: keyof EmployeeFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('employeeViewMode', mode);
  }, []);

  const handleView = useCallback((empId: string) => {
    navigate(`/employees/${empId}/view`);
  }, [navigate]);

  const handleEdit = useCallback((empId: string) => {
    navigate(`/employees/${empId}/edit`);
  }, [navigate]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (window.confirm(`คุณต้องการลบพนักงาน ${name} หรือไม่?`)) {
      try {
        await deleteDoc(doc(db, 'employees', id));
        setAllEmployees(prev => prev.filter(emp => emp.id !== id));
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    }
  }, []);

  // ✅ Effects
  useEffect(() => {
    loadAllEmployees();
  }, [loadAllEmployees]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
    if (filters.company) params.set('company', filters.company);
    if (filters.employeeType) params.set('type', filters.employeeType);
    if (filters.status) params.set('status', filters.status);
    if (filters.department) params.set('dept', filters.department);
    if (filters.level) params.set('level', filters.level);
    
    setSearchParams(params, { replace: true });
  }, [debouncedSearchTerm, filters, setSearchParams]);

  // ✅ Render content based on view mode
  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-6">
          {viewMode === 'table' ? <TableSkeleton /> : (
            <div className={`grid gap-6 ${
              viewMode === 'card' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
              viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
              'grid-cols-1'
            }`}>
              {Array.from({ length: 12 }).map((_, index) => (
                <CardSkeleton key={index} />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (displayEmployees.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <FaUsers className="w-16 h-16 mb-4 text-gray-300" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">ไม่พบข้อมูลพนักงาน</h3>
          <p className="max-w-md text-center text-gray-500">
            ลองปรับเกณฑ์การค้นหาหรือกรองข้อมูล หรือเพิ่มพนักงานใหม่
          </p>
          {canManage && (
            <button
              onClick={() => navigate('/employees/add')}
              className="flex items-center px-4 py-2 mt-4 space-x-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <FaPlus />
              <span>เพิ่มพนักงานใหม่</span>
            </button>
          )}
        </div>
      );
    }

    switch (viewMode) {
      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('firstName')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>พนักงาน</span>
                      {sortField === 'firstName' && (
                        sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('department')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>ตำแหน่ง / แผนก</span>
                      {sortField === 'department' && (
                        sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('company')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>บริษัท</span>
                      {sortField === 'company' && (
                        sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    อีเมล
                  </th>
                  <th 
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>สถานะ</span>
                      {sortField === 'status' && (
                        sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">
                    การจัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayEmployees.map((employee) => (
                  <EmployeeTableRow
                    key={employee.id}
                    employee={employee}
                    canManage={canManage}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'card':
        return (
          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                canManage={canManage}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        );

      case 'grid':
        return (
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
            {displayEmployees.map((employee) => (
              <EmployeeGridItem
                key={employee.id}
                employee={employee}
                canManage={canManage}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        );

      case 'compact':
        return (
          <div className="divide-y divide-gray-100">
            {displayEmployees.map((employee) => (
              <EmployeeCompactItem
                key={employee.id}
                employee={employee}
                canManage={canManage}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        
        {/* Enhanced Header */}
        <div className="mb-8 overflow-hidden bg-white border border-gray-200 shadow-lg rounded-2xl">
          <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="text-white">
                <h1 className="text-3xl font-bold">จัดการข้อมูลพนักงาน</h1>
                <p className="mt-2 text-blue-100">
                  {loading ? 'กำลังโหลด...' : `ทั้งหมด ${allEmployees.length.toLocaleString()} คน • แสดง ${filteredEmployees.length.toLocaleString()} คน`}
                </p>
              </div>
              <div className="flex items-center mt-4 space-x-4 lg:mt-0">
                <div className="text-right text-white">
                  <div className="text-2xl font-bold">{allEmployees.length.toLocaleString()}</div>
                  <div className="text-sm text-blue-100">พนักงานทั้งหมด</div>
                </div>
                {canManage && (
                  <button
                    onClick={() => navigate('/employees/add')}
                    className="flex items-center px-6 py-3 space-x-2 font-semibold text-blue-600 transition-colors bg-white rounded-lg shadow-lg hover:bg-blue-50"
                  >
                    <FaPlus />
                    <span>เพิ่มพนักงาน</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="p-6 bg-white border-b border-gray-100">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              
              {/* Search Bar */}
              <div className="flex-1 max-w-2xl">
                <div className="relative">
                  <FaSearch className="absolute text-gray-400 transform -translate-y-1/2 left-4 top-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาพนักงาน (ชื่อ, รหัส, แผนก, บริษัท...)"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full py-3 pl-12 pr-4 transition-all border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => handleSearch('')}
                      className="absolute text-gray-400 transform -translate-y-1/2 right-4 top-1/2 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* View Mode Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-600">มุมมอง:</span>
                <div className="flex p-1 bg-gray-100 rounded-lg">
                  {VIEW_MODES.map((mode) => {
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => handleViewModeChange(mode.id)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                          viewMode === mode.id
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title={mode.description}
                      >
                        <Icon  />
                        <span className="hidden sm:inline">{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center px-4 py-2 space-x-2 rounded-lg border transition-colors ${
                    showFilters
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FaFilter />
                  <span>กรอง</span>
                </button>

                <button
                  className="flex items-center px-4 py-2 space-x-2 text-gray-700 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  title="Export Data"
                >
                  <FaDownload />
                  <span className="hidden sm:inline">Export</span>
                </button>

                {canManage && (
                  <button
                    className="flex items-center px-4 py-2 space-x-2 text-gray-700 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    title="Import Data"
                  >
                    <FaUpload />
                    <span className="hidden sm:inline">Import</span>
                  </button>
                )}
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="p-4 mt-6 border border-gray-200 bg-gray-50 rounded-xl">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">ตัวกรองขั้นสูง</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <select
                    value={filters.company || ''}
                    onChange={(e) => handleFilterChange('company', e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">ทุกบริษัท</option>
                    {/* Add company options dynamically */}
                  </select>
                  
                  <select
                    value={filters.employeeType || ''}
                    onChange={(e) => handleFilterChange('employeeType', e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">ทุกประเภท</option>
                    <option value="employee">พนักงาน</option>
                    <option value="contractor">ผู้รับเหมา</option>
                    <option value="transporter">ขนส่ง</option>
                    <option value="driver">คนขับ</option>
                  </select>
                  
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">ทุกสถานะ</option>
                    <option value="active">ทำงาน</option>
                    <option value="inactive">หยุดงาน</option>
                    <option value="blacklist">แบล็คลิสต์</option>
                  </select>
                  
                  <select
                    value={filters.department || ''}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">ทุกแผนก</option>
                    {/* Add department options dynamically */}
                  </select>
                  
                  <select
                    value={filters.level || ''}
                    onChange={(e) => handleFilterChange('level', e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">ทุกระดับ</option>
                    {/* Add level options dynamically */}
                  </select>
                </div>

                {/* Filter Summary */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    แสดงผล {filteredEmployees.length.toLocaleString()} รายการ จาก {allEmployees.length.toLocaleString()} รายการทั้งหมด
                  </div>
                  <button
                    onClick={() => setFilters({})}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    ล้างตัวกรอง
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="overflow-hidden bg-white border border-gray-200 shadow-lg rounded-2xl">
          {renderContent()}
          
          {/* Pagination */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onPageChange={goToPage}
            loading={loading}
            itemsPerPage={itemsPerPage}
            totalItems={filteredEmployees.length}
          />
        </div>

        {/* Statistics Footer */}
        <div className="grid grid-cols-1 gap-6 mt-8 md:grid-cols-4">
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaUsers className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">พนักงานทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{allEmployees.length.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <FaUserCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">ทำงานอยู่</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allEmployees.filter(emp => emp.status === 'active').length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FaBuilding className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">บริษัท</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(allEmployees.map(emp => emp.company)).size}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="flex items-center">

              <div className="ml-4">
                <p className="text-sm text-gray-600">แผนก</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(allEmployees.map(emp => emp.department)).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}