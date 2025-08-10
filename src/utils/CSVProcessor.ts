// 📁 scr/components/utils/CSVProcessor.ts

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import type { CSVTemplateConfig } from './CSVTemplates';

export interface CSVProcessorState {
  currentStep: number;
  headers: string[];
  previewData: Record<string, string>[];
  mappedData: Record<string, unknown>[];
  errors: { message: string }[];
  dataRowOffset: number;
  isProcessing: boolean;
}

export interface CSVProcessorHook {
  state: CSVProcessorState;
  handleFileUpload: (file: File) => Promise<void>;
  processMapping: (template: CSVTemplateConfig, submittedBy?: string) => Promise<void>;
  downloadTemplate: (template: CSVTemplateConfig) => void;
  reset: () => void;
  goToStep: (step: number) => void;
}

export function useCSVProcessor(): CSVProcessorHook {
  const [state, setState] = useState<CSVProcessorState>({
    currentStep: 1,
    headers: [],
    previewData: [],
    mappedData: [],
    errors: [],
    dataRowOffset: 3,
    isProcessing: false,
  });

  const log = (message: string) => console.log(`[CSVProcessor] ${message}`);

  const handleFileUpload = useCallback(async (file: File) => {
    setState((prev) => ({ ...prev, isProcessing: true }));
    const text = await file.text();
    const parsed = Papa.parse<string[]>(text, {
      header: false,
      skipEmptyLines: true,
    });

    const rows = parsed.data as string[][];
    if (!rows || rows.length < 2) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        errors: [{ message: 'ไฟล์ต้องมีอย่างน้อย 2 แถว (header และข้อมูล)' }],
      }));
      return;
    }

    const rawHeaders = (rows[0] || []).map((h) => h?.trim());
    const headers = rawHeaders.filter((h) => h && !/^_\d+$/.test(h));

    if (headers.length === 0) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        errors: [{ message: 'ไม่พบหัวตารางในไฟล์ หรือหัวตารางว่างทั้งหมด' }],
      }));
      return;
    }

    const duplicates = headers.filter((item, index) => headers.indexOf(item) !== index);
    if (duplicates.length > 0) {
      console.warn('⚠️ Duplicate headers found:', duplicates);
      alert(`หัวตารางซ้ำ: ${duplicates.join(', ')}`);
    }
    if (new Set(headers).size !== headers.length) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        errors: [{ message: 'ไม่สามารถนำเข้าไฟล์ได้ เนื่องจากหัวตารางมีการซ้ำ' }],
      }));
      return;
    }

    const previewData = rows.slice(2).flatMap((row: string[]) => {
      const cleaned = headers.map((_ey, idx) => row[idx] || '');
      if (cleaned.every(val => !val.trim())) return [];
      const obj: Record<string, string> = {};
      headers.forEach((key, idx) => {
        obj[key] = cleaned[idx];
      });
      return [obj];
    });

    log(`Uploaded file with ${previewData.length} rows and headers: ${headers.join(', ')}`);
    setState((prev) => ({
      ...prev,
      headers,
      previewData,
      mappedData: [], // Reset mapped data
      errors: [], // Reset errors
      currentStep: 2,
      isProcessing: false,
    }));
  }, []);

  const processMapping = useCallback(async (template: CSVTemplateConfig, submittedBy = 'CSV Import') => {
    const { requiredFields, dateFields } = template;
    const mappedData: Record<string, unknown>[] = [];
    const errors: { message: string }[] = [];

    const seenKeys = new Set<string>();

    for (let i = 0; i < state.previewData.length; i++) {
      const row = state.previewData[i];
      const record: Record<string, unknown> = {};

      for (const field of state.headers) {
        if (row[field] !== undefined) {
          record[field] = typeof row[field] === 'string' ? row[field].trim() : String(row[field] || '').trim();
        }
      }

      for (const req of requiredFields) {
        if (!record[req]) {
          errors.push({ message: `แถวที่ ${i + state.dataRowOffset}: ขาดฟิลด์จำเป็น '${req}'` });
        }
      }

      for (const dateField of dateFields) {
        const rawValue = record[dateField];
        if (rawValue) {
          const date = new Date(String(rawValue));
          if (isNaN(date.getTime())) {
            errors.push({ message: `แถวที่ ${i + state.dataRowOffset}: วันที่ไม่ถูกต้องในช่อง '${dateField}'` });
          } else {
            record[`${dateField}Parsed`] = date;
          }
        }
      }

      const key = requiredFields.map((f) => String(record[f] || '').toLowerCase()).join('|');
      if (seenKeys.has(key)) {
        errors.push({ message: `แถวที่ ${i + state.dataRowOffset}: ซ้ำกันในไฟล์ CSV` });
      } else {
        seenKeys.add(key);
        record['importedBy'] = submittedBy;
        mappedData.push(record);
      }
    }

    // 🔄 Firestore Dupes - REMOVED - will be handled in ImportEmployeePage
    // const checkFirestoreDuplicates = async () => { ... }
    // await checkFirestoreDuplicates();

    log(`Processed ${mappedData.length} rows. Errors: ${errors.length}`);

    setState((prev) => ({
      ...prev,
      mappedData,
      errors,
      // DON'T CHANGE STEP HERE - let ImportEmployeePage handle it
      // currentStep: 3, // REMOVED THIS LINE
    }));
  }, [state.headers, state.previewData, state.dataRowOffset]);

  const downloadTemplate = useCallback((template: CSVTemplateConfig) => {
    const headers = Object.keys(template.fieldMapping).join(',');
    const desc = Object.keys(template.fieldMapping)
      .map((key) => template.fieldDescriptions?.[key] || '')
      .join(',');
    const csvContent = [headers, desc, ''].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${template.collection}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    log(`Downloaded template for ${template.collection}`);
  }, []);

  const reset = useCallback(() => {
    log('Reset processor state');
    setState({
      currentStep: 1,
      headers: [],
      previewData: [],
      mappedData: [],
      errors: [],
      dataRowOffset: 3,
      isProcessing: false,
    });
  }, []);

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  return {
    state,
    handleFileUpload,
    processMapping,
    downloadTemplate,
    reset,
    goToStep,
  };
}