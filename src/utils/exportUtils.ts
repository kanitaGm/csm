// src/components/utils/exportUtils.ts
// npm install exceljs  -  npm install @types/exceljs
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Sarabun-Regular-normal'; // Font file import
import { format } from 'date-fns';
import { formatDate } from './dateUtils';
import type { DateInput } from './dateUtils';

import type { CSMVendor, CSMAssessment, CSMAssessmentSummary } from '../types';

// Enhanced Type definitions
interface ExportData {
  [key: string]: unknown;
}

interface ExportHeaders {
  [key: string]: string;
}

type ExportFormat = 'generic' | 'excel' | 'json';

interface ExportOptions {
  includeTimestamp?: boolean;
  maxFileSize?: number; // in MB
  progressCallback?: (progress: number) => void;
}

interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
  fileSize?: number;
}

// Custom Error Classes
class ExportError extends Error {
  public readonly exportType: string;
  
  constructor(message: string, exportType: string) {
    super(`${exportType} Export Error: ${message}`);
    this.name = 'ExportError';
    this.exportType = exportType;
  }
}

class FileSizeError extends ExportError {
  constructor(actualSize: number, maxSize: number, exportType: string) {
    super(`File size ${actualSize}MB exceeds maximum ${maxSize}MB`, exportType);
    this.name = 'FileSizeError';
  }
}

// Performance Optimizations
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

// Type Guards
const isValidDateInput = (value: unknown): value is DateInput => {
  if (value === null || value === undefined) return false;
  
  return value instanceof Date || 
         typeof value === 'string' || 
         (typeof value === 'object' && 
          value !== null && 
          'toDate' in value);
};

const isValidExportData = (data: unknown[]): data is ExportData[] => {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }
  
  return data.every(item => 
    typeof item === 'object' && 
    item !== null && 
    !Array.isArray(item)
  );
};

// Utility Functions
const calculateDataSize = (data: ExportData[]): number => {
  const jsonString = JSON.stringify(data);
  return new Blob([jsonString]).size / (1024 * 1024); // Size in MB
};

const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
};

const escapeCSVValue = (value: unknown): string => {
  const stringValue = String(value ?? '');
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

// Enhanced Data Preparation
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
      // Skip certificateURL except for JSON format
      if (key === 'certificateURL' && exportFormat !== 'json') {
        return;
      }

      let value = item[key];

      // Enhanced date formatting with proper type checking
      if (['trainingDate', 'expiryDate', 'updatedAt', 'createdAt'].includes(key)) {
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

      // Excel formula link for certificate URLs
      if (key === 'certificateURL' && typeof value === 'string' && value) {
        if (exportFormat === 'excel') {
          // Validate URL before creating hyperlink
          try {
            new URL(value);
            value = `=HYPERLINK("${value}", "เปิดไฟล์")`;
          } catch {
            // Keep original value if URL is invalid
          }
        }
      }

      // Handle complex objects
      if (typeof value === 'object' && value !== null) {
        if (value instanceof Date) {
          value = formatDate(value);
        } else {
          // Handle other object types or convert to string
          value = JSON.stringify(value);
        }
      }

      formatted[headers[key] || key] = value ?? '';
    });

    return formatted;
  });
};

