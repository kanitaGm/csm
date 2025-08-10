// src/utils/CSVProcessor.ts - Optimized Version (Strict TypeScript)
import { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';

type CSVCellValue = string | number | boolean | null | undefined;

interface CSVRow extends Record<string, CSVCellValue> {
  originalIndex?: number;
}

interface CSVProcessorState {
  originalData: CSVRow[];
  previewData: CSVRow[];
  headers: string[];
  errors: { row: number; message: string }[];
  isProcessing: boolean;
  totalRows: number;
  validRows: number;
}

interface ValidationRule {
  field: string;
  required?: boolean;
  validator?: (value: unknown) => string | null;
  transformer?: (value: unknown) => unknown;
}

interface DuplicateResult {
  csvDuplicates: Array<{
    row: number;
    field: string;
    value: string;
    duplicateRows: number[];
  }>;
  dbDuplicates: Array<{
    row: number;
    field: string;
    value: string;
    existingId: string;
  }>;
}

export const useSimpleCSVProcessor = () => {
  const [state, setState] = useState<CSVProcessorState>({
    originalData: [],
    previewData: [],
    headers: [],
    errors: [],
    isProcessing: false,
    totalRows: 0,
    validRows: 0
  });

  //  Simple file parsing
  const parseFile = useCallback(async (
    file: File, 
    maxPreviewRows: number = 100
  ): Promise<void> => {
    setState(prev => ({ ...prev, isProcessing: true, errors: [] }));

    try {
      const parseResult = await new Promise<Papa.ParseResult<CSVRow>>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          encoding: 'UTF-8',
          delimitersToGuess: [',', '\t', '|', ';'],
          complete: resolve,
          error: reject
        });
      });

      if (parseResult.errors.length > 0) {
        console.warn('CSV parsing warnings:', parseResult.errors);
      }

      const { data, meta } = parseResult;
      const headers = meta.fields || Object.keys(data[0] || {});
      
      // Clean headers (remove BOM, trim whitespace)
      const cleanHeaders = headers.map(header => 
        header.replace(/^\uFEFF/, '').trim()
      );

      // Create preview data (limited rows for UI)
      const previewData = data.slice(0, maxPreviewRows).map((row, index) => ({
        ...row,
        originalIndex: index
      }));

      setState(prev => ({
        ...prev,
        originalData: data,
        previewData,
        headers: cleanHeaders,
        totalRows: data.length,
        validRows: data.length,
        isProcessing: false
      }));

    } catch (error) {
      console.error('Error parsing CSV:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        errors: [{ row: 0, message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}` }]
      }));
    }
  }, []);

  //  Simple validation
  const validateData = useCallback(async (
    validationRules: ValidationRule[]
  ): Promise<void> => {
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const allErrors: { row: number; message: string }[] = [];
      let validRowCount = 0;

      // Process data in chunks to avoid blocking UI
      const chunkSize = 100;
      const chunks = [];
      for (let i = 0; i < state.originalData.length; i += chunkSize) {
        chunks.push(state.originalData.slice(i, i + chunkSize));
      }

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        
        chunk.forEach((row, rowIndex) => {
          const globalRowIndex = chunkIndex * chunkSize + rowIndex;
          let hasError = false;

          validationRules.forEach(rule => {
            const value = row[rule.field];
            
            // Transform value
            const transformedValue = rule.transformer ? rule.transformer(value) : value;
            
            // Required validation
            if (rule.required && (!transformedValue || transformedValue.toString().trim() === '')) {
              allErrors.push({
                row: globalRowIndex,
                message: `${rule.field} is required`
              });
              hasError = true;
            }
            
            // Custom validation
            if (rule.validator && transformedValue) {
              const validationError = rule.validator(transformedValue);
              if (validationError) {
                allErrors.push({
                  row: globalRowIndex,
                  message: `${rule.field}: ${validationError}`
                });
                hasError = true;
              }
            }
          });

          if (!hasError) validRowCount++;
        });

        // Yield control to prevent UI blocking
        if (chunkIndex % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      setState(prev => ({
        ...prev,
        errors: allErrors,
        validRows: validRowCount,
        isProcessing: false
      }));

    } catch (error) {
      console.error('Error validating data:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        errors: [{ row: 0, message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }]
      }));
    }
  }, [state.originalData]);

  //  Process data in chunks
  const processDataInChunks = useCallback(async <T>(
    processor: (chunk: CSVRow[], chunkIndex: number) => Promise<T[]>,
    options: { chunkSize?: number; onProgress?: (progress: number) => void } = {}
  ): Promise<T[]> => {
    const { chunkSize = 100, onProgress } = options;
    const results: T[] = [];

    // Split data into chunks
    const chunks = [];
    for (let i = 0; i < state.originalData.length; i += chunkSize) {
      chunks.push(state.originalData.slice(i, i + chunkSize));
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunkResults = await processor(chunks[i], i);
      results.push(...chunkResults);

      // Report progress
      if (onProgress) {
        const progress = Math.round(((i + 1) / chunks.length) * 100);
        onProgress(progress);
      }

      // Yield control periodically
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    return results;
  }, [state.originalData]);

  //  Simple duplicate detection
  const findDuplicates = useCallback(async (
    fields: string[],
    checkAgainstDatabase?: (values: string[]) => Promise<Array<{ value: string; id: string }>>
  ): Promise<DuplicateResult> => {
    const csvDuplicates: Array<{
      row: number;
      field: string;
      value: string;
      duplicateRows: number[];
    }> = [];
    const dbDuplicates: Array<{
      row: number;
      field: string;
      value: string;
      existingId: string;
    }> = [];

    // Track values seen in CSV
    const csvValueTracker = new Map<string, Map<string, number[]>>();
    
    // Initialize trackers for each field
    fields.forEach(field => {
      csvValueTracker.set(field, new Map());
    });

    // Find CSV duplicates
    state.originalData.forEach((row, index) => {
      fields.forEach(field => {
        const value = row[field];
        if (value && value.toString().trim()) {
          const normalizedValue = value.toString().toLowerCase().trim();
          const fieldTracker = csvValueTracker.get(field);
          
          if (fieldTracker) {
            if (!fieldTracker.has(normalizedValue)) {
              fieldTracker.set(normalizedValue, []);
            }
            const rowList = fieldTracker.get(normalizedValue);
            if (rowList) {
              rowList.push(index);
            }
          }
        }
      });
    });

    // Identify duplicates
    csvValueTracker.forEach((fieldTracker, field) => {
      fieldTracker.forEach((rows, value) => {
        if (rows.length > 1) {
          rows.forEach((row, index) => {
            if (index > 0) {
              csvDuplicates.push({
                row,
                field,
                value,
                duplicateRows: rows
              });
            }
          });
        }
      });
    });

    // Check against database if function provided
    if (checkAgainstDatabase) {
      const uniqueValues = new Map<string, Set<string>>();
      
      fields.forEach(field => {
        uniqueValues.set(field, new Set());
        state.originalData.forEach(row => {
          const value = row[field];
          if (value && value.toString().trim()) {
            const fieldSet = uniqueValues.get(field);
            if (fieldSet) {
              fieldSet.add(value.toString().toLowerCase().trim());
            }
          }
        });
      });

      // Check in batches
      for (const [field, values] of uniqueValues) {
        const valueArray = Array.from(values);
        const existingRecords = await checkAgainstDatabase(valueArray);
        
        existingRecords.forEach(record => {
          state.originalData.forEach((row, index) => {
            const rowValue = row[field];
            if (rowValue && rowValue.toString().toLowerCase().trim() === record.value.toLowerCase()) {
              dbDuplicates.push({
                row: index,
                field,
                value: record.value,
                existingId: record.id
              });
            }
          });
        });
      }
    }

    return { csvDuplicates, dbDuplicates };
  }, [state.originalData]);

  const exportToCSV = useCallback((
    data: CSVRow[],
    filename: string,
    headers?: string[]
  ): void => {
    try {
      const csvContent = Papa.unparse({
        fields: headers || state.headers,
        data: data
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up object URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  }, [state.headers]);

  //  Reset state
  const reset = useCallback((): void => {
    setState({
      originalData: [],
      previewData: [],
      headers: [],
      errors: [],
      isProcessing: false,
      totalRows: 0,
      validRows: 0
    });
  }, []);

  //  Computed stats
  const computedStats = useMemo(() => ({
    errorCount: state.errors.length,
    errorRate: state.totalRows > 0 ? (state.errors.length / state.totalRows) * 100 : 0,
    successRate: state.totalRows > 0 ? (state.validRows / state.totalRows) * 100 : 0,
    hasData: state.totalRows > 0,
    hasErrors: state.errors.length > 0
  }), [state.errors.length, state.totalRows, state.validRows]);

  return {
    state,
    parseFile,
    validateData,
    processDataInChunks,
    findDuplicates,
    exportToCSV,
    reset,
    stats: computedStats
  };
};

//  Export legacy hook for backward compatibility
export const useCSVProcessor = () => {
  const processor = useSimpleCSVProcessor();
  
  return {
    ...processor,
    processCSV: processor.parseFile,
    validateCSV: processor.validateData
  };
};