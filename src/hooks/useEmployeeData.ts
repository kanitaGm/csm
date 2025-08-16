// ========================================
// 📁 src/hooks/useEmployeeData.ts
// ========================================

import { useState, useCallback } from 'react';
import type { EmployeeProfile } from '../types/employees';
import { useApi } from './useApi';

export interface EmployeeDataOptions {
  enableCache?: boolean;
  onError?: (error: Error) => void;
}

export interface EmployeeDataResult {
  employees: EmployeeProfile[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addEmployee: (employee: Omit<EmployeeProfile, 'id'>) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<EmployeeProfile>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  searchEmployees: (query: string) => EmployeeProfile[];
}

export const useEmployeeData = (options: EmployeeDataOptions = {}): EmployeeDataResult => {
  const { enableCache = true, onError } = options;
  
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);

  // ✅ แก้ไข - สร้าง options object แยกเพื่อหลีกเลี่ยง undefined
  const apiOptions = {
    cacheTime: enableCache ? 5 * 60 * 1000 : 0,
    onSuccess: (data: unknown) => setEmployees((data as EmployeeProfile[]) || []),
    ...(onError && { onError }) // เฉพาะเมื่อมีค่า
  };

  const api = useApi<EmployeeProfile[]>('/api/employees', apiOptions);

  const addEmployee = useCallback(async (employee: Omit<EmployeeProfile, 'id'>): Promise<void> => {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee)
      });

      if (!response.ok) {
        throw new Error(`Failed to add employee: ${response.statusText}`);
      }

      await api.refetch();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      throw err;
    }
  }, [api, onError]);

  const updateEmployee = useCallback(async (id: string, updates: Partial<EmployeeProfile>): Promise<void> => {
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update employee: ${response.statusText}`);
      }

      // Optimistic update
      setEmployees(prev => prev.map(emp => 
        emp.id === id ? { ...emp, ...updates } : emp
      ));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      throw err;
    }
  }, [onError]);

  const deleteEmployee = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete employee: ${response.statusText}`);
      }

      // Optimistic update
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      throw err;
    }
  }, [onError]);

  const searchEmployees = useCallback((query: string): EmployeeProfile[] => {
    if (!query.trim()) return employees;

    const lowercaseQuery = query.toLowerCase();
    return employees.filter(emp => 
      emp.empId?.toLowerCase().includes(lowercaseQuery) ||
      emp.firstName?.toLowerCase().includes(lowercaseQuery) ||
      emp.lastName?.toLowerCase().includes(lowercaseQuery) ||
      emp.email?.toLowerCase().includes(lowercaseQuery) ||
      emp.company?.toLowerCase().includes(lowercaseQuery)
    );
  }, [employees]);

  return {
    employees,
    loading: api.loading,
    error: api.error,
    refresh: api.refetch,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    searchEmployees
  };
};