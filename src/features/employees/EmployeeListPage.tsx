// src/features/employees/EmployeeListPage.tsx - Fixed Version
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { deleteDoc, doc, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { FaPlus, FaSearch, FaFilter, FaEye, FaEdit, FaTrash, FaSpinner } from 'react-icons/fa';
import { EmployeeService } from '../../services/employeeService';
import type { 
  EmployeeProfile, 
  EmployeeFilters, 
  PaginatedResult 
} from '../../services/employeeService';

//type SortField = 'empId' | 'firstName' | 'lastName' | 'company' | 'department' | 'status';
//type SortDirection = 'asc' | 'desc';

interface PaginationState {
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
  loading: boolean;
}

// ✅ Memoized Components for Performance
const EmployeeCard = React.memo<{
  employee: EmployeeProfile;
  canManage: boolean;
  onView: (empId: string) => void;
  onEdit: (empId: string) => void;
  onDelete: (id: string, name: string) => void;
}>(({ employee, canManage, onView, onEdit, onDelete }) => (
  <div className="p-6 transition-all duration-200 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 overflow-hidden bg-gray-200 rounded-full">
          {employee.profileImageUrl ? (
            <img 
              src={employee.profileImageUrl} 
              alt={employee.fullName || `${employee.firstName} ${employee.lastName}`}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-400">
              {(employee.firstName?.[0] || '') + (employee.lastName?.[0] || '')}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">
            {employee.fullName || `${employee.firstName} ${employee.lastName}`}
          </h3>
          <p className="text-sm text-gray-600">{employee.empId}</p>
          <p className="text-sm text-gray-500">{employee.position} • {employee.department}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          employee.status === 'active' 
            ? 'bg-green-100 text-green-800'
            : employee.status === 'inactive'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {employee.status}
        </span>
        
        <div className="flex space-x-1">
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
                onClick={() => onDelete(employee.id, employee.fullName || `${employee.firstName} ${employee.lastName}`)}
                className="p-2 text-red-600 transition-colors rounded-lg hover:text-red-800 hover:bg-red-50"
                title="Delete"
              >
                <FaTrash size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
));

const EmployeeTableRow = React.memo<{
  employee: EmployeeProfile;
  canManage: boolean;
  onView: (empId: string) => void;
  onEdit: (empId: string) => void;
  onDelete: (id: string, name: string) => void;
}>(({ employee, canManage, onView, onEdit, onDelete }) => (
  <tr className="hover:bg-gray-50">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center">
        <div className="w-10 h-10 overflow-hidden bg-gray-200 rounded-full">
          {employee.profileImageUrl ? (
            <img 
              src={employee.profileImageUrl} 
              alt={employee.fullName || `${employee.firstName} ${employee.lastName}`}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-xs text-gray-400">
              {(employee.firstName?.[0] || '') + (employee.lastName?.[0] || '')}
            </div>
          )}
        </div>
        <div className="ml-4">
          <div className="text-sm font-medium text-gray-900">
            {employee.fullName || `${employee.firstName} ${employee.lastName}`}
          </div>
          <div className="text-sm text-gray-500">{employee.empId}</div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{employee.position}</td>
    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{employee.department}</td>
    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{employee.company}</td>
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
              onClick={() => onDelete(employee.id, employee.fullName || `${employee.firstName} ${employee.lastName}`)}
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
));

const LoadingSkeleton = React.memo(() => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="p-6 bg-white border border-gray-200 rounded-lg animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="w-1/4 h-4 bg-gray-300 rounded"></div>
            <div className="w-1/6 h-3 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
));

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

// ✅ Main Component
export default function EmployeeListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Core states
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // UI states
  const [viewMode, setViewMode] = useState<'table' | 'card'>(
    (localStorage.getItem('employeeViewMode') as 'table' | 'card') || 'table'
  );
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<EmployeeFilters>({
    company: searchParams.get('company') || '',
    employeeType: searchParams.get('type') || '',
    status: searchParams.get('status') || 'all',
    department: searchParams.get('dept') || '',
    level: searchParams.get('level') || '',
  });
  
  // Pagination
  const [pagination, setPagination] = useState<PaginationState>({
    hasMore: true,
    lastDoc: null,
    loading: false
  });

  // ✅ Memoized permission check - ensure boolean
  const canManage = useMemo(() => {
    return Boolean(user?.role && ['admin', 'superadmin'].includes(user.role));
  }, [user?.role]);

  // ✅ Optimized data fetching using service
  const fetchEmployees = useCallback(async (isLoadMore = false) => {
    const loadingType = isLoadMore ? 'pagination' : 'initial';
    
    if (loadingType === 'initial') {
      setLoading(true);
      setEmployees([]);
    } else {
      setPagination(prev => ({ ...prev, loading: true }));
    }

    try {
      const result: PaginatedResult<EmployeeProfile> = await EmployeeService.getEmployees({
        filters,
        search: debouncedSearchTerm,
        sortField: 'empId', // Fixed sort field
        sortDirection: 'asc', // Fixed sort direction
        pageSize: 25,
        lastDoc: isLoadMore ? pagination.lastDoc : null,
        useCache: !isLoadMore
      });
      
      if (isLoadMore) {
        setEmployees(prev => [...prev, ...result.data]);
      } else {
        setEmployees(result.data);
      }
      
      setPagination({
        lastDoc: result.lastDoc,
        hasMore: result.hasMore,
        loading: false
      });
      
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Handle error appropriately
    } finally {
      if (loadingType === 'initial') {
        setLoading(false);
      }
    }
  }, [debouncedSearchTerm, filters, pagination.lastDoc]);

  // ✅ Memoized event handlers
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleFilterChange = useCallback((key: keyof EmployeeFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleView = useCallback((empId: string) => {
    navigate(`/employees/${empId}/view`);
  }, [navigate]);

  const handleEdit = useCallback((empId: string) => {
    navigate(`/employees/${empId}/edit`);
  }, [navigate]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteDoc(doc(db, 'employees', id));
        setEmployees(prev => prev.filter(emp => emp.id !== id));
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  }, []);

  const handleLoadMore = useCallback(() => {
    if (pagination.hasMore && !pagination.loading) {
      fetchEmployees(true);
    }
  }, [fetchEmployees, pagination.hasMore, pagination.loading]);

  // ✅ Effects
  useEffect(() => {
    fetchEmployees();
  }, [debouncedSearchTerm, filters, fetchEmployees]); // Removed fetchEmployees from dependency

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
    if (filters.company) params.set('company', filters.company);
    if (filters.employeeType) params.set('type', filters.employeeType);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.department) params.set('dept', filters.department);
    if (filters.level) params.set('level', filters.level);
    
    setSearchParams(params, { replace: true });
  }, [debouncedSearchTerm, filters, setSearchParams]);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('employeeViewMode', viewMode);
  }, [viewMode]);

  // ✅ Render
  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gray-50">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="p-6 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
              <p className="mt-1 text-gray-600">
                {loading ? 'Loading...' : `${employees.length} employees found`}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 space-x-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FaFilter />
                <span>Filters</span>
              </button>
              {canManage && (
                <button
                  onClick={() => navigate('/employees/add')}
                  className="flex items-center px-4 py-2 space-x-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <FaPlus />
                  <span>Add Employee</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="p-6 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <FaSearch className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 text-sm ${
                    viewMode === 'table' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-3 py-2 text-sm ${
                    viewMode === 'card' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cards
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 gap-4 pt-4 mt-4 border-t border-gray-200 md:grid-cols-5">
              <select
                value={filters.company}
                onChange={(e) => handleFilterChange('company', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Companies</option>
                {/* Add company options dynamically */}
              </select>
              
              <select
                value={filters.employeeType}
                onChange={(e) => handleFilterChange('employeeType', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="employee">Employee</option>
                <option value="contractor">Contractor</option>
                <option value="transporter">Transporter</option>
                <option value="driver">Driver</option>
              </select>
              
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blacklist">Blacklist</option>
              </select>
              
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {/* Add department options dynamically */}
              </select>
              
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Levels</option>
                {/* Add level options dynamically */}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton />
            </div>
          ) : employees.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No employees found</p>
            </div>
          ) : (
            <>
              {viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Position
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Department
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Company
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employees.map((employee) => (
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
              ) : (
                <div className="p-6 space-y-4">
                  {employees.map((employee) => (
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
              )}

              {/* Load More Button */}
              {pagination.hasMore && (
                <div className="p-6 text-center border-t border-gray-200">
                  <button
                    onClick={handleLoadMore}
                    disabled={pagination.loading}
                    className="flex items-center justify-center px-6 py-2 mx-auto space-x-2 text-blue-600 transition-colors border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                  >
                    {pagination.loading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <span>Load More</span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}