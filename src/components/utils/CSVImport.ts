// src/components/utils/useCSVImport.ts

import { useState, useCallback } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface DuplicateCheck {
  rowIndex: number;
  empId?: string;
  idCard?: string;
  email?: string;
  duplicateType: 'database' | 'csv';
  duplicateFields: string[];
}

export interface ImportResults {
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export interface EditableData {
  [key: string]: unknown;
}

export interface ImportConfig {
  collectionName: string;
  duplicateCheckFields: string[];
  requiredFields: string[];
  dataTransformer?: (row: unknown, index: number) => unknown;
  batchSize?: number;
}

// Type guard functions
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};
/*
const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};*/

export const useCSVImport = (config: ImportConfig) => {
  // States
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateChecks, setDuplicateChecks] = useState<DuplicateCheck[]>([]);
  const [importResults, setImportResults] = useState<ImportResults>({
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  });
  const [editedData, setEditedData] = useState<Map<string, EditableData>>(new Map());

  // Batch check duplicates against database
  const checkDuplicatesInBatch = useCallback(async (
    values: string[], 
    field: string
  ): Promise<Set<string>> => {
    const results = new Set<string>();
    const batchSize = 10; // Firebase 'in' operator limit
    
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      if (batch.length === 0) continue;
      
      try {
        const q = query(collection(db, config.collectionName), where(field, 'in', batch));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          const data = doc.data();
          const value = field === 'empId' 
            ? String(data[field] || '').toLowerCase().trim()
            : String(data[field] || '').trim();
          if (value) results.add(value);
        });
      } catch (error: unknown) {
        console.error(`Error checking ${field} batch:`, error);
      }
    }
    
    return results;
  }, [config.collectionName]);

  // Get field value with edit consideration
  const getFieldValue = useCallback((
    row: unknown, 
    headers: string[], 
    fieldType: string, 
    rowIndex: number
  ): string => {
    if (!isRecord(row)) return '';
    
    const editKey = `${rowIndex}`;
    const edits = editedData.get(editKey) || {};
    
    // Find appropriate header for field type
    let header = '';
    const fieldMappings: { [key: string]: string[] } = {
      empId: ['empid', 'employee id', 'employee_id', 'emp_id'],
      idCard: ['idcard', 'id card', 'id_card', 'card_id'],
      email: ['email', 'e-mail', 'email_address'],
      firstName: ['firstname', 'first name', 'first_name', 'fname'],
      lastName: ['lastname', 'last name', 'last_name', 'lname'],
      phone: ['phone', 'telephone', 'mobile', 'phone_number']
    };

    const searchTerms = fieldMappings[fieldType] || [fieldType];
    header = headers.find(h => 
      searchTerms.some(term => h.toLowerCase().includes(term))
    ) || '';
    
    if (edits[header] !== undefined) {
      return String(edits[header]);
    }
    
    const rowValue = row[header];
    return String(rowValue || '');
  }, [editedData]);

  // Enhanced duplicate checking
  const checkForDuplicates = useCallback(async (
    data: unknown[], 
    headers: string[]
  ): Promise<DuplicateCheck[]> => {
    if (data.length === 0) return [];

    setIsCheckingDuplicates(true);
    const duplicates: DuplicateCheck[] = [];

    try {
      // Prepare data for checking
      const fieldData: { [key: string]: string[] } = {};
      config.duplicateCheckFields.forEach(field => {
        fieldData[field] = [...new Set(
          data.map((row, index) => 
            getFieldValue(row, headers, field, index)
          ).filter(Boolean).map(val => 
            field === 'empId' ? val.toLowerCase().trim() : val.trim()
          )
        )];
      });

      // Batch check against database
      const existingData: { [key: string]: Set<string> } = {};
      await Promise.all(
        config.duplicateCheckFields.map(async (field) => {
          existingData[field] = await checkDuplicatesInBatch(fieldData[field], field);
        })
      );

      // Track duplicates within CSV
      const csvData: { [key: string]: Map<string, number> } = {};
      config.duplicateCheckFields.forEach(field => {
        csvData[field] = new Map<string, number>();
      });

      // Check each row
      data.forEach((row, index) => {
        const duplicateFields: string[] = [];
        const csvDuplicateFields: string[] = [];
        const fieldValues: { [key: string]: string } = {};

        // Get field values
        config.duplicateCheckFields.forEach(field => {
          fieldValues[field] = getFieldValue(row, headers, field, index);
        });

        // Check against database
        config.duplicateCheckFields.forEach(field => {
          const value = fieldValues[field];
          if (!value) return;

          const normalizedValue = field === 'empId' 
            ? value.toLowerCase().trim() 
            : value.trim();

          if (existingData[field]?.has(normalizedValue)) {
            duplicateFields.push(field);
          }
        });

        // Check within CSV
        config.duplicateCheckFields.forEach(field => {
          const value = fieldValues[field];
          if (!value) return;

          const normalizedValue = field === 'empId' 
            ? value.toLowerCase().trim() 
            : value.trim();

          if (csvData[field].has(normalizedValue)) {
            csvDuplicateFields.push(field);
          } else {
            csvData[field].set(normalizedValue, index);
          }
        });

        // Add database duplicates
        if (duplicateFields.length > 0) {
          duplicates.push({
            rowIndex: index,
            ...fieldValues,
            duplicateType: 'database',
            duplicateFields
          });
        }

        // Add CSV duplicates
        if (csvDuplicateFields.length > 0) {
          duplicates.push({
            rowIndex: index,
            ...fieldValues,
            duplicateType: 'csv',
            duplicateFields: csvDuplicateFields
          });
        }
      });

      return duplicates;
    } catch (error: unknown) {
      console.error('Error checking duplicates:', error);
      throw new Error('Failed to check for duplicates');
    } finally {
      setIsCheckingDuplicates(false);
    }
  }, [config, getFieldValue, checkDuplicatesInBatch]);

  // Update cell value
  const updateCellValue = useCallback((
    rowIndex: number, 
    field: string, 
    value: string
  ) => {
    const editKey = `${rowIndex}`;
    const currentEdits = editedData.get(editKey) || {};
    const newEdits = { ...currentEdits, [field]: value };
    
    const newEditedData = new Map(editedData);
    newEditedData.set(editKey, newEdits);
    setEditedData(newEditedData);
  }, [editedData]);

  // Get current data with edits applied
  const getCurrentData = useCallback((originalData: unknown[]) => {
    return originalData.map((row, index) => {
      if (!isRecord(row)) return row;
      
      const editKey = `${index}`;
      const edits = editedData.get(editKey) || {};
      return { ...row, ...edits };
    });
  }, [editedData]);

  // Import data with progress tracking
  const importData = useCallback(async (
    dataToImport: unknown[],
    userEmail: string = 'unknown'
  ): Promise<ImportResults> => {
    setIsImporting(true);
    setImportProgress(0);
    setImportComplete(false);

    const results: ImportResults = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const batchSize = config.batchSize || 10;

    try {
      for (let i = 0; i < dataToImport.length; i += batchSize) {
        const batch = dataToImport.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (record, batchIndex) => {
            const actualIndex = i + batchIndex;
            
            try {
              // Transform data if transformer provided
              const transformedData = config.dataTransformer 
                ? config.dataTransformer(record, actualIndex)
                : isRecord(record) 
                  ? { ...record, lastUpdateBy: userEmail }
                  : { data: record, lastUpdateBy: userEmail };

              await addDoc(collection(db, config.collectionName), transformedData as Record<string, unknown>);
              results.success++;
            } catch (error: unknown) {
              console.error(`Error importing record ${actualIndex + 1}:`, error);
              results.failed++;
              const errorMessage = error instanceof Error ? error.message : 'Import failed';
              results.errors.push(`Record ${actualIndex + 1}: ${errorMessage}`);
            }
          })
        );

        // Update progress
        const progress = Math.round(((i + batch.length) / dataToImport.length) * 100);
        setImportProgress(progress);
      }

      setImportResults(results);
      setImportComplete(true);
      return results;

    } catch (error: unknown) {
      console.error('Error during import:', error);
      const errorMessage = error instanceof Error ? error.message : 'Import process failed';
      throw new Error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  }, [config]);

  // Export error report
  const exportErrorReport = useCallback((
    data: unknown[],
    headers: string[],
    duplicates: DuplicateCheck[],
    validationErrors: string[]
  ) => {
    const errorRows = data.filter((_row, index) => {
      const hasValidationError = validationErrors.some(error =>
        error.includes(`Row ${index + 3}`)
      );
      const hasDuplicate = duplicates.some(dup => dup.rowIndex === index);
      return hasValidationError || hasDuplicate;
    });

    if (errorRows.length === 0) {
      alert('No errors to export');
      return;
    }

    const csvContent = [
      ['Row', ...headers, 'Error Type', 'Error Details'].join(','),
      ...errorRows.map((row) => {
        const originalIndex = data.indexOf(row);
        const rowError = validationErrors.find(error =>
          error.includes(`Row ${originalIndex + 3}`)
        );
        const duplicate = duplicates.find(dup => dup.rowIndex === originalIndex);
        
        const errorType = duplicate ? 'Duplicate' : 'Validation';
        const errorDetails = duplicate 
          ? `${duplicate.duplicateFields.join(', ')} (${duplicate.duplicateType})`
          : rowError || '';

        const rowData = isRecord(row) ? row : {};
        return [
          originalIndex + 3,
          ...headers.map(header => `"${String(rowData[header] || '')}"`),
          errorType,
          `"${errorDetails}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.collectionName}_import_errors_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }, [config.collectionName]);

  // Reset all states
  const reset = useCallback(() => {
    setIsImporting(false);
    setImportProgress(0);
    setImportComplete(false);
    setIsCheckingDuplicates(false);
    setDuplicateChecks([]);
    setImportResults({ success: 0, failed: 0, skipped: 0, errors: [] });
    setEditedData(new Map());
  }, []);

  return {
    // States
    isImporting,
    importProgress,
    importComplete,
    isCheckingDuplicates,
    duplicateChecks,
    importResults,
    editedData,

    // Methods
    checkForDuplicates,
    updateCellValue,
    getCurrentData,
    getFieldValue,
    importData,
    exportErrorReport,
    reset,

    // Setters for external control
    setDuplicateChecks,
    setImportResults
  };
};