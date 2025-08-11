// src/features/employees/components/ImportEmployeeForm.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../config/firebase';
import { collection,  query, where, getDocs, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { 
  FaFileUpload, FaFileDownload, FaArrowLeft, FaCheck, 
  FaUser, FaSpinner, FaSearch, 
  FaFileExport, FaEye, FaEyeSlash, FaUndo, FaCheckSquare, FaSquare
} from 'react-icons/fa';
import { useSimpleCSVProcessor } from '../../../utils/CSVProcessor';
import { EMPLOYEE_TEMPLATE } from '../../../utils/CSVTemplates';
import { useAuth } from '../../../contexts/AuthContext';

// Types
interface ImportResults {
  success: number;
  failed: number;
  errors: string[];
}

interface DuplicateCheck {
  rowIndex: number;
  fieldValue: string;
  duplicateFields: string[];
  duplicateType: 'database' | 'csv';
}

interface ValidationError {
  row: number;
  message: string;
}

interface CSVRow extends Record<string, string | number | null | undefined> {
  originalIndex?: number;
}

interface EmployeeData {
  empId: string;
  idCard: string;
  firstName: string;
  lastName: string;
  company: string;
  [key: string]: unknown;
}

type FilterType = 'all' | 'valid' | 'errors' | 'duplicates';
type Step = 1 | 2 | 3;

// Utils
const showAlert = (message: string): void => alert(message);
const isValidRow = (row: unknown): row is CSVRow => typeof row === 'object' && row !== null;
const isString = (value: unknown): value is string => typeof value === 'string';

export default function ImportEmployeeForm(): React.ReactElement {
  const navigate = useNavigate();
  const { user } = useAuth();
  const csvProcessor = useSimpleCSVProcessor();
  
  // Core States
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [mappedData, setMappedData] = useState<EmployeeData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [duplicateChecks, setDuplicateChecks] = useState<DuplicateCheck[]>([]);
  
  // Import States
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResults>({ success: 0, failed: 0, errors: [] });
  
  // UI States
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editedData, setEditedData] = useState<Record<number, Record<string, string>>>({});
  const [showOptions, setShowOptions] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  const rowsPerPage = 25;
  const processedDataRef = useRef('');

  // Get current data with edits
  const getCurrentData = useCallback((): CSVRow[] => {
    return csvProcessor.state.previewData.map((row: unknown, index: number): CSVRow => {
      if (!isValidRow(row)) return { originalIndex: index };
      const edits = editedData[index] || {};
      return { ...row, ...edits, originalIndex: row.originalIndex ?? index };
    });
  }, [csvProcessor.state.previewData, editedData]);

  // Process and validate data
  const processData = useCallback(async (): Promise<void> => {
    if (!EMPLOYEE_TEMPLATE || csvProcessor.state.previewData.length === 0) return;

    const mapped: EmployeeData[] = [];
    const errors: ValidationError[] = [];

    csvProcessor.state.previewData.forEach((row: unknown, index: number) => {
      if (!isValidRow(row)) {
        errors.push({ row: index, message: `Row ${index + 3}: Invalid data` });
        return;
      }

      const employeeData: Partial<EmployeeData> = {};
      let hasError = false;

      // Map fields
      Object.entries(EMPLOYEE_TEMPLATE.fieldMapping).forEach(([dbField, csvField]) => {
        let value: string | number | null = row[csvField] ?? null;
        
        // Apply transformers
        if (EMPLOYEE_TEMPLATE.transformers?.[csvField]) {
          const transformedValue = EMPLOYEE_TEMPLATE.transformers[csvField](value);
          value = transformedValue as string | number | null;
        }
        
        employeeData[dbField as keyof EmployeeData] = value;
      });

      // Apply defaults
      Object.entries(EMPLOYEE_TEMPLATE.defaultValues).forEach(([field, defaultValue]) => {
        if (!employeeData[field as keyof EmployeeData]) {
          employeeData[field as keyof EmployeeData] = typeof defaultValue === 'function' 
            ? defaultValue(user?.email) 
            : defaultValue;
        }
      });

      // Validate required fields
      EMPLOYEE_TEMPLATE.requiredFields.forEach(field => {
        const value = employeeData[field as keyof EmployeeData];
        if (!value || (isString(value) && !value.trim())) {
          errors.push({ row: index, message: `Row ${index + 3}: ${field} is required` });
          hasError = true;
        }
      });

      // Custom validation
      Object.entries(EMPLOYEE_TEMPLATE.validationRules).forEach(([field, validator]) => {
        const value = employeeData[field as keyof EmployeeData];
        const error = validator(value);
        if (error) {
          errors.push({ row: index, message: `Row ${index + 3}: ${field} - ${error}` });
          hasError = true;
        }
      });

      if (!hasError && employeeData.empId && employeeData.idCard && employeeData.firstName && employeeData.lastName && employeeData.company) {
        mapped.push(employeeData as EmployeeData);
      }
    });

    setMappedData(mapped);
    setValidationErrors(errors);
  }, [csvProcessor.state.previewData, user?.email]);

  // Check duplicates
  const checkDuplicates = useCallback(async (): Promise<void> => {
    const currentData = getCurrentData();
    if (currentData.length === 0) return;

    const duplicates: DuplicateCheck[] = [];
    
    // Get unique values
    const empIds = [...new Set(currentData.map(row => isString(row.empId) ? row.empId.toLowerCase().trim() : '').filter(Boolean))];
    const idCards = [...new Set(currentData.map(row => isString(row.idCard) ? row.idCard.trim() : '').filter(Boolean))];

    // Check database duplicates
    const checkDB = async (values: string[], field: 'empId' | 'idCard'): Promise<Set<string>> => {
      const results = new Set<string>();
      for (let i = 0; i < values.length; i += 30) {
        const batch = values.slice(i, i + 30);
        const q = query(collection(db, 'employees'), where(field, 'in', batch));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          const data = doc.data();
          const value = isString(data[field]) ? (field === 'empId' ? data[field].toLowerCase() : data[field]) : '';
          if (value) results.add(value);
        });
      }
      return results;
    };

    try {
      const [existingEmpIds, existingIdCards] = await Promise.all([
        checkDB(empIds, 'empId'),
        checkDB(idCards, 'idCard')
      ]);

      // Check database duplicates
      currentData.forEach((row, index) => {
        const empId = isString(row.empId) ? row.empId.toLowerCase().trim() : '';
        const idCard = isString(row.idCard) ? row.idCard.trim() : '';
        const fields: string[] = [];

        if (empId && existingEmpIds.has(empId)) fields.push('Employee ID');
        if (idCard && existingIdCards.has(idCard)) fields.push('ID Card');

        if (fields.length > 0) {
          duplicates.push({
            rowIndex: index,
            fieldValue: empId || idCard,
            duplicateFields: fields,
            duplicateType: 'database'
          });
        }
      });

      // Check CSV internal duplicates
      const csvEmpIds = new Map<string, number[]>();
      const csvIdCards = new Map<string, number[]>();

      currentData.forEach((row, index) => {
        const empId = isString(row.empId) ? row.empId.toLowerCase().trim() : '';
        const idCard = isString(row.idCard) ? row.idCard.trim() : '';

        if (empId) {
          if (!csvEmpIds.has(empId)) csvEmpIds.set(empId, []);
          csvEmpIds.get(empId)!.push(index);
        }
        if (idCard) {
          if (!csvIdCards.has(idCard)) csvIdCards.set(idCard, []);
          csvIdCards.get(idCard)!.push(index);
        }
      });

      [csvEmpIds, csvIdCards].forEach((map, mapIndex) => {
        const field = mapIndex === 0 ? 'Employee ID' : 'ID Card';
        map.forEach((indices, value) => {
          if (indices.length > 1) {
            indices.forEach(index => {
              duplicates.push({
                rowIndex: index,
                fieldValue: value,
                duplicateFields: [field],
                duplicateType: 'csv'
              });
            });
          }
        });
      });

      setDuplicateChecks(duplicates);
    } catch (error) {
      console.error('Error checking duplicates:', error);
    }
  }, [getCurrentData]);

  // Handle file upload
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showAlert('File too large (max 10MB)');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      showAlert('Please select a CSV file');
      return;
    }

    try {
      setDuplicateChecks([]);
      setEditedData({});
      setCurrentStep(1);
      setMappedData([]);
      setValidationErrors([]);
      setSelectedRows(new Set());
      
      await csvProcessor.parseFile(file);
    } catch (error) {
      showAlert('Error uploading file');
    }
  }, [csvProcessor]);

  // Handle cell edit
  const handleCellEdit = useCallback((rowIndex: number, field: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [rowIndex]: { ...prev[rowIndex], [field]: value }
    }));
  }, []);

  // Handle row selection
  const handleRowSelect = useCallback((rowIndex: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  }, []);

    // Filter data
  const filteredData = useMemo(() => {
    let data = getCurrentData();

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      data = data.filter(row =>
        Object.values(row).some(value => 
          isString(value) && value.toLowerCase().includes(search)
        )
      );
    }

    switch (filterType) {
      case 'errors':
        data = data.filter((row, index) => {
          const originalIndex = typeof row.originalIndex === 'number' ? row.originalIndex : index;
          return validationErrors.some(error => error.row === originalIndex);
        });
        break;
      case 'duplicates':
        data = data.filter((row, index) => {
          const originalIndex = typeof row.originalIndex === 'number' ? row.originalIndex : index;
          return duplicateChecks.some(dup => dup.rowIndex === originalIndex);
        });
        break;
      case 'valid':
        data = data.filter((row, index) => {
          const originalIndex = typeof row.originalIndex === 'number' ? row.originalIndex : index;
          const hasError = validationErrors.some(error => error.row === originalIndex);
          const hasDuplicate = duplicateChecks.some(dup => dup.rowIndex === originalIndex);
          return !hasError && !hasDuplicate;
        });
        break;
    }

    return data;
  }, [getCurrentData, searchTerm, filterType, validationErrors, duplicateChecks]);


  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedRows(new Set());
    } else {
      const validRowIndices = filteredData
        .map((_, index) => index)
        .filter(index => {
          const originalIndex = typeof filteredData[index].originalIndex === 'number' ? filteredData[index].originalIndex : index;
          const hasError = validationErrors.some(error => error.row === originalIndex);
          const hasDuplicate = duplicateChecks.some(dup => dup.rowIndex === originalIndex);
          return !hasError && !hasDuplicate;
        });
      setSelectedRows(new Set(validRowIndices));
    }
    setSelectAll(!selectAll);
  }, [selectAll, filteredData, validationErrors, duplicateChecks]);

  // Import data
  const handleImport = useCallback(async (): Promise<void> => {
    const validRows = mappedData.filter((_, index) => {
      const hasError = validationErrors.some(error => error.row === index);
      const hasDuplicate = duplicateChecks.some(dup => dup.rowIndex === index);
      return !hasError && !hasDuplicate;
    });

    if (validRows.length === 0) {
      showAlert('No valid rows to import');
      return;
    }

    if (!confirm(`Import ${validRows.length} records?`)) return;

    setIsImporting(true);
    setImportProgress(0);
    
    const results: ImportResults = { success: 0, failed: 0, errors: [] };

    try {
      const batchSize = 10;
      const batches: EmployeeData[][] = [];
      
      for (let i = 0; i < validRows.length; i += batchSize) {
        batches.push(validRows.slice(i, i + batchSize));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = writeBatch(db);
        const currentBatch = batches[batchIndex];
        
        for (const employeeData of currentBatch) {
          try {
            const newDocRef = doc(collection(db, 'employees'));
            batch.set(newDocRef, {
              ...employeeData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              createdBy: user?.email || 'system',
              status: 'active'
            });
            results.success++;
          } catch (error) {
            results.failed++;
            results.errors.push(`${employeeData.empId}: Import failed`);
          }
        }
        
        try {
          await batch.commit();
        } catch (error) {
          currentBatch.forEach(emp => {
            results.failed++;
            results.success = Math.max(0, results.success - 1);
            results.errors.push(`${emp.empId}: Batch failed`);
          });
        }
        
        setImportProgress(Math.round(((batchIndex + 1) / batches.length) * 100));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setImportResults(results);
      setCurrentStep(3);
    } catch (error) {
      showAlert('Import failed');
    } finally {
      setIsImporting(false);
    }
  }, [mappedData, validationErrors, duplicateChecks, user?.email]);

  // Download template
  const downloadTemplate = useCallback((): void => {
    if (!EMPLOYEE_TEMPLATE) return;
    
    const headers = Object.values(EMPLOYEE_TEMPLATE.fieldMapping);
    const descriptions = Object.keys(EMPLOYEE_TEMPLATE.fieldMapping);
    const csvContent = [headers.join(','), descriptions.join(',')].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'employee_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  // Export errors
  const exportErrors = useCallback((): void => {
    const errorRows = filteredData.filter((row, index) => {
      const originalIndex = typeof row.originalIndex === 'number' ? row.originalIndex : index;
      const hasError = validationErrors.some(error => error.row === originalIndex);
      const hasDuplicate = duplicateChecks.some(dup => dup.rowIndex === originalIndex);
      return hasError || hasDuplicate;
    });

    if (errorRows.length === 0) {
      showAlert('No errors to export');
      return;
    }

    const csvContent = [
      ['Row', ...csvProcessor.state.headers, 'Error Type', 'Error Details'].join(','),
      ...errorRows.map(row => {
        const originalIndex = typeof row.originalIndex === 'number' ? row.originalIndex : 0;
        const error = validationErrors.find(err => err.row === originalIndex);
        const duplicate = duplicateChecks.find(dup => dup.rowIndex === originalIndex);
        
        return [
          originalIndex + 3,
          ...csvProcessor.state.headers.map(header => `"${String(row[header] ?? '')}"`),
          duplicate ? 'Duplicate' : 'Validation',
          `"${duplicate ? duplicate.duplicateFields.join(', ') : error?.message || ''}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `import_errors_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredData, validationErrors, duplicateChecks, csvProcessor.state.headers]);



  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, currentPage]);

  const getRowStatus = useCallback((originalIndex: number) => {
    const error = validationErrors.find(err => err.row === originalIndex);
    const duplicate = duplicateChecks.find(dup => dup.rowIndex === originalIndex);
    
    if (error) return { type: 'error' as const, message: error.message };
    if (duplicate) return { 
      type: 'duplicate' as const, 
      message: `${duplicate.duplicateFields.join(', ')} (${duplicate.duplicateType})` 
    };
    return { type: 'valid' as const, message: 'Valid' };
  }, [validationErrors, duplicateChecks]);

  // Reset function
  const resetAll = useCallback(() => {
    setCurrentStep(1);
    setMappedData([]);
    setValidationErrors([]);
    setDuplicateChecks([]);
    setEditedData({});
    setSelectedRows(new Set());
    csvProcessor.reset();
  }, [csvProcessor]);

  // Effects
  useEffect(() => {
    if (currentStep === 1 && csvProcessor.state.previewData.length > 0) {
      setCurrentStep(2);
    }
  }, [currentStep, csvProcessor.state.previewData.length]);

  useEffect(() => {
    if (currentStep === 2 && csvProcessor.state.previewData.length > 0 && mappedData.length === 0) {
      void processData();
    }
  }, [currentStep, csvProcessor.state.previewData.length, mappedData.length, processData]);

  useEffect(() => {
    if (currentStep === 2 && mappedData.length > 0 && duplicateChecks.length === 0) {
      const dataId = JSON.stringify({
        step: currentStep,
        length: csvProcessor.state.previewData.length,
        headers: csvProcessor.state.headers
      });

      if (processedDataRef.current !== dataId) {
        processedDataRef.current = dataId;
        void checkDuplicates();
      }
    }
  }, [currentStep, mappedData.length, duplicateChecks.length, checkDuplicates, csvProcessor.state.previewData.length, csvProcessor.state.headers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchTerm]);

  const stats = {
    totalRows: csvProcessor.state.previewData.length,
    validRows: mappedData.length - validationErrors.length - duplicateChecks.length,
    errorCount: validationErrors.length,
    duplicateCount: duplicateChecks.length
  };

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/employees')}
            className="flex items-center px-4 py-2 mr-4 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
          >
            <FaArrowLeft className="mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold">Import Employees</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 space-x-8">
          {[
            { num: 1, title: 'Upload', icon: FaFileUpload },
            { num: 2, title: 'Review', icon: FaUser },
            { num: 3, title: 'Complete', icon: FaCheck }
          ].map((step, index) => (
            <div key={step.num} className="flex items-center space-x-4">
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                  currentStep >= step.num ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                  {currentStep > step.num ? <FaCheck className="text-white" /> : <step.icon className="text-white" />}
                </div>
                <span className="mt-1 text-sm font-medium">{step.title}</span>
              </div>
              {index < 2 && (
                <div className={`h-1 w-16 ${currentStep > step.num ? 'bg-blue-600' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {currentStep === 1 && (
          <div className="p-8 bg-white rounded-xl shadow-lg">
            <h2 className="mb-6 text-2xl font-semibold">Upload CSV File</h2>
            
            <div className="p-12 text-center border-2 border-gray-300 border-dashed rounded-xl">
              <FaFileUpload className="mx-auto mb-4 text-6xl text-blue-500" />
              <h3 className="mb-2 text-xl font-medium">Upload Employee CSV</h3>
              <p className="mb-6 text-gray-600">Choose a CSV file (max 10MB)</p>
              
              <input
                type="file"
                accept=".csv"
                onChange={e => void handleFileChange(e)}
                className="hidden"
                id="file-upload"
                disabled={csvProcessor.state.isProcessing}
              />
              <label
                htmlFor="file-upload"
                className={`px-8 py-4 text-white rounded-xl cursor-pointer ${
                  csvProcessor.state.isProcessing 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {csvProcessor.state.isProcessing ? (
                  <>
                    <FaSpinner className="inline mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Select CSV File'
                )}
              </label>
            </div>

            <div className="grid gap-6 mt-8 md:grid-cols-2">
              <div className="p-6 bg-blue-50 rounded-xl">
                <h3 className="mb-4 text-lg font-semibold text-blue-800">Requirements</h3>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>• UTF-8 encoding, comma-separated</li>
                  <li>• First row: Headers</li>
                  <li>• Required: empId, idCard, firstName, lastName, company</li>
                </ul>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center px-4 py-2 mt-4 space-x-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <FaFileDownload />
                  <span>Download Template</span>
                </button>
              </div>
              
              <div className="p-6 bg-green-50 rounded-xl">
                <h3 className="mb-4 text-lg font-semibold text-green-800">Features</h3>
                <ul className="space-y-1 text-sm text-green-700">
                  <li>• Automatic duplicate detection</li>
                  <li>• Data validation & editing</li>
                  <li>• Error reporting & export</li>
                  <li>• Batch import processing</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Review */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="p-6 bg-white rounded-xl shadow-lg">
              <h2 className="mb-4 text-2xl font-semibold">Review Data</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{stats.totalRows}</div>
                  <div className="text-sm text-blue-600">Total Rows</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{stats.validRows}</div>
                  <div className="text-sm text-green-600">Valid</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-700">{stats.errorCount}</div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-700">{stats.duplicateCount}</div>
                  <div className="text-sm text-yellow-600">Duplicates</div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="p-6 bg-white rounded-xl shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
                    />
                  </div>
                  
                  <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value as FilterType)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All ({stats.totalRows})</option>
                    <option value="valid">Valid ({stats.validRows})</option>
                    <option value="errors">Errors ({stats.errorCount})</option>
                    <option value="duplicates">Duplicates ({stats.duplicateCount})</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="flex items-center px-4 py-2 space-x-2 border rounded-lg hover:bg-gray-50"
                  >
                    {showOptions ? <FaEyeSlash /> : <FaEye />}
                    <span>Options</span>
                  </button>
                  
                  {(stats.errorCount > 0 || stats.duplicateCount > 0) && (
                    <button
                      onClick={exportErrors}
                      className="flex items-center px-4 py-2 space-x-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      <FaFileExport />
                      <span>Export Errors</span>
                    </button>
                  )}

                  <button
                    onClick={resetAll}
                    className="flex items-center px-4 py-2 space-x-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
                  >
                    <FaUndo />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Bulk Actions */}
              {showOptions && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center space-x-2 px-3 py-1 text-sm border rounded hover:bg-gray-100"
                      >
                        {selectAll ? <FaCheckSquare /> : <FaSquare />}
                        <span>Select All Valid</span>
                      </button>
                      <span className="text-sm text-gray-600">
                        {selectedRows.size} selected
                      </span>
                    </div>

                    {selectedRows.size > 0 && (
                      <button
                        onClick={() => handleImport()}
                        className="flex items-center px-4 py-2 space-x-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
                      >
                        <FaCheck />
                        <span>Import Selected ({selectedRows.size})</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      {csvProcessor.state.headers.slice(0, 6).map(header => (
                        <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedData.map((row, index) => {
                      const originalIndex = typeof row.originalIndex === 'number' ? row.originalIndex : index;
                      const status = getRowStatus(originalIndex);
                      const isSelected = selectedRows.has(index);
                      
                      return (
                        <tr key={`${originalIndex}-${index}`} className={`
                          ${status.type === 'error' ? 'bg-red-50' : ''}
                          ${status.type === 'duplicate' ? 'bg-yellow-50' : ''}
                          ${isSelected ? 'bg-blue-50' : ''}
                        `}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {originalIndex + 3}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {status.type === 'valid' && (
                                <button
                                  onClick={() => handleRowSelect(index)}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  {isSelected ? <FaCheckSquare /> : <FaSquare />}
                                </button>
                              )}
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                status.type === 'valid' ? 'bg-green-100 text-green-800' :
                                status.type === 'error' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {status.type === 'valid' ? 'Valid' : 
                                 status.type === 'error' ? 'Error' : 'Duplicate'}
                              </span>
                            </div>
                          </td>
                          {csvProcessor.state.headers.slice(0, 6).map(header => (
                            <td key={header} className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {editingCell?.rowIndex === index && editingCell?.field === header ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={() => {
                                    handleCellEdit(originalIndex, header, editValue);
                                    setEditingCell(null);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      handleCellEdit(originalIndex, header, editValue);
                                      setEditingCell(null);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingCell(null);
                                    }
                                  }}
                                  autoFocus
                                  className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                <div
                                  onClick={() => {
                                    if (status.type !== 'valid') return;
                                    setEditingCell({ rowIndex: index, field: header });
                                    setEditValue(String(row[header] ?? ''));
                                  }}
                                  className={`cursor-pointer hover:bg-gray-100 px-2 py-1 rounded ${
                                    status.type === 'valid' ? 'hover:bg-gray-100' : ''
                                  }`}
                                >
                                  {String(row[header] ?? '')}
                                </div>
                              )}
                            </td>
                          ))}
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {status.type !== 'valid' && (
                              <div className="text-xs text-red-600 max-w-xs truncate" title={status.message}>
                                {status.message}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} entries
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                        if (page > totalPages) return null;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 text-sm border rounded ${
                              currentPage === page 
                                ? 'bg-blue-600 text-white border-blue-600' 
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Import Button */}
            <div className="flex justify-between items-center">
              <button
                onClick={resetAll}
                className="flex items-center px-6 py-3 space-x-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
              >
                <FaUndo />
                <span>Start Over</span>
              </button>

              <button
                onClick={() => void handleImport()}
                disabled={isImporting || stats.validRows === 0}
                className={`flex items-center px-8 py-3 space-x-2 text-white rounded-lg ${
                  isImporting || stats.validRows === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isImporting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Importing... {importProgress}%</span>
                  </>
                ) : (
                  <>
                    <FaCheck />
                    <span>Import {stats.validRows} Records</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto">
            <div className="p-8 bg-white rounded-xl shadow-lg text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <FaCheck className="text-2xl text-green-600" />
              </div>
              
              <h2 className="mb-4 text-2xl font-semibold text-gray-900">Import Complete!</h2>
              
              <div className="mb-6 space-y-2">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{importResults.success}</div>
                  <div className="text-sm text-green-600">Successfully Imported</div>
                </div>
                
                {importResults.failed > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-700">{importResults.failed}</div>
                    <div className="text-sm text-red-600">Failed to Import</div>
                  </div>
                )}
              </div>

              {importResults.errors.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 rounded-lg">
                  <h3 className="font-medium text-red-800 mb-2">Import Errors:</h3>
                  <div className="text-sm text-red-700 max-h-32 overflow-y-auto">
                    {importResults.errors.map((error, index) => (
                      <div key={index} className="mb-1">{error}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => navigate('/employees')}
                  className="px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  View Employees
                </button>
                <button
                  onClick={resetAll}
                  className="px-6 py-3 text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
                >
                  Import More
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}