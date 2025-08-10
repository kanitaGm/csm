// src/services/employeeService.ts - Simple Version (No Complex Types)
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  QueryConstraint,
  DocumentSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { 
  EmployeeProfile, 
  EmployeeFilters, 
  EmployeeFormState
} from '../types';


//  Cache for query results
const queryCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

//  Helper functions
const generateCacheKey = (filters: Record<string, unknown>, pagination: Record<string, unknown> = {}): string => {
  return JSON.stringify({ filters, pagination });
};

const getCachedData = (key: string): unknown => {
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  queryCache.delete(key);
  return null;
};

const setCachedData = (key: string, data: unknown): void => {
  queryCache.set(key, { data, timestamp: Date.now() });
};

interface PaginatedResult<T> {
  data: T[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
  total?: number;
}

interface EmployeeQueryOptions {
  filters?: EmployeeFilters;
  search?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  pageSize?: number;
  lastDoc?: DocumentSnapshot | null;
  useCache?: boolean;
}

interface FilterOptions {
  companies: string[];
  departments: string[];
  levels: string[];
  employeeTypes: string[];
}

//  Main service class
export class EmployeeService {
  
  /**
   * Get employees with advanced filtering, pagination, and caching
   */
  static async getEmployees(options: EmployeeQueryOptions = {}): Promise<PaginatedResult<EmployeeProfile>> {
    const {
      filters = {},
      search = '',
      sortField = 'empId',
      sortDirection = 'asc',
      pageSize = 25,
      lastDoc = null,
      useCache = true
    } = options;

    const cacheKey = generateCacheKey({ filters, search, sortField, sortDirection, pageSize }, { lastDoc: lastDoc?.id });
    
    if (useCache && !lastDoc) {
      const cachedResult = getCachedData(cacheKey) as PaginatedResult<EmployeeProfile> | null;
      if (cachedResult) {
        return cachedResult;
      }
    }

    try {
      const employeesRef = collection(db, 'employees');
      const constraints: QueryConstraint[] = [];

      constraints.push(orderBy(sortField, sortDirection));

      if (search.trim()) {
        constraints.push(where('searchKeywords', 'array-contains', search.toLowerCase().trim()));
      }

      if (filters.company) {
        constraints.push(where('company', '==', filters.company));
      }
      if (filters.employeeType) {
        constraints.push(where('employeeType', '==', filters.employeeType));
      }
      if (filters.status && filters.status !== 'all') {
        constraints.push(where('status', '==', filters.status));
      }
      if (filters.department) {
        constraints.push(where('department', '==', filters.department));
      }
      if (filters.level) {
        constraints.push(where('level', '==', filters.level));
      }

      constraints.push(limit(pageSize));
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(employeesRef, ...constraints);
      const querySnapshot = await getDocs(q);
      
      const employees = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EmployeeProfile));

      const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      const hasMore = querySnapshot.docs.length === pageSize;

      const result: PaginatedResult<EmployeeProfile> = {
        data: employees,
        lastDoc: newLastDoc,
        hasMore
      };

      if (useCache && !lastDoc) {
        setCachedData(cacheKey, result);
      }

