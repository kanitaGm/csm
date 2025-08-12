// src/utils/ImportCSVPage.tsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { 
  FaFileUpload, FaFileDownload, FaArrowLeft, FaCheck, FaExclamationTriangle, 
  FaTimes, FaUser, FaSpinner, FaSearch, FaFilter, FaEdit, FaSave, 
  FaFileExport, FaEye, FaEyeSlash, FaCheckSquare, FaSquare, FaUndo
} from 'react-icons/fa';
import { getAllTemplates, getTemplateByCollection, type CSVTemplateConfig } from './CSVTemplates';
import { useAuth } from '../contexts/AuthContext';
//import { template } from 'lodash';

// --- Type Definitions ---
interface ImportResults {
  success: number; 
  failed: number; 
  skipped: number; 
  errors: string[];
}

interface DuplicateCheck {
  rowIndex: number; 
  fieldValue?: string; 
  duplicateFields: string[];
  duplicateType: 'database' | 'csv';
}

interface EditableCell {
  rowIndex: number; 
  field: string;
}

type FilterType = 'all' | 'valid' | 'errors' | 'duplicates';

type DataRow = Record<string, string> & { originalIndex: string };

export default function ImportCSVPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [mappedData, setMappedData] = useState<Record<string, unknown>[]>([]);
  const [processingErrors, setProcessingErrors] = useState<{ message: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dataRowOffset] = useState(3);

  const templates = getAllTemplates();

  // Template Selection - แก้ไขการจัดการ state
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  
  // Initialize selectedCollection when templates are loaded
  useEffect(() => {
    //console.log('Templates loaded:', templates);
    if (templates.length > 0 && !selectedCollection) {
      const firstTemplate = templates[0];
      //console.log('Setting initial template:', firstTemplate.collection);
      setSelectedCollection(firstTemplate.collection);
    }
  }, [templates, selectedCollection ]); // เปลี่ยนจาก [templates, selectedCollection] /templates.length
  
  const selectedTemplate = useMemo(() => {
    if (!selectedCollection) return null;
    return getTemplateByCollection(selectedCollection);
  }, [selectedCollection]);

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
  const [editedData, setEditedData] = useState<Record<number, Record<string, string>>>({});
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const processedDataRef = useRef<string>('');

  // Get current data with edits applied
  const getCurrentData = useCallback((): Record<string, string>[] => {
    return previewData.map((row, index) => {
      const edits = editedData[index] || {};
      return { ...row, ...edits };
    });
  }, [previewData, editedData]);

  // Simple CSV parsing function
  const parseCSV = useCallback(async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 3) {
      throw new Error('ไฟล์ต้องมีอย่างน้อย 3 แถว (header, description, data)');
    }

    const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const cleanHeaders = rawHeaders.filter(h => h && !/^_\d+$/.test(h));
    
    if (cleanHeaders.length === 0) {
      throw new Error('ไม่พบหัวตารางในไฟล์');
    }

    const data: Record<string, string>[] = [];
    for (let i = 2; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.some(v => v)) {
        const row: Record<string, string> = {};
        cleanHeaders.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        data.push(row);
      }
    }

    return { headers: cleanHeaders, data };
  }, []);

  // Enhanced duplicate checking
  const checkForDuplicates = useCallback(async () => {
    if (!selectedTemplate) return;
    
    const currentData = getCurrentData();
    if (currentData.length === 0) return;

    setIsCheckingDuplicates(true);
    const duplicates: DuplicateCheck[] = [];
    
    try {
      const requiredFields = selectedTemplate.requiredFields;
      
      const fieldValues: Record<string, string[]> = {};
      requiredFields.forEach(field => {
        fieldValues[field] = [...new Set(currentData
          .map(row => (row[field] || '').trim())
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
              const value = (data[field] || '').toString().trim();
              results.add(value);
            });
          }
        } catch (error) {
          console.warn(`Error checking duplicates for field ${field}:`, error);
        }
        return results;
      };

      // Check for CSV duplicates first
      const csvFieldMaps: Record<string, Map<string, number>> = {};
      requiredFields.forEach(field => {
        csvFieldMaps[field] = new Map<string, number>();
      });

      currentData.forEach((row, index) => {
        requiredFields.forEach(field => {
          const value = (row[field] || '').trim();
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

      // Check database duplicates
      try {
        const existingFieldValues: Record<string, Set<string>> = {};
        
        await Promise.all(
          requiredFields.map(async (field) => {
            existingFieldValues[field] = await checkBatch(fieldValues[field], field);
          })
        );

        currentData.forEach((row, index) => {
          requiredFields.forEach(field => {
            const value = (row[field] || '').trim();
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
        console.warn('Could not check database duplicates:', error);
      }

      setDuplicateChecks(duplicates);
    } catch (error: unknown) {
      console.error('Error checking duplicates:', error);
    } finally {
      setIsCheckingDuplicates(false);
    }
  }, [getCurrentData, selectedTemplate]);

  // Process mapping - แก้ไขให้ใช้ template ที่เลือกอย่างถูกต้อง
  const processMapping = useCallback((template: CSVTemplateConfig) => {
    if (!template || previewData.length === 0) {
      //console.log('No template or preview data for processing');
      return;
    }

    //console.log('Processing mapping for template:', template.collection);
    //console.log('Template field mapping:', template.fieldMapping);

    const errors: { message: string }[] = [];
    const mapped: Record<string, unknown>[] = [];

    previewData.forEach((row, index) => {
      try {
        const mappedRow: Record<string, unknown> = {};
        
        // Apply field mapping
        Object.entries(template.fieldMapping).forEach(([csvField, dbField]) => {
          let value = row[csvField] || '';
          
          // Apply transformers if available
          if (template.transformers?.[csvField]) {
            value = template.transformers[csvField](value) as string;
          }
          
          mappedRow[dbField] = value;
        });

        // Apply default values
        Object.entries(template.defaultValues).forEach(([field, defaultValue]) => {
          if (!mappedRow[field] || mappedRow[field] === '') {
            mappedRow[field] = typeof defaultValue === 'function' 
              ? defaultValue(user?.email) 
              : defaultValue;
          }
        });

        // Apply row transformer if available
        let finalMappedRow = mappedRow;
        if (template.rowTransformer) {
          finalMappedRow = template.rowTransformer(mappedRow) as Record<string, unknown>;
        }

        // Validate required fields
        template.requiredFields.forEach(field => {
          const value = finalMappedRow[field];
          if (!value || (typeof value === 'string' && !value.trim())) {
            errors.push({
              message: `แถวที่ ${index + dataRowOffset}: ฟิลด์ ${field} ไม่สามารถว่างได้`
            });
          }
        });

        // Apply validation rules
        Object.entries(template.validationRules).forEach(([field, validator]) => {
          const value = finalMappedRow[field];
          const validationError = validator(value);
          if (validationError) {
            errors.push({
              message: `แถวที่ ${index + dataRowOffset}: ${validationError}`
            });
          }
        });

        mapped.push(finalMappedRow);
      } catch (error) {
        errors.push({
          message: `แถวที่ ${index + dataRowOffset}: เกิดข้อผิดพลาดในการประมวลผล - ${error}`
        });
      }
    });

    //console.log('Mapped data:', mapped);
    //console.log('Processing errors:', errors);

    setMappedData(mapped);
    setProcessingErrors(errors);
  }, [previewData, dataRowOffset, user?.email]);

  // useEffect for processing mapping when template changes or data is ready
  useEffect(() => {
    if (previewData.length > 0 && selectedTemplate && currentStep === 2) {
      //console.log('Trigger processing for template:', selectedTemplate.collection);
      processMapping(selectedTemplate);
    }
  }, [previewData, selectedTemplate, currentStep, processMapping]);

  // useEffect for duplicate checking after mapping
  useEffect(() => {
    if (currentStep === 2 && mappedData.length > 0 && selectedTemplate) {
      const dataIdentifier = JSON.stringify({
        step: currentStep,
        dataLength: previewData.length,
        headers: headers,
        collection: selectedTemplate.collection
      });

      if (processedDataRef.current !== dataIdentifier) {
        processedDataRef.current = dataIdentifier;
        checkForDuplicates();
      }
    }
  }, [currentStep, mappedData.length, selectedTemplate, previewData.length, headers, checkForDuplicates]);

  // Reset when template changes
  useEffect(() => {
    if (selectedTemplate) {
      //console.log('Template changed to:', selectedTemplate.collection);
      // Reset data when template changes
      setDuplicateChecks([]);
      setEditedData({});
      setSelectedRows(new Set());
      setProcessingErrors([]);
      setMappedData([]);
      setCurrentPage(1);
      processedDataRef.current = '';
      
      // Re-process if we have data
      if (previewData.length > 0 && currentStep === 2) {
        processMapping(selectedTemplate);
      }
    }
  }, [selectedTemplate, processMapping, previewData.length, currentStep]);

  // Reset when new data comes in
  useEffect(() => {
    if (previewData.length > 0) {
      setDuplicateChecks([]);
      setEditedData({});
      setSelectedRows(new Set());
      setCurrentPage(1);
      processedDataRef.current = '';
    }
  }, [previewData.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchTerm]);

  // File handling - แก้ไขให้รองรับการเปลี่ยน template
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large. Please select a file smaller than 10MB.');
      return;
    }
    
    try {
      setIsProcessing(true);
      setDuplicateChecks([]);
      setEditedData({});
      setSelectedRows(new Set());
      setImportComplete(false);
      setImportResults({ success: 0, failed: 0, skipped: 0, errors: [] });
      setProcessingErrors([]);
      setMappedData([]);
      
      const { headers: parsedHeaders, data } = await parseCSV(file);
      //console.log('Parsed headers:', parsedHeaders);
      //console.log('Parsed data rows:', data.length);
      
      setHeaders(parsedHeaders);
      setPreviewData(data);
      setCurrentStep(2);
    } catch (error: unknown) {
      console.error('Error uploading file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error uploading file';
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

    useEffect(() => {
    console.log('selectedTemplate changed:', {
      collection: selectedTemplate?.collection,
      name: selectedTemplate?.name,
      hasFieldMapping: !!selectedTemplate?.fieldMapping
    });
  }, [selectedTemplate]);

  // Template selection handler - แก้ไขให้รีเซ็ตข้อมูลและประมวลผลใหม่
  const handleTemplateChange = (newCollection: string) => {
    //console.log('Template change requested:', newCollection);
    //console.log('Available templates:', Object.keys(templates));
    
    if (!newCollection) {
      console.error('Empty collection provided');
      return;
    }
    
    const template = getTemplateByCollection(newCollection);
    if (!template) {
      console.error('Template not found for collection:', newCollection);
      //console.log('Available templates:', getAllTemplates().map(t => t.collection));
      return;
    }
    
    //console.log('Setting collection to:', newCollection);
    setSelectedCollection(newCollection);
  };

  // Cell editing functions
  const handleCellEdit = (rowIndex: number, field: string, currentValue: string) => {
    setEditingCell({ rowIndex, field });
    setEditValue(currentValue);
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
      originalIndex: index.toString()
    }));

    if (searchTerm) {
      dataWithIndex = dataWithIndex.filter(row =>
        Object.values(row).some(value => 
          value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    switch (filterType) {
      case 'errors':
        return dataWithIndex.filter(row => 
          processingErrors.some(e => 
            e.message.includes(`แถวที่ ${parseInt(row.originalIndex) + dataRowOffset}`)
          )
        );
      case 'duplicates':
        return dataWithIndex.filter(row => 
          duplicateChecks.some(d => d.rowIndex === parseInt(row.originalIndex))
        );
      case 'valid':
        return dataWithIndex.filter(row => 
          !processingErrors.some(e => 
            e.message.includes(`แถวที่ ${parseInt(row.originalIndex) + dataRowOffset}`)
          ) &&
          !duplicateChecks.some(d => d.rowIndex === parseInt(row.originalIndex))
        );
      default:
        return dataWithIndex;
    }
  }, [getCurrentData, searchTerm, filterType, processingErrors, duplicateChecks, dataRowOffset]);

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
      setSelectedRows(new Set(filteredData.map(row => parseInt(row.originalIndex))));
    }
  };

  // Import data - แก้ไขให้ใช้ collection ที่เลือกอย่างถูกต้อง
 const handleImport = async () => {
    //console.log('=== Import Started ===');
    //console.log('selectedTemplate:', selectedTemplate);
    //console.log('selectedCollection:', selectedCollection);
    
    if (!selectedTemplate) {
      console.error('No template selected!');
      //console.log('Available templates:', getAllTemplates().map(t => ({ name: t.name, collection: t.collection })));
      alert('Please select a template first');
      return;
    }
    
    if (!selectedTemplate.collection) {
      console.error('Template has no collection!');
      alert('Template configuration error - no collection specified');
      return;
    }
    
    //console.log('Importing to collection:', selectedTemplate.collection);
    //console.log('Template name:', selectedTemplate.name);
    
    const rowsToImport = selectedRows.size > 0 
      ? mappedData.filter((_, index) => selectedRows.has(index))
      : mappedData.filter((_, index) => 
          !duplicateChecks.some(d => d.rowIndex === index) && 
          !processingErrors.some(e => 
            e.message.includes(`แถวที่ ${index + dataRowOffset}`)
          )
        );

    if (rowsToImport.length === 0) {
      alert('No valid records to import.');
      return;
    }

    //console.log(`Preparing to import ${rowsToImport.length} records`);

    setIsImporting(true);
    setImportProgress(0);
    const results: ImportResults = { 
      success: 0, 
      failed: 0, 
      skipped: mappedData.length - rowsToImport.length, 
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
          
          //console.log(`Importing record ${i + 1}/${rowsToImport.length} to collection "${selectedTemplate.collection}":`, payload);
          
          const docRef = await addDoc(collection(db, selectedTemplate.collection), payload);
          console.log(`Successfully imported record ${i + 1}, doc ID:`, docRef.id);
          results.success++;
        } catch (error) {
          console.error(`Import error for record ${i + 1}:`, error);
          results.failed++;
          const originalRowIndex = mappedData.findIndex(p => p === recordData);
          results.errors.push(
            `แถวที่ ${originalRowIndex + dataRowOffset}: ${
              error instanceof Error ? error.message : 'Import failed'
            }`
          );
        }
        setImportProgress(Math.round(((i + 1) / rowsToImport.length) * 100));
      }
      
      //console.log('=== Import Completed ===');
      //console.log('Results:', results);
      setImportResults(results);
      setImportComplete(true);
      setCurrentStep(3);
    } catch (error: unknown) {
      //console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during import';
      alert(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  // Utility functions
  const downloadTemplate = () => {
    if (selectedTemplate) {
      const headers = Object.keys(selectedTemplate.fieldMapping).join(',');
      const desc = Object.keys(selectedTemplate.fieldMapping)
        .map((key) => selectedTemplate.fieldDescriptions?.[key] || '')
        .join(',');
      const csvContent = [headers, desc, ''].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedTemplate.collection}_template.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportErrorReport = () => {
    const errorRows = filteredData.filter(row => {
      const hasError = processingErrors.some(error =>
        error.message.includes(`แถวที่ ${parseInt(row.originalIndex) + dataRowOffset}`)
      );
      const hasDuplicate = duplicateChecks.some(dup => dup.rowIndex === parseInt(row.originalIndex));
      return hasError || hasDuplicate;
    });

    if (errorRows.length === 0) {
      alert('No errors to export');
      return;
    }

    const csvContent = [
      ['Row', ...headers, 'Error Type', 'Error Details'].join(','),
      ...errorRows.map(row => {
        const rowError = processingErrors.find(error =>
          error.message.includes(`แถวที่ ${parseInt(row.originalIndex) + dataRowOffset}`)
        );
        const duplicate = duplicateChecks.find(dup => dup.rowIndex === parseInt(row.originalIndex));
        
        const errorType = duplicate ? 'Duplicate' : 'Validation';
        const errorDetails = duplicate 
          ? `${duplicate.duplicateFields.join(', ')} (${duplicate.duplicateType})`
          : rowError?.message || '';

        return [
          parseInt(row.originalIndex) + dataRowOffset,
          ...headers.map(header => `"${row[header] ?? ''}"`),
          errorType,
          `"${errorDetails}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTemplate?.collection || 'data'}_import_errors_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setCurrentStep(1);
    setHeaders([]);
    setPreviewData([]);
    setMappedData([]);
    setProcessingErrors([]);
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
    return processingErrors.some(error =>
      error.message.includes(`แถวที่ ${rowIndex + dataRowOffset}`)
    );
  };

  // Statistics
  const totalRecords = previewData.length;
  const uniqueDuplicateRows = new Set(duplicateChecks.map(d => d.rowIndex)).size;
  const uniqueErrorRows = new Set(
    processingErrors
      .map(error => {
        const match = error.message.match(/แถวที่ (\d+):/);
        return match ? parseInt(match[1]) - dataRowOffset : -1;
      })
      .filter(rowIndex => rowIndex >= 0)
  ).size;
  
  const rowsWithIssues = new Set([
    ...duplicateChecks.map(d => d.rowIndex),
    ...processingErrors
      .map(error => {
        const match = error.message.match(/แถวที่ (\d+):/);
        return match ? parseInt(match[1]) - dataRowOffset : -1;
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
                  currentStep >= step.num ? 'bg-blue-600 scale-110' : 'bg-gray-300'
                }`}>
                  {currentStep > step.num ? <FaCheck /> : <step.icon />}
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
        {currentStep === 1 && (
          <div className="p-6 mb-8 bg-white rounded-lg shadow-md">
            <h2 className="mb-6 text-2xl font-semibold">Select Template & Upload CSV File</h2>

            {/* Template Selection */}
            <div className="mb-8">              
              <label className="block mb-3 text-lg font-medium text-gray-700">
                Select Data Type
              </label>
              <select
                className="w-full p-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => handleTemplateChange(e.target.value)}
                value={selectedCollection}
              >
                {selectedCollection === '' && (
                  <option value="" disabled>Choose a template...</option>
                )}
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
                  disabled={isProcessing}
                />
                <label
                  htmlFor="csvFile"
                  className={`inline-block px-6 py-3 rounded-lg cursor-pointer transition-all ${
                    isProcessing
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                  }`}
                >
                  {isProcessing ? (
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
        {currentStep === 2 && (
          <div className="p-6 mb-8 bg-white rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Preview & Validate Data</h2>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Collection: <span className="font-medium text-blue-600">{selectedTemplate?.collection}</span>
                </div>
                {/* Template selector in step 2 */}
                <select
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  value={selectedCollection}
                >
                  {templates.map(template => (
                    <option key={template.collection} value={template.collection}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {isCheckingDuplicates && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <FaSpinner className="animate-spin" />
                    <span className="text-sm">Validating data...</span>
                  </div>
                )}
              </div>
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
                    <div>• {uniqueErrorRows} row(s) with validation errors ({processingErrors.length} total errors)</div>
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
                      {headers.slice(0, 6).map((header, index) => (
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
                      const actualIndex = parseInt(row.originalIndex);
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
                                {actualIndex + dataRowOffset}
                              </span>
                              {(rowStatus || hasError) && (
                                <FaExclamationTriangle 
                                  className="text-xs text-red-500" 
                                  title={rowStatus ? `Duplicate: ${rowStatus.duplicateFields.join(', ')}` : 'Validation Error'}
                                />
                              )}
                            </div>
                          </td>
                          {headers.slice(0, 6).map((header, colIndex) => (
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
                                    {row[header] ?? ''}
                                  </span>
                                  <button
                                    onClick={() => handleCellEdit(actualIndex, header, row[header] ?? '')}
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
                onClick={() => setCurrentStep(1)}
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
                <span>Importing to {selectedTemplate?.collection}...</span>
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
                <p>• Imported to collection: <span className="font-medium">{selectedTemplate?.collection}</span></p>
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