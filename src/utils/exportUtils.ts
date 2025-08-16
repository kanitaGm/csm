// src/utils/exportUtils.ts - Complete Implementation
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Sarabun-Regular-normal'; // Font file import
import { format } from 'date-fns';
import { formatDate } from './dateUtils';
import type { DateInput } from './dateUtils';
import type { CSMVendor, CSMAssessment, CSMAssessmentSummary } from '../types';

// ========================================
// TYPES & INTERFACES
// ========================================

export interface ExportData {
  [key: string]: unknown;
}

export interface ExportHeaders {
  [key: string]: string;
}

export type ExportFormat = 'generic' | 'excel' | 'csv' | 'pdf' | 'json';

export interface ExportOptions {
  includeTimestamp?: boolean;
  maxFileSize?: number; // in MB
  progressCallback?: (progress: number) => void;
  sheetName?: string;
  author?: string;
  description?: string;
  encoding?: string;
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
  fileSize?: number;
  recordCount?: number;
}

// ========================================
// ERROR CLASSES
// ========================================

export class ExportError extends Error {
  public readonly exportType: string;
  
  constructor(message: string, exportType: string) {
    super(`${exportType} Export Error: ${message}`);
    this.name = 'ExportError';
    this.exportType = exportType;
  }
}

export class FileSizeError extends ExportError {
  constructor(actualSize: number, maxSize: number, exportType: string) {
    super(`File size ${actualSize}MB exceeds maximum ${maxSize}MB`, exportType);
    this.name = 'FileSizeError';
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

const getTimestamp = (() => {
  let cached: string | null = null;
  let lastCall = 0;
  const CACHE_DURATION = 1000; // 1 second
  
  return (): string => {
    const now = Date.now();
    if (!cached || now - lastCall > CACHE_DURATION) {
      cached = format(new Date(), 'yyMMddHHmmss');
      lastCall = now;
    }
    return cached;
  };
})();

const isValidDateInput = (value: unknown): value is DateInput => {
  if (value === null || value === undefined) return false;
  
  return value instanceof Date || 
         typeof value === 'string' || 
         (typeof value === 'object' && 
          value !== null && 
          'toDate' in value);
};

export const isValidExportData = (data: unknown[]): data is ExportData[] => {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }
  
  return data.every(item => 
    typeof item === 'object' && 
    item !== null && 
    !Array.isArray(item)
  );
};

export const calculateDataSize = (data: ExportData[]): number => {
  const jsonString = JSON.stringify(data);
  return new Blob([jsonString]).size / (1024 * 1024); // Size in MB
};

export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
};

const escapeCSVValue = (value: unknown): string => {
  const stringValue = String(value ?? '');
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

// ========================================
// CORE EXPORT FUNCTIONS
// ========================================

/**
 * Prepare export data with formatting and headers
 */
export const prepareExportData = (
  data: ExportData[], 
  fields: string[], 
  headers: ExportHeaders = {}, 
  exportFormat: ExportFormat = 'generic',
  options: ExportOptions = {}
): ExportData[] => {
  if (!isValidExportData(data)) {
    throw new ExportError('Invalid input data format', exportFormat);
  }

  const { progressCallback } = options;
  const total = data.length;
  
  return data.map((item: ExportData, index: number) => {
    // Progress callback for large datasets
    if (progressCallback && index % 100 === 0) {
      progressCallback((index / total) * 50); // 50% for data prep
    }

    const formatted: ExportData = {};

    fields.forEach((key: string) => {
      let value = item[key];

      // Enhanced date formatting with proper type checking
      if (['trainingDate', 'expiryDate', 'updatedAt', 'createdAt', 'assessmentDate'].includes(key)) {
        try {
          if (isValidDateInput(value)) {
            value = formatDate(value);
          } else {
            value = '';
          }
        } catch (error) {
          console.warn(`Date formatting error for ${key}:`, error);
          value = '';
        }
      }

      // Handle complex objects
      if (typeof value === 'object' && value !== null) {
        if (value instanceof Date) {
          value = formatDate(value);
        } else {
          value = JSON.stringify(value);
        }
      }

      formatted[headers[key] || key] = value ?? '';
    });

    return formatted;
  });
};

/**
 * Enhanced Excel Export with ExcelJS
 */
export const exportToExcel = async (
  data: ExportData[], 
  filename: string = 'export',
  options: ExportOptions = {}
): Promise<ExportResult> => {
  const { 
    maxFileSize = 50, 
    progressCallback, 
    includeTimestamp = true,
    sheetName = 'Data',
    author = 'System',
    description = 'Exported data'
  } = options;
  
  try {
    // Validate data size
    const dataSize = calculateDataSize(data);
    if (dataSize > maxFileSize) {
      throw new FileSizeError(dataSize, maxFileSize, 'Excel');
    }

    progressCallback?.(10);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = author;
    workbook.created = new Date();
    workbook.description = description;

    const worksheet = workbook.addWorksheet(sheetName);

    if (data.length === 0) {
      throw new ExportError('No data to export', 'Excel');
    }

    // Get headers from first row
    const headers = Object.keys(data[0]?? {});
    
    // Add header row with styling
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '16A085' }
    };

    progressCallback?.(30);

    // Add data rows
    data.forEach((row, index) => {
      worksheet.addRow(Object.values(row));
      
      if (progressCallback && index % 100 === 0) {
        progressCallback(30 + (index / data.length) * 50);
      }
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.values && column.values.length > 0) {
        let maxLength = 10;
        column.values.forEach(value => {
          if (value) {
            const length = String(value).length;
            if (length > maxLength) {
              maxLength = Math.min(length + 2, 50);
            }
          }
        });
        column.width = maxLength;
      }
    });

    progressCallback?.(80);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const finalFilename = includeTimestamp 
      ? `${sanitizeFilename(filename)}_${getTimestamp()}.xlsx`
      : `${sanitizeFilename(filename)}.xlsx`;

    // Download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', finalFilename);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    progressCallback?.(100);

    return {
      success: true,
      filename: finalFilename,
      fileSize: blob.size / (1024 * 1024),
      recordCount: data.length
    };

  } catch (error) {
    console.error('Excel export error:', error);
    
    if (error instanceof ExportError) {
      throw error;
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export Excel file'
    };
  }
};