      return result;

    } catch (error) {
      console.error('Error fetching employees:', error);
      throw new Error(`Failed to fetch employees: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get single employee by empId
   */
  static async getEmployeeByEmpId(empId: string, useCache: boolean = true): Promise<EmployeeProfile | null> {
    if (!empId) return null;

    const cacheKey = `employee_${empId}`;
    
    if (useCache) {
      const cachedEmployee = getCachedData(cacheKey) as EmployeeProfile | null;
      if (cachedEmployee) {
        return cachedEmployee;
      }
    }

    try {
      const q = query(
        collection(db, 'employees'), 
        where('empId', '==', empId),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return null;
      
      const employee = {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data()
      } as EmployeeProfile;

      if (useCache) {
        setCachedData(cacheKey, employee);
      }

      return employee;

    } catch (error) {
      console.error('Error fetching employee by empId:', error);
      throw new Error(`Failed to fetch employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get employee by document ID
   */
  static async getEmployeeById(id: string): Promise<EmployeeProfile | null> {
    if (!id) return null;

    try {
      const docRef = doc(db, 'employees', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as EmployeeProfile;

    } catch (error) {
      console.error('Error fetching employee by ID:', error);
      throw new Error(`Failed to fetch employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add new employee
   */
  static async addEmployee(data: EmployeeFormState): Promise<string> {
    try {
      if (!data.empId || !data.firstName || !data.lastName) {
        throw new Error('Required fields missing: empId, firstName, lastName');
      }

      const existingEmployee = await this.getEmployeeByEmpId(data.empId, false);
      if (existingEmployee) {
        throw new Error(`Employee with ID ${data.empId} already exists`);
      }

      const employeeData = {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        searchKeywords: this.createSearchKeywords(data)
      };

      const docRef = await addDoc(collection(db, 'employees'), employeeData);
      this.clearEmployeeCache();
      
      return docRef.id;

    } catch (error) {
      console.error('Error adding employee:', error);
      throw new Error(`Failed to add employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update employee
   */
  static async updateEmployee(empId: string, data: Partial<EmployeeFormState>): Promise<void> {
    try {
      const employee = await this.getEmployeeByEmpId(empId, false);
      if (!employee) {
        throw new Error(`Employee with ID ${empId} not found`);
      }

      // Create clean merged data for search keywords
      const cleanedEmployeeData: Partial<EmployeeFormState> = {};
      
      // Only copy EmployeeFormState fields from employee
      const formStateFields = [
        'empId', 'idCard', 'employeeType', 'status', 'email', 'firstName', 'lastName',
        'level', 'prefix', 'displayName', 'nickname', 'phoneNumber', 'address',
        'profileImageUrl', 'position', 'companyId', 'company', 'department',
        'countryId', 'zoneId', 'siteId', 'plantId', 'dateOfBirth', 'startDate',
        'cardExpiryDate', 'lastUpdateBy'
      ] as const;

      formStateFields.forEach(field => {
        if (field in employee && employee[field] !== null && employee[field] !== undefined) {
          (cleanedEmployeeData as Record<string, unknown>)[field] = employee[field];
        }
      });

      // Merge with update data
      const mergedData = { ...cleanedEmployeeData, ...data };

      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
        searchKeywords: this.createSearchKeywords(mergedData)
      };

      await updateDoc(doc(db, 'employees', employee.id), updateData);
      this.clearEmployeeCache(empId);

    } catch (error) {
      console.error('Error updating employee:', error);
      throw new Error(`Failed to update employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete employee
   */
  static async deleteEmployee(empId: string): Promise<void> {
    try {
      const employee = await this.getEmployeeByEmpId(empId, false);
      if (!employee) {
        throw new Error(`Employee with ID ${empId} not found`);
      }

      await deleteDoc(doc(db, 'employees', employee.id));
      this.clearEmployeeCache(empId);

    } catch (error) {
      console.error('Error deleting employee:', error);
      throw new Error(`Failed to delete employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch add employees
   */
  static async batchAddEmployees(employees: EmployeeFormState[]): Promise<{ success: number; errors: string[] }> {
    const errors: string[] = [];
    let success = 0;

    try {
      const batch = writeBatch(db);
      
      for (let i = 0; i < employees.length; i++) {
        const employeeData = employees[i];
        
        try {
          if (!employeeData.empId || !employeeData.firstName || !employeeData.lastName) {
            throw new Error(`Row ${i + 1}: Missing required fields`);
          }

          const existingEmployee = await this.getEmployeeByEmpId(employeeData.empId, false);
          if (existingEmployee) {
            throw new Error(`Row ${i + 1}: Employee ID ${employeeData.empId} already exists`);
          }

          const docData = {
            ...employeeData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            searchKeywords: this.createSearchKeywords(employeeData)
          };

          const docRef = doc(collection(db, 'employees'));
          batch.set(docRef, docData);
          success++;

        } catch (error) {
          errors.push(error instanceof Error ? error.message : `Row ${i + 1}: Unknown error`);
        }
      }

      if (success > 0) {
        await batch.commit();
      }

      this.clearEmployeeCache();
      return { success, errors };

    } catch (error) {
      console.error('Error in batch add employees:', error);
      throw new Error(`Batch operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get filter options
   */
  static async getFilterOptions(): Promise<FilterOptions> {
    const cacheKey = 'filter_options';
    
    const cachedOptions = getCachedData(cacheKey) as FilterOptions | null;
    if (cachedOptions) {
      return cachedOptions;
    }

    try {
      const employeesSnapshot = await getDocs(
        query(collection(db, 'employees'), limit(1000))
      );

      const companies = new Set<string>();
      const departments = new Set<string>();
      const levels = new Set<string>();
      const employeeTypes = new Set<string>();

      employeesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.company) companies.add(data.company);
        if (data.department) departments.add(data.department);
        if (data.level) levels.add(data.level);
        if (data.employeeType) employeeTypes.add(data.employeeType);
      });

      const result: FilterOptions = {
        companies: Array.from(companies).sort(),
        departments: Array.from(departments).sort(),
        levels: Array.from(levels).sort(),
        employeeTypes: Array.from(employeeTypes).sort()
      };

      setCachedData(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Error fetching filter options:', error);
      return {
        companies: [],
        departments: [],
        levels: [],
        employeeTypes: ['employee', 'contractor', 'transporter', 'driver']
      };
    }
  }

  // Helper methods
  private static createSearchKeywords(data: Partial<EmployeeFormState>): string[] {
    const keywords = new Set<string>();
    
    const fields: (string | undefined)[] = [
      data.empId,
      data.firstName,
      data.lastName,
      data.displayName,
      data.nickname,
      data.email,
      data.department,
      data.position,
      data.company
    ];

    fields.forEach(field => {
      if (field && typeof field === 'string') {
        keywords.add(field.toLowerCase().trim());
        field.toLowerCase().split(/\s+/).forEach(word => {
          if (word.length > 1) {
            keywords.add(word);
          }
        });
      }
    });

    return Array.from(keywords);
  }

  private static clearEmployeeCache(empId?: string): void {
    if (empId) {
      queryCache.delete(`employee_${empId}`);
    }
    
    const keysToDelete = Array.from(queryCache.keys()).filter(key => 
      key.includes('filters') || key === 'filter_options'
    );
    
    keysToDelete.forEach(key => queryCache.delete(key));
  }
}

// Export legacy functions for backward compatibility
export const getAllEmployees = () => EmployeeService.getEmployees();
export const getEmployeeByEmpId = (empId: string) => EmployeeService.getEmployeeByEmpId(empId);
export const addEmployee = (data: EmployeeFormState) => EmployeeService.addEmployee(data);
export const updateEmployee = (empId: string, data: Partial<EmployeeFormState>) => 
  EmployeeService.updateEmployee(empId, data);
export const deleteEmployee = (empId: string) => EmployeeService.deleteEmployee(empId);

// Export types
export type { EmployeeProfile, EmployeeFilters, EmployeeFormState, FilterOptions, PaginatedResult };