// src/components/utils/ImportCSVPage.tsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { 
  FaFileUpload, FaFileDownload, FaArrowLeft, FaCheck, FaExclamationTriangle, 
  FaTimes, FaUser, FaSpinner, FaSearch, FaFilter, FaEdit, FaSave, 
  FaFileExport, FaEye, FaEyeSlash, FaCheckSquare, FaSquare, FaUndo
} from 'react-icons/fa';
import { useCSVProcessor } from './CSVProcessor';
import { getAllTemplates, getTemplateByCollection } from './CSVTemplates';
import { useAuth } from '../../contexts/AuthContext';

// --- Type Definitions ---
interface ImportResults {
  success: number; failed: number; skipped: number; errors: string[];
}
interface DuplicateCheck {
  rowIndex: number; fieldValue?: string; duplicateFields: string[];
  duplicateType: 'database' | 'csv';
}
interface EditableCell {
  rowIndex: number; field: string;
}
type FilterType = 'all' | 'valid' | 'errors' | 'duplicates';
type DataRow = Record<string, unknown> & { originalIndex: number };

export default function ImportCSVPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const csvProcessor = useCSVProcessor();
  const templates = getAllTemplates();

  // Template Selection
  //const [selectedCollection, setSelectedCollection] = useState<string>(templates[0]?.collection || '');  
  const [selectedCollection, setSelectedCollection] =  useState<string>(() => Object.keys(templates)[0]); 
  const selectedTemplate = useMemo(() => {
    return getTemplateByCollection(selectedCollection) ?? templates[0];
  }, [selectedCollection, templates]);
  



  // Core States
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
  
  // UI States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<EditableCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editedData, setEditedData] = useState<Record<number, Record<string, unknown>>>({});
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Use ref to track if we've already processed this data
  const processedDataRef = useRef<string>('');

  // Get current data with edits applied
  const getCurrentData = useCallback(() => {
    return csvProcessor.state.previewData.map((row, index) => {
      const edits = editedData[index] || {};
      return { ...row, ...edits };
    });
  }, [csvProcessor.state.previewData, editedData]);

  // Enhanced duplicate checking - memoized to prevent unnecessary re-creation
  const checkForDuplicates = useCallback(async () => {
    if (!selectedTemplate) return;
    
    const currentData = getCurrentData();
    if (currentData.length === 0) return;

    setIsCheckingDuplicates(true);
    const duplicates: DuplicateCheck[] = [];
    
    try {
      const requiredFields = selectedTemplate.requiredFields;
      
      // Get unique values for each required field
      const fieldValues: Record<string, string[]> = {};
      requiredFields.forEach(field => {
        fieldValues[field] = [...new Set(currentData
          .map(row => String(row[field] || '').trim())
          .filter(Boolean))];
      });

      const checkBatch = async (values: string[], field: string) => {
        const results = new Set<string>();
        try {
          for (let i = 0; i < values.length; i += 30) {
            const batch = values.slice(i, i + 30);
            if (batch.length === 0) continue;
            
            const q = query(collection(db, selectedTemplate.collection), where(field, 'in', batch));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
              const data = doc.data();
              const value = String(data[field] || '').trim();
              results.add(value);
            });
          }
        } catch (error) {
          console.warn(`Error checking duplicates for field ${field}:`, error);
        }
        return results;
      };

      // Check for CSV duplicates first (works offline)
      const csvFieldMaps: Record<string, Map<string, number>> = {};
      requiredFields.forEach(field => {
        csvFieldMaps[field] = new Map<string, number>();
      });

      currentData.forEach((row, index) => {
        requiredFields.forEach(field => {
          const value = String(row[field] || '').trim();
          if (value) {
            if (csvFieldMaps[field].has(value)) {
              duplicates.push({ 
                rowIndex: index, 
                fieldValue: value,
                duplicateType: 'csv', 
                duplicateFields: [field] 
              });
            } else {
              csvFieldMaps[field].set(value, index);
            }
          }
        });
      });

      // Try to check database duplicates (may fail if offline)
      try {
        const existingFieldValues: Record<string, Set<string>> = {};
        
        await Promise.all(
          requiredFields.map(async (field) => {
            existingFieldValues[field] = await checkBatch(fieldValues[field], field);
          })
        );

        currentData.forEach((row, index) => {
          requiredFields.forEach(field => {
            const value = String(row[field] || '').trim();
            if (value && existingFieldValues[field]?.has(value)) {
              duplicates.push({ 
                rowIndex: index, 
                fieldValue: value,
                duplicateType: 'database', 
                duplicateFields: [field] 
              });
            }
          });
        });
      } catch (error) {
        console.warn('Could not check database duplicates (offline mode):', error);
      }

      setDuplicateChecks(duplicates);
    } catch (error: unknown) {
      console.error('Error checking duplicates:', error);
    } finally {
      setIsCheckingDuplicates(false);
    }
  }, [getCurrentData, selectedTemplate]);

  // Fixed useEffect with proper dependencies and duplicate prevention
  useEffect(() => {
    const shouldProcessMapping = 
      csvProcessor.state.currentStep === 2 && 
      csvProcessor.state.previewData.length > 0 &&
      csvProcessor.state.mappedData.length === 0 && // Only process if not already processed
      selectedTemplate;

    if (shouldProcessMapping) {
      console.log('Processing mapping...');
      
      // Process mapping first
      if (user?.email) {
        csvProcessor.processMapping(selectedTemplate, user.email);
      }
    }
  }, [
    csvProcessor.state.currentStep,
    csvProcessor.state.previewData.length,
    csvProcessor.state.mappedData.length,
    csvProcessor,
    selectedTemplate,
    user?.email
  ]);

  // Separate useEffect for duplicate checking - only run after mapping is complete
  useEffect(() => {
    const shouldCheckDuplicates = 
      csvProcessor.state.currentStep === 2 && 
      csvProcessor.state.previewData.length > 0 &&
      csvProcessor.state.mappedData.length > 0 && // Wait for mapping to complete
      duplicateChecks.length === 0 && // Only check if not already checked
      selectedTemplate;

    if (shouldCheckDuplicates) {
      console.log('Checking duplicates...');
      
      // Create a unique identifier for this data set
      const dataIdentifier = JSON.stringify({
        step: csvProcessor.state.currentStep,
        dataLength: csvProcessor.state.previewData.length,
        headers: csvProcessor.state.headers,
        collection: selectedTemplate.collection
      });

      // Only process if this is new data
      if (processedDataRef.current !== dataIdentifier) {
        processedDataRef.current = dataIdentifier;
        checkForDuplicates();
      }
    }
  }, [
    csvProcessor.state.currentStep,
    csvProcessor.state.previewData.length,
    csvProcessor.state.mappedData.length,
    csvProcessor.state.headers,
    duplicateChecks.length,
    selectedTemplate,
    checkForDuplicates
  ]);

  // Separate useEffect for when previewData actually changes (file upload)
  useEffect(() => {
    if (csvProcessor.state.previewData.length > 0) {
      setDuplicateChecks([]);
      setEditedData({});
      setSelectedRows(new Set());
      setCurrentPage(1);
      // Reset the processed data ref when new data comes in
      processedDataRef.current = '';
    }
  }, [csvProcessor.state.previewData.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchTerm]);

  // File handling
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large. Please select a file smaller than 10MB.');
      return;
    }
    
    try {
      setDuplicateChecks([]);
      setEditedData({});
      setSelectedRows(new Set());
      setImportComplete(false);
      setImportResults({ success: 0, failed: 0, skipped: 0, errors: [] });
      await csvProcessor.handleFileUpload(file);
    } catch (error: unknown) {
      console.error('Error uploading file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error uploading file';
      alert(errorMessage);
    }
  };

  // Cell editing functions
  const handleCellEdit = (rowIndex: number, field: string, currentValue: string) => {
    setEditingCell({ rowIndex, field });
    setEditValue(String(currentValue));
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    const { rowIndex, field } = editingCell;
    setEditedData(prev => ({
      ...prev,
      [rowIndex]: {
        ...prev[rowIndex],
        [field]: editValue
      }
    }));
    setEditingCell(null);
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Filter and search logic
  const filteredData = useMemo(() => {
    const currentData = getCurrentData();
    let dataWithIndex: DataRow[] = currentData.map((row, index) => ({ 
      ...row, 
      originalIndex: index 
    }));

    if (searchTerm) {
      dataWithIndex = dataWithIndex.filter(row =>
        Object.values(row).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    switch (filterType) {
      case 'errors':
        return dataWithIndex.filter(row => 
          csvProcessor.state.errors.some(e => 
            e.message.includes(`แถวที่ ${row.originalIndex + csvProcessor.state.dataRowOffset}`)
          )
        );
      case 'duplicates':
        return dataWithIndex.filter(row => 
          duplicateChecks.some(d => d.rowIndex === row.originalIndex)
        );
      case 'valid':
        return dataWithIndex.filter(row => 
          !csvProcessor.state.errors.some(e => 
            e.message.includes(`แถวที่ ${row.originalIndex + csvProcessor.state.dataRowOffset}`)
          ) &&
          !duplicateChecks.some(d => d.rowIndex === row.originalIndex)
        );
      default:
        return dataWithIndex;
    }
  }, [getCurrentData, searchTerm, filterType, csvProcessor.state.errors, duplicateChecks, csvProcessor.state.dataRowOffset]);

  // Pagination logic
  const totalFilteredRecords = filteredData.length;
  const totalPages = Math.ceil(totalFilteredRecords / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentPageData: DataRow[] = filteredData.slice(startIndex, endIndex);

  // Selection logic
  const handleRowSelect = (rowIndex: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === totalFilteredRecords) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredData.map(row => row.originalIndex)));
    }
  };

  // Import data
  const handleImport = async () => {
    const currentData = getCurrentData();
    const rowsToImport = selectedRows.size > 0 
      ? currentData.filter((_, index) => selectedRows.has(index))
      : currentData.filter((_, index) => 
          !duplicateChecks.some(d => d.rowIndex === index) && 
          !csvProcessor.state.errors.some(e => 
            e.message.includes(`แถวที่ ${index + csvProcessor.state.dataRowOffset}`)
          )
        );

    if (rowsToImport.length === 0) {
      alert('No valid records to import.');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    const results: ImportResults = { 
      success: 0, 
      failed: 0, 
      skipped: currentData.length - rowsToImport.length, 
      errors: [] 
    };

    try {
      for (let i = 0; i < rowsToImport.length; i++) {
        const recordData = rowsToImport[i];
        try {
          const payload: Record<string, unknown> = { ...recordData };
          
          // Remove empty string keys
          if ('' in payload) delete payload[''];
          
          // Add metadata
          payload.createdAt = serverTimestamp();
          payload.lastUpdateBy = user?.email || 'CSV Import';
          
          await addDoc(collection(db, selectedTemplate.collection), payload);
          results.success++;
        } catch (error) {
          results.failed++;
          const originalRowIndex = currentData.findIndex(p => p === recordData);
          results.errors.push(
            `แถวที่ ${originalRowIndex + csvProcessor.state.dataRowOffset}: ${
              error instanceof Error ? error.message : 'Import failed'
            }`
          );
        }
        setImportProgress(Math.round(((i + 1) / rowsToImport.length) * 100));
      }
      
      setImportResults(results);
      setImportComplete(true);
      csvProcessor.goToStep(3);
    } catch (error: unknown) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during import';
      alert(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  // Utility functions
  const downloadTemplate = () => {
    csvProcessor.downloadTemplate(selectedTemplate);
  };

  const exportErrorReport = () => {
    const errorRows = filteredData.filter(row => {
      const hasError = csvProcessor.state.errors.some(error =>
        error.message.includes(`แถวที่ ${row.originalIndex + csvProcessor.state.dataRowOffset}`)
      );
      const hasDuplicate = duplicateChecks.some(dup => dup.rowIndex === row.originalIndex);
      return hasError || hasDuplicate;
    });

    if (errorRows.length === 0) {
      alert('No errors to export');
      return;
    }

    const csvContent = [
      ['Row', ...csvProcessor.state.headers, 'Error Type', 'Error Details'].join(','),
      ...errorRows.map(row => {
        const rowError = csvProcessor.state.errors.find(error =>
          error.message.includes(`แถวที่ ${row.originalIndex + csvProcessor.state.dataRowOffset}`)
        );
        const duplicate = duplicateChecks.find(dup => dup.rowIndex === row.originalIndex);
        
        const errorType = duplicate ? 'Duplicate' : 'Validation';
        const errorDetails = duplicate 
          ? `${duplicate.duplicateFields.join(', ')} (${duplicate.duplicateType})`
          : rowError || '';

        return [
          row.originalIndex + csvProcessor.state.dataRowOffset,
          ...csvProcessor.state.headers.map(header => `"${String(row[header] ?? '')}"`),
          errorType,
          `"${errorDetails}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTemplate.collection}_import_errors_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    csvProcessor.reset();
    setImportComplete(false);
    setImportResults({ success: 0, failed: 0, skipped: 0, errors: [] });
    setImportProgress(0);
    setDuplicateChecks([]);
    setCurrentPage(1);
    setSelectedRows(new Set());
    setEditedData({});
    setSearchTerm('');
    setFilterType('all');
    
    const fileInput = document.getElementById('csvFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const getRowStatus = (rowIndex: number) => {
    return duplicateChecks.find(dup => dup.rowIndex === rowIndex);
  };

  const hasValidationError = (rowIndex: number) => {
    return csvProcessor.state.errors.some(error =>
      error.message.includes(`แถวที่ ${rowIndex + csvProcessor.state.dataRowOffset}`)
    );
  };

  // Statistics - แก้ไขการคำนวณให้ถูกต้อง
  const { state } = csvProcessor;
  const totalRecords = state.previewData.length;
  
  // หาจำนวน unique rows ที่มี duplicates (ไม่นับซ้ำ)
  const uniqueDuplicateRows = new Set(duplicateChecks.map(d => d.rowIndex)).size;
  
  // หาจำนวน unique rows ที่มี validation errors (ไม่นับซ้ำ)
  const uniqueErrorRows = new Set(
    state.errors
      .map(error => {
        const match = error.message.match(/แถวที่ (\d+):/);
        return match ? parseInt(match[1]) - state.dataRowOffset : -1;
      })
      .filter(rowIndex => rowIndex >= 0)
  ).size;
  
  // คำนวณ valid rows = total - (rows ที่มี duplicates หรือ errors)
  const rowsWithIssues = new Set([
    ...duplicateChecks.map(d => d.rowIndex),
    ...state.errors
      .map(error => {
        const match = error.message.match(/แถวที่ (\d+):/);
        return match ? parseInt(match[1]) - state.dataRowOffset : -1;
      })
      .filter(rowIndex => rowIndex >= 0)
  ]);
  
  const validRowsCount = Math.max(0, totalRecords - rowsWithIssues.size);

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        {/* Steps Indicator */}
        <div className="p-6 mb-8 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Select Template & Upload CSV', icon: FaFileUpload },
              { num: 2, label: 'Preview & Validate', icon: FaEye },
              { num: 3, label: 'Import Results', icon: FaCheck }
            ].map((step, index) => (
              <div key={step.num} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold transition-all ${
                  state.currentStep >= step.num ? 'bg-blue-600 scale-110' : 'bg-gray-300'
                }`}>
                  {state.currentStep > step.num ? <FaCheck /> : <step.icon />}
                </div>
                <span className="ml-3 text-sm font-medium text-gray-700">
                  {step.label}
                </span>
                {index < 2 && <div className="w-16 h-1 mx-4 bg-gray-300"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Template Selection & File Upload */}
        {state.currentStep === 1 && (
          <div className="p-6 mb-8 bg-white rounded-lg shadow-md">
            <h2 className="mb-6 text-2xl font-semibold">Select Template & Upload CSV File</h2>

            {/* Template Selection */}
            <div className="mb-8">
              <label className="block mb-3 text-lg font-medium text-gray-700">
                Select Data Type
              </label>
              <select
                className="w-full p-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => setSelectedCollection(e.target.value)}
                value={selectedCollection}
              >
                {templates.map(template => (
                  <option key={template.collection} value={template.collection}>
                    {template.name} → {template.collection}
                  </option>
                ))}
              </select>
              
              {selectedTemplate && (
                <div className="p-4 mt-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h4 className="mb-2 font-semibold text-blue-800">{selectedTemplate.name}</h4>
                  <p className="mb-3 text-blue-700">{selectedTemplate.description}</p>
                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div>
                      <strong className="text-blue-800">Required Fields:</strong>
                      <ul className="mt-1 text-blue-600 list-disc list-inside">
                        {selectedTemplate.requiredFields.map(field => (
                          <li key={field}>{field}</li>
                        ))}
                      </ul>
                    </div>
                    {selectedTemplate.dateFields.length > 0 && (
                      <div>
                        <strong className="text-blue-800">Date Fields:</strong>
                        <ul className="mt-1 text-blue-600 list-disc list-inside">
                          {selectedTemplate.dateFields.map(field => (
                            <li key={field}>{field} (YYYY-MM-DD format)</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={downloadTemplate}
                    className="flex items-center px-4 py-2 mt-4 space-x-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <FaFileDownload />
                    <span>Download Template</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* File Upload */}
            <div className="p-8 text-center transition-colors border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400">
              <FaFileUpload className="mx-auto mb-4 text-5xl text-gray-400" />
              <div className="space-y-3">
                <p className="text-lg text-gray-600">Choose a CSV file to import data</p>
                <p className="text-sm text-gray-500">Maximum file size: 10MB</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csvFile"
                  disabled={state.isProcessing}
                />
                <label
                  htmlFor="csvFile"
                  className={`inline-block px-6 py-3 rounded-lg cursor-pointer transition-all ${
                    state.isProcessing
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                  }`}
                >
                  {state.isProcessing ? (
                    <><FaSpinner className="inline mr-2 animate-spin" />Processing...</>
                  ) : (
                    'Select File'
                  )}
                </label>
              </div>
            </div>

            <div className="p-4 mt-8 border border-green-200 rounded-lg bg-green-50">
              <h3 className="mb-3 text-sm font-medium text-green-800">📋 CSV Format Requirements:</h3>
              <ul className="space-y-1 text-sm text-green-700">
                <li>• Use UTF-8 encoding and Comma-separated values</li>
                <li>• First row: Headers must match the template</li>
                <li>• Second row: Field descriptions (will be skipped)</li>
                <li>• Third row+: Actual data</li>
                <li>• Make sure field names match the selected template</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Preview and Validate */}
        {state.currentStep === 2 && (
          <div className="p-6 mb-8 bg-white rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Preview & Validate Data</h2>
              <div className="text-sm text-gray-600">
                Collection: <span className="font-medium text-blue-600">{selectedTemplate.collection}</span>
              </div>
              {isCheckingDuplicates && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <FaSpinner className="animate-spin" />
                  <span className="text-sm">Validating data...</span>
                </div>
              )}
            </div>
            
            {/* Enhanced Statistics Dashboard */}
            <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
              <div className="p-4 border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
                <div className="text-2xl font-bold text-blue-700">{totalRecords}</div>
                <div className="text-sm text-blue-600">Total Records</div>
              </div>
              <div className="p-4 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-green-100">
                <div className="text-2xl font-bold text-green-700">{validRowsCount}</div>
                <div className="text-sm text-green-600">Valid Records</div>
              </div>
              <div className="p-4 border border-red-200 rounded-lg bg-gradient-to-r from-red-50 to-red-100">
                <div className="text-2xl font-bold text-red-700">{uniqueDuplicateRows}</div>
                <div className="text-sm text-red-600">Duplicate Rows</div>
              </div>
              <div className="p-4 border border-yellow-200 rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-100">
                <div className="text-2xl font-bold text-yellow-700">{uniqueErrorRows}</div>
                <div className="text-sm text-yellow-600">Error Rows</div>
              </div>
            </div>

            {/* Enhanced Controls */}
            <div className="flex flex-col gap-4 mb-6 md:flex-row">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter */}
              <div className="flex items-center space-x-2">
                <FaFilter className="text-gray-400" />
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as FilterType)}
                >
                  <option value="all">All Records</option>
                  <option value="valid">Valid Only</option>
                  <option value="errors">Validation Errors</option>
                  <option value="duplicates">Duplicates Only</option>
                </select>
              </div>            
            {/* Rows per page */}
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={handleSelectAll}
              className="flex items-center px-3 py-2 space-x-2 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              {selectedRows.size === totalFilteredRecords ? <FaCheckSquare /> : <FaSquare />}
              <span className="text-sm">
                {selectedRows.size === totalFilteredRecords ? 'Deselect All' : 'Select All'}
              </span>
            </button>

            <button
              onClick={exportErrorReport}
              className="flex items-center px-3 py-2 space-x-2 text-orange-700 transition-colors bg-orange-100 rounded-lg hover:bg-orange-200"
              disabled={uniqueDuplicateRows === 0 && uniqueErrorRows === 0}
            >
              <FaFileExport />
              <span className="text-sm">Export Error Report</span>
            </button>

            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center px-3 py-2 space-x-2 text-purple-700 transition-colors bg-purple-100 rounded-lg hover:bg-purple-200"
            >
              {showAdvancedOptions ? <FaEyeSlash /> : <FaEye />}
              <span className="text-sm">Advanced Options</span>
            </button>
          </div>

          {/* Advanced Options */}
          {showAdvancedOptions && (
            <div className="p-4 mb-6 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="mb-3 font-medium text-gray-800">Advanced Import Options</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Skip duplicate records automatically</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Create backup before import</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Send email notification on completion</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Update existing records if found</span>
                </label>
              </div>
            </div>
          )}

          {/* Issues Summary */}
          {(uniqueDuplicateRows > 0 || uniqueErrorRows > 0) && (
            <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
              <h4 className="mb-3 text-sm font-medium text-red-800">
                <FaExclamationTriangle className="inline mr-2" />
                Issues Found:
              </h4>
              <div className="space-y-2 text-sm text-red-700">
                {uniqueDuplicateRows > 0 && (
                  <div>• {uniqueDuplicateRows} row(s) with duplicates ({duplicateChecks.length} total duplicate issues)</div>
                )}
                {uniqueErrorRows > 0 && (
                  <div>• {uniqueErrorRows} row(s) with validation errors ({state.errors.length} total errors)</div>
                )}
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="mb-6 overflow-x-auto">
            {/* Table Header Info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalFilteredRecords)} of {totalFilteredRecords} filtered records
                </div>
                {selectedRows.size > 0 && (
                  <div className="text-sm font-medium text-blue-600">
                    {selectedRows.size} row(s) selected
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
            </div>

            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === totalFilteredRecords && totalFilteredRecords > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Row
                    </th>
                    {state.headers.slice(0, 6).map((header, index) => (
                      <th key={index} className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        {header}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPageData.map((row) => {
                    const actualIndex = row.originalIndex;
                    const rowStatus = getRowStatus(actualIndex);
                    const hasError = hasValidationError(actualIndex);
                    const isSelected = selectedRows.has(actualIndex);
                    
                    return (
                      <tr 
                        key={actualIndex} 
                        className={`transition-colors ${
                          rowStatus ? 'bg-red-50 hover:bg-red-100' : 
                          hasError ? 'bg-yellow-50 hover:bg-yellow-100' :
                          isSelected ? 'bg-blue-50 hover:bg-blue-100' :
                          'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleRowSelect(actualIndex)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-3 text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <span className={`${rowStatus || hasError ? 'text-red-600' : 'text-gray-900'}`}>
                              {actualIndex + csvProcessor.state.dataRowOffset}
                            </span>
                            {(rowStatus || hasError) && (
                              <FaExclamationTriangle 
                                className="text-xs text-red-500" 
                                title={rowStatus ? `Duplicate: ${rowStatus.duplicateFields.join(', ')}` : 'Validation Error'}
                              />
                            )}
                          </div>
                        </td>
                        {state.headers.slice(0, 6).map((header, colIndex) => (
                          <td key={colIndex} className="px-3 py-3 text-sm max-w-32">
                            {editingCell?.rowIndex === actualIndex && editingCell?.field === header ? (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit();
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={handleSaveEdit}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  <FaSave className="text-xs" />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-gray-600 hover:text-gray-800"
                                >
                                  <FaUndo className="text-xs" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1 group">
                                <span className={`truncate ${rowStatus || hasError ? 'text-red-700' : 'text-gray-900'}`}>
                                  {String(row[header] ?? '')}
                                </span>
                                <button
                                  onClick={() => handleCellEdit(actualIndex, header, String(row[header] ?? ''))}
                                  className="text-blue-600 transition-opacity opacity-0 group-hover:opacity-100 hover:text-blue-800"
                                >
                                  <FaEdit className="text-xs" />
                                </button>
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-sm">
                          {rowStatus ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">
                              <FaTimes className="mr-1" />
                              Duplicate
                            </span>
                          ) : hasError ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
                              <FaExclamationTriangle className="mr-1" />
                              Error
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                              <FaCheck className="mr-1" />
                              Valid
                            </span>
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
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else {
                      const start = Math.max(1, currentPage - 3);
                      const end = Math.min(totalPages, start + 6);
                      pageNum = start + i;
                      if (pageNum > end) return null;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => csvProcessor.goToStep(1)}
              className="flex items-center px-4 py-2 space-x-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FaArrowLeft />
              <span>Back</span>
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {selectedRows.size > 0 
                  ? `Ready to import ${selectedRows.size} selected record(s)`
                  : `Ready to import ${validRowsCount} valid record(s)`
                }
              </div>
              <button
                onClick={handleImport}
                disabled={isImporting || isCheckingDuplicates || (validRowsCount === 0 && selectedRows.size === 0)}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all ${
                  isImporting || isCheckingDuplicates || (validRowsCount === 0 && selectedRows.size === 0)
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 hover:scale-105'
                }`}
              >
                {isImporting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Importing... ({importProgress}%)</span>
                  </>
                ) : isCheckingDuplicates ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  <>
                    <FaCheck />
                    <span>
                      Import {selectedRows.size > 0 ? selectedRows.size : validRowsCount} Records
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Progress */}
      {isImporting && (
        <div className="p-6 mb-8 bg-white rounded-lg shadow-md">
          <h3 className="mb-4 text-lg font-semibold">Import Progress</h3>
          <div className="space-y-4">
            <div className="w-full h-3 bg-gray-200 rounded-full">
              <div 
                className="h-3 transition-all duration-500 ease-out rounded-full bg-gradient-to-r from-blue-500 to-green-500"
                style={{ width: `${importProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{importProgress}% Complete</span>
              <span>Importing to {selectedTemplate.collection}...</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Import Results */}
      {importComplete && (
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-6 text-2xl font-semibold">Import Results</h3>
          
          <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
            <div className="p-6 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-green-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500 rounded-full">
                  <FaCheck className="text-white" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-700">{importResults.success}</div>
                  <div className="text-sm text-green-600">Successfully Imported</div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border border-red-200 rounded-lg bg-gradient-to-r from-red-50 to-red-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-500 rounded-full">
                  <FaTimes className="text-white" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-red-700">{importResults.failed}</div>
                  <div className="text-sm text-red-600">Failed to Import</div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border border-yellow-200 rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-500 rounded-full">
                  <FaExclamationTriangle className="text-white" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-yellow-700">{importResults.skipped}</div>
                  <div className="text-sm text-yellow-600">Skipped Records</div>
                </div>
              </div>
            </div>
          </div>

          {/* Import Summary */}
          <div className="p-4 mb-6 border border-blue-200 rounded-lg bg-blue-50">
            <h4 className="mb-2 font-medium text-blue-800">Import Summary</h4>
            <div className="text-sm text-blue-700">
              <p>• Total processed: {importResults.success + importResults.failed + importResults.skipped} records</p>
              <p>• Success rate: {Math.round((importResults.success / (importResults.success + importResults.failed)) * 100) || 0}%</p>
              <p>• Imported to collection: <span className="font-medium">{selectedTemplate.collection}</span></p>
              <p>• Completed at: {new Date().toLocaleString()}</p>
              <p>• Imported by: {user?.email || 'Guest'}</p>
            </div>
          </div>

          {/* Import Errors */}
          {importResults.errors.length > 0 && (
            <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
              <h4 className="mb-3 text-sm font-medium text-red-800">Import Errors ({importResults.errors.length}):</h4>
              <div className="space-y-2 overflow-y-auto max-h-60">
                {importResults.errors.map((error, index) => (
                  <div key={index} className="flex items-start p-2 space-x-2 text-sm text-red-700 bg-red-100 rounded">
                    <FaTimes className="text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={resetImport}
              className="flex items-center px-6 py-3 space-x-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FaFileUpload />
              <span>Import More Data</span>
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center px-6 py-3 space-x-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <FaUser />
              <span>Back to Previous Page</span>
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}