/**
 * CSV Export Function
 */
export const exportToCSV = (
  data: ExportData[], 
  filename: string = 'export',
  options: ExportOptions = {}
): ExportResult => {
  const { 
    includeTimestamp = true,
    encoding = 'utf-8',
    progressCallback
  } = options;

  try {
    if (!isValidExportData(data)) {
      throw new ExportError('Invalid export data format', 'CSV');
    }

    if (data.length === 0) {
      throw new ExportError('No data to export', 'CSV');
    }

    progressCallback?.(20);

    // Get headers
    const headers = Object.keys(data[0]?? {});
    
    // Create CSV content
    const csvRows = [
      headers.join(','),
      ...data.map((row, index) => {
        if (progressCallback && index % 100 === 0) {
          progressCallback(20 + (index / data.length) * 60);
        }
        return headers.map(header => escapeCSVValue(row[header])).join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    
    // Add BOM for UTF-8 encoding (helps with Excel compatibility)
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { 
      type: `text/csv;charset=${encoding}` 
    });

    const finalFilename = includeTimestamp 
      ? `${sanitizeFilename(filename)}_${getTimestamp()}.csv`
      : `${sanitizeFilename(filename)}.csv`;

    // Download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', finalFilename);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    progressCallback?.(100);

    return {
      success: true,
      filename: finalFilename,
      fileSize: blob.size / (1024 * 1024),
      recordCount: data.length
    };

  } catch (error) {
    console.error('CSV export error:', error);
    
    if (error instanceof ExportError) {
      throw error;
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export CSV file'
    };
  }
};

/**
 * PDF Export Function
 */
export const exportToPDF = (
  data: ExportData[], 
  filename: string = 'export', 
  headers?: string[],
  options: ExportOptions = {}
): ExportResult => {
  const { 
    includeTimestamp = true,
    author = 'System',
    description = 'Exported data'
  } = options;

  try {
    if (!isValidExportData(data)) {
      throw new ExportError('Invalid export data format', 'PDF');
    }

    if (data.length === 0) {
      throw new ExportError('No data to export', 'PDF');
    }

    // Create PDF document
    const doc = new jsPDF();
    
    // Set metadata
    doc.setProperties({
      title: filename,
      subject: description,
      author: author,
      creator: 'Export System'
    });

    // Prepare table data
    const tableHeaders = headers || Object.keys(data[0]?? {});
    const tableData = data.map(row => 
      tableHeaders.map(header => String(row[header] ?? ''))
    );

    // Add table using autoTable
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 20,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 20, bottom: 20, left: 10, right: 10 }
    });

    // Add footer with timestamp
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Generated on ${new Date().toLocaleString('th-TH')} | Page ${i} of ${pageCount}`,
        10,
        doc.internal.pageSize.height - 10
      );
    }

    // Generate and download
    const finalFilename = includeTimestamp 
      ? `${sanitizeFilename(filename)}_${getTimestamp()}.pdf`
      : `${sanitizeFilename(filename)}.pdf`;

    doc.save(finalFilename);

    // Calculate approximate file size (PDF is compressed)
    const estimatedSize = (tableData.length * tableHeaders.length * 50) / (1024 * 1024);

    return {
      success: true,
      filename: finalFilename,
      fileSize: estimatedSize,
      recordCount: data.length
    };

  } catch (error) {
    console.error('PDF export error:', error);
    
    if (error instanceof ExportError) {
      throw error;
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export PDF file'
    };
  }
};

/**
 * JSON Export Function
 */
export const exportToJSON = (
  data: ExportData[], 
  filename: string = 'export',
  options: ExportOptions = {}
): ExportResult => {
  const { includeTimestamp = true } = options;

  try {
    if (!isValidExportData(data)) {
      throw new ExportError('Invalid export data format', 'JSON');
    }

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    const finalFilename = includeTimestamp 
      ? `${sanitizeFilename(filename)}_${getTimestamp()}.json`
      : `${sanitizeFilename(filename)}.json`;
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', finalFilename);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return {
      success: true,
      filename: finalFilename,
      fileSize: blob.size / (1024 * 1024),
      recordCount: data.length
    };
    
  } catch (error) {
    console.error('JSON export error:', error);
    
    if (error instanceof ExportError) {
      throw error;
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export JSON file'
    };
  }
};

// ========================================
// CSM SPECIALIZED EXPORT FUNCTIONS
// ========================================

/**
 * CSM Risk Level Helper
 */
const getCSMRiskLevelThai = (riskLevel: string | undefined): string => {
  switch (riskLevel?.toLowerCase()) {
    case 'low': return 'ต่ำ';
    case 'moderate': 
    case 'medium': return 'ปานกลาง';
    case 'high': return 'สูง';
    default: return 'ไม่ระบุ';
  }
};

/**
 * CSM Assessment Status Helper
 */
const getCSMAssessmentStatus = (assessment: CSMAssessment): string => {
  if (assessment.isApproved) return 'อนุมัติแล้ว';
  if (assessment.isFinish) return 'เสร็จสิ้น';
  return 'กำลังดำเนินการ';
};

/**
 * Export CSM Vendors to Excel
 */
export const exportVendorsToExcel = async (
  vendors: CSMVendor[], 
  assessmentSummaries: CSMAssessmentSummary[] = [],
  filename: string = 'CSM_Vendors'
): Promise<ExportResult> => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CSM Vendors');

    // Prepare CSM vendor data
    const csmData = vendors.map(vendor => {
      const summary = assessmentSummaries.find(s => s.vdCode === vendor.vdCode);
      
      return {
        'รหัสผู้รับเหมา': vendor.vdCode,
        'ชื่อผู้รับเหมา': vendor.vdName,
        'หมวดหมู่': vendor.category || 'ไม่ระบุ',
        'พื้นที่ทำงาน': Array.isArray(vendor.workingArea) 
          ? vendor.workingArea.join(', ') 
          : vendor.workingArea || 'ไม่ระบุ',
        'ความถี่การประเมิน (วัน)': vendor.freqAss || '365',
        'สถานะ': vendor.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน',
        'การประเมินล่าสุด': summary 
          ? formatDate(summary.lastAssessmentDate)
          : 'ยังไม่ประเมิน',
        'คะแนนล่าสุด (%)': summary 
          ? summary.avgScore.toString()
          : '-',
        'ระดับความเสี่ยง': summary 
          ? getCSMRiskLevelThai(summary.riskLevel)
          : 'ไม่ระบุ',
        'วันที่สร้าง': formatDate(vendor.createdAt),
        'ผู้สร้าง': vendor.createdBy,
        'อัปเดตล่าสุด': formatDate(vendor.updatedAt)
      };
    });

    // Add headers with styling
    const headers = Object.keys(csmData[0] || {});
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '16A085' }
    };

    // Add data
    csmData.forEach(row => {
      worksheet.addRow(Object.values(row));
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.values && column.values.length > 0) {
        let maxLength = 10;
        column.values.forEach(value => {
          if (value) {
            const length = String(value).length;
            if (length > maxLength) {
              maxLength = Math.min(length + 2, 50);
            }
          }
        });
        column.width = maxLength;
      }
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const finalFilename = `${filename}_${getTimestamp()}.xlsx`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', finalFilename);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return {
      success: true,
      filename: finalFilename,
      fileSize: blob.size / (1024 * 1024),
      recordCount: vendors.length
    };

  } catch (error) {
    console.error('CSM Vendors Excel export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
};

/**
 * Export CSM Assessments to Excel
 */
export const exportAssessmentsToExcel = async (
  assessments: CSMAssessment[],
  vendors: CSMVendor[] = [],
  filename: string = 'CSM_Assessments'
): Promise<ExportResult> => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CSM Assessments');

    const assessmentData = assessments.map(assessment => {
      const vendor = vendors.find(v => v.vdCode === assessment.vdCode);
      
      return {
        'รหัสผู้รับเหมา': assessment.vdCode,
        'ชื่อผู้รับเหมา': assessment.vdName,
        'หมวดหมู่': assessment.vdCategory || vendor?.category || 'ไม่ระบุ',
        'วันที่ประเมิน': formatDate(assessment.approvedAt),
        'ผู้ประเมิน': assessment.auditor?.name || 'ไม่ระบุ',
        'คะแนนรวม': assessment.totalScore || '0',
        'คะแนนเต็ม': assessment.maxScore || '100',
        'คะแนนเฉลี่ย (%)': assessment.avgScore || '0',
        'ระดับความเสี่ยง': getCSMRiskLevelThai(assessment.riskLevel),
        'สถานะ': getCSMAssessmentStatus(assessment),
        'วันที่เสร็จสิ้น': assessment.finishedAt 
          ? formatDate(assessment.finishedAt)
          : 'ยังไม่เสร็จ',
        'หมายเหตุ': assessment.answers || ''
      };
    });

    // Add headers with styling
    const headers = Object.keys(assessmentData[0] || {});
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2E86AB' }
    };

    // Add data
    assessmentData.forEach(row => {
      worksheet.addRow(Object.values(row));
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.values && column.values.length > 0) {
        let maxLength = 10;
        column.values.forEach(value => {
          if (value) {
            const length = String(value).length;
            if (length > maxLength) {
              maxLength = Math.min(length + 2, 50);
            }
          }
        });
        column.width = maxLength;
      }
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const finalFilename = `${filename}_${getTimestamp()}.xlsx`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', finalFilename);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return {
      success: true,
      filename: finalFilename,
      fileSize: blob.size / (1024 * 1024),
      recordCount: assessments.length
    };

  } catch (error) {
    console.error('CSM Assessments Excel export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
};

// ========================================
// SAFE EXPORT WRAPPERS
// ========================================

export const safeExportToExcel = async (
  data: ExportData[], 
  filename?: string,
  options?: ExportOptions
): Promise<ExportResult> => {
  try {
    if (!isValidExportData(data)) {
      throw new ExportError('Invalid export data format', 'Excel');
    }
    return await exportToExcel(data, filename, options);
  } catch (error) {
    console.error('Safe Excel export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const safeExportToCSV = (
  data: ExportData[], 
  filename?: string,
  options?: ExportOptions
): ExportResult => {
  try {
    if (!isValidExportData(data)) {
      throw new ExportError('Invalid export data format', 'CSV');
    }
    return exportToCSV(data, filename, options);
  } catch (error) {
    console.error('Safe CSV export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const safeExportToPDF = (
  data: ExportData[], 
  filename?: string, 
  headers?: string[],
  options?: ExportOptions
): ExportResult => {
  try {
    if (!isValidExportData(data)) {
      throw new ExportError('Invalid export data format', 'PDF');
    }
    return exportToPDF(data, filename, headers, options);
  } catch (error) {
    console.error('Safe PDF export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const safeExportToJSON = (
  data: ExportData[], 
  filename?: string,
  options?: ExportOptions
): ExportResult => {
  try {
    if (!isValidExportData(data)) {
      throw new ExportError('Invalid export data format', 'JSON');
    }
    return exportToJSON(data, filename, options);
  } catch (error) {
    console.error('Safe JSON export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// ========================================
// LEGACY COMPATIBILITY & UTILITIES
// ========================================

export const validateExportData = isValidExportData;

// Default export for convenience
export default {
  exportToExcel,
  exportToCSV,
  exportToPDF,
  exportToJSON,
  exportVendorsToExcel,
  exportAssessmentsToExcel,
  prepareExportData,
  safeExportToExcel,
  safeExportToCSV,
  safeExportToPDF,
  safeExportToJSON,
  validateExportData,
  calculateDataSize,
  sanitizeFilename
};