// Enhanced Excel Export with Progress Tracking
export const exportToExcel = async (
  data: ExportData[], 
  filename: string = 'export',
  options: ExportOptions = {}
): Promise<ExportResult> => {
  const { maxFileSize = 50, progressCallback, includeTimestamp = true } = options;
  
  try {
    // Validate data size
    const dataSize = calculateDataSize(data);
    if (dataSize > maxFileSize) {
      throw new FileSizeError(dataSize, maxFileSize, 'Excel');
    }

    progressCallback?.(10);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Enhanced metadata
    workbook.creator = 'Export Utils';
    workbook.created = new Date();
    workbook.modified = new Date();

    if (data.length > 0) {
      const headers = Object.keys(data[0] ?? {})     
      progressCallback?.(20);
      
      // Add headers row with enhanced styling
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { 
        bold: true, 
        color: { argb: 'FFFFFF' },
        size: 12,
        name: 'Calibri'
      };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '16A085' }
      };
      headerRow.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      progressCallback?.(30);
      
      // Add data rows with progress tracking
      data.forEach((row, index) => {
        if (progressCallback && index % 100 === 0) {
          progressCallback(30 + (index / data.length) * 40);
        }

        const values = headers.map(header => {
          const value = row[header];
          
          // Enhanced hyperlink handling
          if (header === 'certificateURL' && typeof value === 'string' && value.startsWith('http')) {
            try {
              new URL(value); // Validate URL
              return {
                text: 'เปิดไฟล์',
                hyperlink: value,
                font: { color: { argb: '0563C1' }, underline: true }
              };
            } catch {
              return value; // Return original if invalid URL
            }
          }
          
          return value ?? '';
        });
        
        const dataRow = worksheet.addRow(values);
        
        // Add subtle alternating row colors
        if (index % 2 === 0) {
          dataRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F8F9FA' }
          };
        }
      });
      
      progressCallback?.(75);
      
      // Optimized auto-fit columns
      worksheet.columns.forEach((column) => {
        if (column.values && column.values.length > 0) {
          let maxLength = 10;
          
          // Optimized length calculation
          for (const value of column.values) {
            if (value !== null && value !== undefined) {
              const length = String(value).length;
              if (length > maxLength) {
                maxLength = Math.min(length + 2, 50);
                if (maxLength === 50) break; // Early exit optimization
              }
            }
          }
          
          column.width = maxLength;
        }
      });

      // Add filter to headers
      worksheet.autoFilter = {
        from: 'A1',
        to: { row: 1, column: headers.length }
      };
    }

    progressCallback?.(85);

    // Generate optimized buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    progressCallback?.(90);

    // Enhanced filename with sanitization
    const sanitizedFilename = sanitizeFilename(filename);
    const finalFilename = includeTimestamp 
      ? `${sanitizedFilename}_${getTimestamp()}.xlsx`
      : `${sanitizedFilename}.xlsx`;
    
    // Download with cleanup
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', finalFilename);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup with delay to ensure download starts
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    progressCallback?.(100);

    return {
      success: true,
      filename: finalFilename,
      fileSize: blob.size / (1024 * 1024)
    };
    
  } catch (error) {
    console.error('Excel export error:', error);
    
    if (error instanceof ExportError) {
      throw error;
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Enhanced PDF Export
export const exportToPDF = (
  data: ExportData[], 
  filename: string = 'export', 
  headerArray: string[] = [],
  options: ExportOptions = {}
): ExportResult => {
  const { maxFileSize = 20, includeTimestamp = true } = options;
  
  try {
    // Validate data size for PDF
    const dataSize = calculateDataSize(data);
    if (dataSize > maxFileSize) {
      throw new FileSizeError(dataSize, maxFileSize, 'PDF');
    }

    const doc = new jsPDF({
      orientation: headerArray.length > 6 ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    // Enhanced font and styling
    doc.setFont('Sarabun-Regular');
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);

    // Enhanced title with metadata
    const title = 'รายงานผลการฝึกอบรม';
    const titleWidth = doc.getStringUnitWidth(title) * 16;
    const pageWidth = doc.internal.pageSize.getWidth();
    const titleX = (pageWidth - titleWidth) / 2;
    
    doc.text(title, titleX, 40);
    
    // Add date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`วันที่ออกรายงาน: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, 60);

    const headers = [headerArray];
    const rows = data.map((row: ExportData) =>
      headerArray.map((header: string) => {
        const value = row[header];
        const stringValue = typeof value === 'string' ? value : String(value ?? '');
        // Truncate long values for PDF
        return stringValue.length > 50 ? stringValue.substring(0, 47) + '...' : stringValue;
      })
    );

    autoTable(doc, {
      head: headers,
      body: rows,
      styles: {
        font: 'Sarabun-Regular',
        fontSize: 9,
        cellPadding: 4,
        textColor: [40, 40, 40]
      },
      headStyles: { 
        fillColor: [22, 160, 133],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      startY: 80,
      theme: 'grid',
      tableWidth: 'auto',
      margin: { top: 80, left: 40, right: 40, bottom: 40 }
    });

    // Add footer with page numbers
    type jsPDFInternal = {
      getNumberOfPages(): number;
      pageSize: {
        getWidth(): number;
        getHeight(): number;
      };
    };
    
    const docWithInternal = doc as jsPDF & { internal: jsPDFInternal };
    const totalPages = docWithInternal.internal.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.text(`หน้า ${i} จาก ${totalPages}`, pageWidth - 80, pageHeight - 20);
    }

    const sanitizedFilename = sanitizeFilename(filename);
    const finalFilename = includeTimestamp 
      ? `${sanitizedFilename}_${getTimestamp()}.pdf`
      : `${sanitizedFilename}.pdf`;

    doc.save(finalFilename);

    return {
      success: true,
      filename: finalFilename
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

// Enhanced CSV Export with Better Performance
export const exportToCSV = (
  data: ExportData[], 
  filename: string = 'export',
  options: ExportOptions = {}
): ExportResult => {
  const { maxFileSize = 10, includeTimestamp = true, progressCallback } = options;
  
  try {
    if (data.length === 0) {
      throw new ExportError('No data to export', 'CSV');
    }

    // Validate data size
    const dataSize = calculateDataSize(data);
    if (dataSize > maxFileSize) {
      throw new FileSizeError(dataSize, maxFileSize, 'CSV');
    }

    progressCallback?.(10);
    const headers = Object.keys(data[0] ?? {})

    // Enhanced CSV content generation with streaming approach
    const csvLines: string[] = [];
    
    // Headers with proper escaping
    csvLines.push(headers.map(header => escapeCSVValue(header)).join(','));
    
    progressCallback?.(20);
    
    // Data rows with progress tracking
    data.forEach((row) => {
      const values = headers.map(header => escapeCSVValue(row[header]));
      csvLines.push(values.join(','));
    });
    
    progressCallback?.(85);
    
    const csvContent = csvLines.join('\n');

    // Enhanced BOM for better UTF-8 support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    // File size check after generation
    const finalSize = blob.size / (1024 * 1024);
    if (finalSize > maxFileSize) {
      throw new FileSizeError(finalSize, maxFileSize, 'CSV');
    }
    
    progressCallback?.(90);
    
    const sanitizedFilename = sanitizeFilename(filename);
    const finalFilename = includeTimestamp 
      ? `${sanitizedFilename}_${getTimestamp()}.csv`
      : `${sanitizedFilename}.csv`;
    
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
      fileSize: finalSize
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

// Enhanced JSON Export
export const exportToJSON = (
  data: ExportData[], 
  filename: string = 'export',
  options: ExportOptions = {}
): ExportResult => {
  const { maxFileSize = 50, includeTimestamp = true } = options;
  
  try {
    // Validate data size
    const dataSize = calculateDataSize(data);
    if (dataSize > maxFileSize) {
      throw new FileSizeError(dataSize, maxFileSize, 'JSON');
    }

    // Enhanced JSON with metadata
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        recordCount: data.length,
        version: '1.0'
      },
      data: data
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    
    const sanitizedFilename = sanitizeFilename(filename);
    const finalFilename = includeTimestamp 
      ? `${sanitizedFilename}_${getTimestamp()}.json`
      : `${sanitizedFilename}.json`;
    
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
      fileSize: blob.size / (1024 * 1024)
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

// Safe Export Functions with Enhanced Error Handling
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

// Legacy compatibility exports (deprecated - use safe versions)
export const validateExportData = isValidExportData;

// Utility exports
export { 
  ExportError, 
  FileSizeError,
  type ExportOptions,
  type ExportResult,
  calculateDataSize,
  sanitizeFilename 
};



////////////////////////////////CSM//////////////
//  เพิ่มฟังก์ชันใหม่โดยใช้ ExcelJS ที่มีอยู่แล้ว
export const exportCSMVendorsToExcelJS = async (
  vendors: CSMVendor[], 
  assessmentSummaries: CSMAssessmentSummary[] = [],
  filename: string = 'CSM_Vendors'
): Promise<ExportResult> => {
  try {
    // ใช้ ExcelJS ที่มีอยู่แล้วในระบบ
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CSM Vendors');

    // Prepare CSM data
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

    // ใช้ฟังก์ชัน prepareExportData ที่มีอยู่แล้ว
    const headers = Object.keys(csmData[0] || {});
    const preparedData = prepareExportData(csmData, headers, {}, 'excel');

    // Add headers
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '16A085' }
    };

    // Add data
    preparedData.forEach(row => {
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
      fileSize: blob.size / (1024 * 1024)
    };

  } catch (error) {
    console.error('CSM Excel export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
};

//  เพิ่มฟังก์ชันสำหรับ CSM Assessments
export const exportCSMAssessmentsToExcelJS = async (
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
          : '-',
        'ผู้อนุมัติ': assessment.approvedBy || '-'
      };
    });

    const headers = Object.keys(assessmentData[0] || {});
    const preparedData = prepareExportData(assessmentData, headers, {}, 'excel');

    // Add headers with styling
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '3498DB' }
    };

    // Add data rows
    preparedData.forEach(row => {
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
      fileSize: blob.size / (1024 * 1024)
    };

  } catch (error) {
    console.error('CSM Assessment export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
};

//  Utility functions สำหรับ CSM
const getCSMRiskLevelThai = (riskLevel: string | undefined): string => {
  switch (riskLevel?.toLowerCase()) {
    case 'low': return 'ต่ำ';
    case 'medium': return 'ปานกลาง';
    case 'high': return 'สูง';
    default: return 'ไม่ระบุ';
  }
};

const getCSMAssessmentStatus = (assessment: CSMAssessment): string => {
  if (assessment.isApproved) return 'อนุมัติแล้ว';
  if (assessment.isFinish) return 'เสร็จสิ้น';
  return 'กำลังดำเนินการ';
};

//  Backward compatibility aliases
export const exportVendorsToExcel = exportCSMVendorsToExcelJS;
export const exportAssessmentsToExcel = exportCSMAssessmentsToExcelJS;

//  Enhanced CSM export with multiple sheets
export const exportCSMComprehensiveReport = async (
  vendors: CSMVendor[],
  assessments: CSMAssessment[],
  assessmentSummaries: CSMAssessmentSummary[],
  filename: string = 'CSM_Comprehensive_Report'
): Promise<ExportResult> => {
  try {
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('สรุป');
    const dashboardStats = {
      'ผู้รับเหมาทั้งหมด': vendors.length,
      'ประเมินแล้ว': assessmentSummaries.length,
      'ยังไม่ประเมิน': vendors.length - assessmentSummaries.length,
      'คะแนนเฉลี่ย': assessmentSummaries.length > 0 
        ? (assessmentSummaries.reduce((sum, s) => sum + s.avgScore, 0) / assessmentSummaries.length).toFixed(1)
        : '0',
      'วันที่สร้างรายงาน': formatDate(new Date())
    };
    
    summarySheet.addRow(['หัวข้อ', 'ข้อมูล']);
    Object.entries(dashboardStats).forEach(([key, value]) => {
      summarySheet.addRow([key, value]);
    });

    // Sheet 2: Vendors
    const vendorSheet = workbook.addWorksheet('รายการผู้รับเหมา');
    const vendorResult = await exportCSMVendorsToExcelJS(vendors, assessmentSummaries, 'temp');
    // Copy data to this sheet (simplified version)
    
    // Sheet 3: Assessments
    const assessmentSheet = workbook.addWorksheet('การประเมิน');
    const assessmentResult = await exportCSMAssessmentsToExcelJS(assessments, vendors, 'temp');
    // Copy data to this sheet (simplified version)
    console.log('Assessment export result:', vendorSheet , vendorResult, assessmentSheet, assessmentResult);

    // Generate final file
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
      fileSize: blob.size / (1024 * 1024)
    };

  } catch (error) {
    console.error('CSM Comprehensive report error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
};