// src/pages/employees/EmployeeListPage.tsx

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, getDocs, query, where, doc, deleteDoc, limit, startAfter, orderBy, QueryConstraint,  QueryDocumentSnapshot } from 'firebase/firestore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaSearch, FaUserPlus, FaUserCircle, FaEdit, FaEye, FaTrash, FaFilter, FaTable, FaTh, FaChevronLeft, FaChevronRight,  FaUpload, FaSortAmountDown, FaSortAmountUp, FaRedo, FaTimes } from 'react-icons/fa';
import type { EmployeeProfile, FilterState, } from '../../types/';

type SortField = 'empId' | 'fullName' | 'company' | 'department' | 'startDate';
type SortDirection = 'asc' | 'desc';

interface PaginationState {
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  pageSnapshots: Map<number, QueryDocumentSnapshot>;
}

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Core data states
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [filters, setFilters] = useState<FilterState>({
    company: searchParams.get('company') || '',
    employeeType: searchParams.get('type') || '',
    status: searchParams.get('status') || 'all',
    department: searchParams.get('dept') || '',
    level: searchParams.get('level') || '',
  });
  
  // UI states
  const [viewMode, setViewMode] = useState<'table' | 'card'>(
    (localStorage.getItem('employeeViewMode') as 'table' | 'card') || 'table'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('empId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Pagination states
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    hasNextPage: false,
    hasPrevPage: false,
    pageSnapshots: new Map(),
  });
  
  const pageSize = 25;
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Dynamic filter options
  const [filterOptions, setFilterOptions] = useState({
    companies: [] as string[],
    departments: [] as string[],
    levels: [] as string[],
    employeeTypes: ['employee', 'contractor', 'transporter', 'driver'],
    statuses: ['active', 'inactive', 'blacklist', 'pending'],
  });

  // Check admin permissions
  const canManage = useMemo(() => {
    return user?.role && ['admin', 'superadmin'].includes(user.role);
  }, [user]);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Update URL params when filters change
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

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('employeeViewMode', viewMode);
  }, [viewMode]);

  // Build optimized query
  const buildQuery = useCallback((pageNumber: number = 1) => {
    const employeesRef = collection(db, 'employees');
    const constraints: QueryConstraint[] = [];

    // Add sorting
    constraints.push(orderBy(sortField, sortDirection));

    // Add search constraints
    if (debouncedSearchTerm.trim()) {
      constraints.push(where('searchKeywords', 'array-contains', debouncedSearchTerm.toLowerCase()));
    }

    // Add filter constraints
    if (filters.company) constraints.push(where('company', '==', filters.company));
    if (filters.employeeType) constraints.push(where('employeeType', '==', filters.employeeType));
    if (filters.status) constraints.push(where('status', '==', filters.status));
    if (filters.department) constraints.push(where('department', '==', filters.department));
    if (filters.level) constraints.push(where('level', '==', filters.level));

    // Add pagination
    constraints.push(limit(pageSize));
    
    if (pageNumber > 1) {
      const snapshot = pagination.pageSnapshots.get(pageNumber - 1);
      if (snapshot) {
        constraints.push(startAfter(snapshot));
      }
    }

    return query(employeesRef, ...constraints);
  }, [debouncedSearchTerm, filters, sortField, sortDirection, pagination.pageSnapshots]);

  // Fetch data with caching
  const fetchData = useCallback(async (pageNumber: number = 1, useCache: boolean = true) => {    
    setLoading(true);
    
    try {
      const q = buildQuery(pageNumber);
      const querySnapshot = await getDocs(q);
      
      const fetchedEmployees = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EmployeeProfile));
      
      setEmployees(fetchedEmployees);
      
      // Update pagination state
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      if (lastDoc) {
        setPagination(prev => ({
          ...prev,
          currentPage: pageNumber,
          hasNextPage: querySnapshot.docs.length === pageSize,
          hasPrevPage: pageNumber > 1,
          pageSnapshots: new Map(prev.pageSnapshots).set(pageNumber, lastDoc),
        }));
      }
      
      // Estimate total count (for display purposes)
      if (pageNumber === 1) {
        const estimatedTotal = querySnapshot.docs.length < pageSize 
          ? querySnapshot.docs.length 
          : querySnapshot.docs.length * 10; // Rough estimate
        setTotalCount(estimatedTotal);
      }
      
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  // Load filter options
  const loadFilterOptions = useCallback(async () => {
    try {
      // Get a sample of employees to extract unique values
      const sampleQuery = query(collection(db, 'employees'), limit(1000));
      const snapshot = await getDocs(sampleQuery);
      
      const companies = new Set<string>();
      const departments = new Set<string>();
      const levels = new Set<string>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.company) companies.add(data.company);
        if (data.department) departments.add(data.department);
        if (data.level) levels.add(data.level);
      });
      
      setFilterOptions(prev => ({
        ...prev,
        companies: Array.from(companies).sort(),
        departments: Array.from(departments).sort(),
        levels: Array.from(levels).sort(),
      }));
    } catch (error) {
      console.error("Error loading filter options:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadFilterOptions();
    fetchData(1);
    setPagination(prev => ({ ...prev, currentPage: 1, pageSnapshots: new Map() }));
  }, [debouncedSearchTerm, filters, sortField, sortDirection, fetchData, loadFilterOptions]);

  // Event handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setSelectedEmployees(new Set()); // Clear selections when filters change
  };

  const clearFilters = () => {
    setFilters({
      company: '',
      employeeType: '',
      status: '',
      department: '',
      level: '',
    });
    setSearchTerm('');
    setSelectedEmployees(new Set());
  };

  const handleBulkAction = async (action: 'delete' | 'activate' | 'deactivate') => {
    if (!canManage || selectedEmployees.size === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${selectedEmployees.size} selected employee(s)?`
    );
    
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const promises = Array.from(selectedEmployees).map(async (employeeId) => {
        if (action === 'delete') {
          return deleteDoc(doc(db, "employees", employeeId));
        }
        // Add other bulk actions here
      });
      
      await Promise.all(promises);
      setSelectedEmployees(new Set());
      fetchData(pagination.currentPage);
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      alert(`Failed to ${action} selected employees. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmployees.size === employees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map(emp => emp.id)));
    }
  };

  const handleSelectEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  // Navigation handlers
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && (pageNumber === 1 || pagination.pageSnapshots.has(pageNumber - 1))) {
      fetchData(pageNumber);
    }
  };

  const handleDelete = async (employeeId: string, employeeName: string) => {
    if (!canManage) {
      alert("You don't have permission to delete.");
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${employeeName}?`)) {
      try {
        setLoading(true);
        await deleteDoc(doc(db, "employees", employeeId));
        fetchData(pagination.currentPage);
      } catch (error) {
        console.error("Error deleting employee:", error);
        alert("Failed to delete employee. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Enhanced Card component
  const EmployeeCard = ({ employee }: { employee: EmployeeProfile }) => (
    <div className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-l-4 ${
      employee.status === 'active' ? 'border-green-500' : 
      employee.status === 'inactive' ? 'border-yellow-500' : 'border-red-500'
    } ${selectedEmployees.has(employee.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {canManage && (
              <input
                type="checkbox"
                checked={selectedEmployees.has(employee.id)}
                onChange={() => handleSelectEmployee(employee.id)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            )}
            
            <div className="relative">
              {employee.profileImageUrl ? (
                <img 
                  className="object-cover w-16 h-16 rounded-full ring-2 ring-gray-200" 
                  src={employee.profileImageUrl} 
                  alt={employee.fullName || `${employee.firstName} ${employee.lastName}`} 
                />
              ) : (
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600">
                  <FaUserCircle className="w-10 h-10 text-white" />
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white ${
                employee.status === 'active' ? 'bg-green-500' : 
                employee.status === 'inactive' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {employee.fullName || `${employee.firstName} ${employee.lastName}`}
              </h3>
              <p className="text-sm font-medium text-gray-600">{employee.empId}</p>
              <p className="text-sm text-gray-500">{employee.position}</p>
              {employee.department && (
                <p className="text-xs text-gray-400">{employee.department}</p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
              employee.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : employee.status === 'inactive'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {employee.status}
            </span>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => navigate(`/employees/${employee.empId}/view`)}
                className="p-2 text-blue-600 transition-colors rounded-lg hover:text-blue-800 hover:bg-blue-50"
                title="View"
              >
                <FaEye size={14} />
              </button>
              {canManage && (
                <>
                  <button
                    onClick={() => navigate(`/employees/${employee.empId}/edit`)}
                    className="p-2 text-yellow-600 transition-colors rounded-lg hover:text-yellow-800 hover:bg-yellow-50"
                    title="Edit"
                  >
                    <FaEdit size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(employee.id, employee.fullName || `${employee.firstName} ${employee.lastName}`)}
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
        
        <div className="pt-4 mt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Company:</span>
              <p className="font-medium text-gray-900 truncate">{employee.company}</p>
            </div>
            <div>
              <span className="text-gray-500">Type:</span>
              <p className="font-medium text-gray-900">{employee.employeeType}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Table Row component
  const TableRow = ({ employee }: { employee: EmployeeProfile }) => (
    <tr className={`hover:bg-gray-50 transition-colors ${
      selectedEmployees.has(employee.id) ? 'bg-blue-50' : ''
    }`}>
      {canManage && (
        <td className="px-6 py-4 whitespace-nowrap">
          <input
            type="checkbox"
            checked={selectedEmployees.has(employee.id)}
            onChange={() => handleSelectEmployee(employee.id)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-3">
          <div className="relative">
            {employee.profileImageUrl ? (
              <img 
                className="object-cover w-10 h-10 rounded-full" 
                src={employee.profileImageUrl} 
                alt={employee.fullName || `${employee.firstName} ${employee.lastName}`} 
              />
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600">
                <FaUserCircle className="w-6 h-6 text-white" />
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border border-white ${
              employee.status === 'active' ? 'bg-green-500' : 
              employee.status === 'inactive' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {employee.fullName || `${employee.firstName} ${employee.lastName}`}
            </div>
            <div className="text-sm text-gray-500">{employee.empId}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{employee.position}</div>
        {employee.department && (
          <div className="text-sm text-gray-500">{employee.department}</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-900">{employee.employeeType}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-900">{employee.company}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
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
            onClick={() => navigate(`/employees/${employee.empId}/view`)}
            className="p-2 text-blue-600 transition-colors rounded-lg hover:text-blue-800 hover:bg-blue-50"
            title="View"
          >
            <FaEye size={14} />
          </button>
          {canManage && (
            <>
              <button
                onClick={() => navigate(`/employees/${employee.empId}/edit`)}
                className="p-2 text-yellow-600 transition-colors rounded-lg hover:text-yellow-800 hover:bg-yellow-50"
                title="Edit"
              >
                <FaEdit size={14} />
              </button>
              <button
                onClick={() => handleDelete(employee.id, employee.fullName || `${employee.firstName} ${employee.lastName}`)}
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

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gray-50">
      <div className="container mx-auto max-w-7xl">
        {/* Enhanced Header */}
        <div className="p-6 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
              <p className="mt-1 text-gray-600">
                {loading ? 'Loading...' : `${employees.length} of ${totalCount}+ employees`}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {canManage && selectedEmployees.size > 0 && (
                <div className="flex items-center px-3 py-2 space-x-2 border border-blue-200 rounded-lg bg-blue-50">
                  <span className="text-sm font-medium text-blue-700">
                    {selectedEmployees.size} selected
                  </span>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="p-1 text-red-600 rounded hover:text-red-800"
                    title="Delete selected"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              )}
              
              {canManage && (
                <>
                  <button 
                    onClick={() => navigate('/employees/import')} 
                    className="flex items-center px-4 py-2 font-semibold text-white transition-colors bg-green-600 rounded-lg shadow-sm hover:bg-green-700"
                  >
                    <FaUpload className="mr-2" /> Import
                  </button>
                  <button 
                    onClick={() => navigate('/employees/add')} 
                    className="flex items-center px-4 py-2 font-semibold text-white transition-colors bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700"
                  >
                    <FaUserPlus className="mr-2" /> Add Employee
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filter Bar */}
        <div className="p-6 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex flex-col gap-4 mb-4 lg:flex-row">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FaSearch className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by ID, name, email, position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-3 pl-10 pr-4 transition-colors border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  <FaTimes className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 space-x-2 bg-gray-100 rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                title="Table View"
              >
                <FaTable />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'card' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                title="Card View"
              >
                <FaTh />
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaFilter />
              <span>Filters</span>
              {Object.values(filters).some(f => f) && (
                <span className="flex items-center justify-center w-5 h-5 text-xs text-white bg-blue-500 rounded-full">
                  {Object.values(filters).filter(f => f).length}
                </span>
              )}
            </button>

            <button
              onClick={() => fetchData(pagination.currentPage, false)}
              className="p-2 text-gray-600 transition-colors rounded-lg hover:text-gray-800 hover:bg-gray-100"
              title="Refresh"
            >
              <FaRedo />
            </button>
          </div>

          {/* Enhanced Filters */}
          {showFilters && (
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2 lg:grid-cols-5">
                <select
                  value={filters.company}
                  onChange={(e) => handleFilterChange('company', e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Companies</option>
                  {filterOptions.companies.map(company => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>

                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Departments</option>
                  {filterOptions.departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                <select
                  value={filters.employeeType}
                  onChange={(e) => handleFilterChange('employeeType', e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  {filterOptions.employeeTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  {filterOptions.statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>

                <select
                  value={filters.level}
                  onChange={(e) => handleFilterChange('level', e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Levels</option>
                  {filterOptions.levels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  onClick={clearFilters}
                  className="flex items-center px-4 py-2 space-x-2 text-gray-600 transition-colors rounded-lg hover:text-gray-800 hover:bg-gray-100"
                >
                  <FaTimes />
                  <span>Clear All Filters</span>
                </button>
                
                <div className="text-sm text-gray-500">
                  {Object.values(filters).filter(f => f).length} filter(s) active
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Results Info */}
        <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
          <div className="text-sm text-gray-600">
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
                <span>Loading employees...</span>
              </div>
            ) : (
              <span>
                Showing <span className="font-medium">{employees.length}</span> employees
                {totalCount > employees.length && (
                  <span> of <span className="font-medium">{totalCount}+</span> total</span>
                )}
              </span>
            )}
          </div>
          
          {/* Enhanced Pagination */}
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              Page {pagination.currentPage}
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={!pagination.hasPrevPage}
                className="p-2 text-gray-600 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="First page"
              >
                <FaChevronLeft />
                <FaChevronLeft className="-ml-1" />
              </button>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="p-2 text-gray-600 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <FaChevronLeft />
              </button>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="p-2 text-gray-600 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next page"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Content */}
        {loading ? (
          <div className="p-8 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin"></div>
              <p className="text-gray-600">Loading employees...</p>
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="max-w-md mx-auto">
              <FaUserCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">No employees found</h3>
              <p className="mb-4 text-gray-600">
                {debouncedSearchTerm || Object.values(filters).some(f => f) 
                  ? "Try adjusting your search or filters" 
                  : "Get started by adding your first employee"
                }
              </p>
              {canManage && (
                <div className="flex justify-center space-x-3">
                  {(debouncedSearchTerm || Object.values(filters).some(f => f)) && (
                    <button 
                      onClick={clearFilters}
                      className="px-4 py-2 text-gray-600 transition-colors rounded-lg hover:text-gray-800 hover:bg-gray-100"
                    >
                      Clear filters
                    </button>
                  )}
                  <button 
                    onClick={() => navigate('/employees/add')} 
                    className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Add Employee
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Table View */}
            {viewMode === 'table' && (
              <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {canManage && (
                          <th className="px-6 py-4 text-left">
                            <input
                              type="checkbox"
                              checked={selectedEmployees.size === employees.length && employees.length > 0}
                              onChange={handleSelectAll}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </th>
                        )}
                        <th className="px-6 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          <button
                            onClick={() => handleSort('fullName')}
                            className="flex items-center space-x-1 hover:text-gray-700"
                          >
                            <span>Employee</span>
                            {sortField === 'fullName' && (
                              sortDirection === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Position
                        </th>
                        <th className="px-6 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          <button
                            onClick={() => handleSort('company')}
                            className="flex items-center space-x-1 hover:text-gray-700"
                          >
                            <span>Company</span>
                            {sortField === 'company' && (
                              sortDirection === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-4 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employees.map((emp) => (
                        <TableRow key={emp.id} employee={emp} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Card View */}
            {viewMode === 'card' && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {employees.map((emp) => (
                  <EmployeeCard key={emp.id} employee={emp} />
                ))}
              </div>
            )}

            {/* Load More Button for better UX */}
            {pagination.hasNextPage && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={loading}
                  className="px-6 py-3 text-gray-700 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-b-2 border-gray-600 rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}