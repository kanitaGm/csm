// src/components/utils/exportUtils.ts
// npm install exceljs  -  npm install @types/exceljs
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Sarabun-Regular-normal'; // Font file import
import { format } from 'date-fns';
import { formatDate } from './dateUtils';
//import type {  DateInput } from './dateUtils';

// Type definitions
interface ExportData {
  [key: string]: unknown;
}

interface ExportHeaders {
  [key: string]: string;
}

type ExportFormat = 'generic' | 'excel' | 'json';

export const prepareExportData = (
  data: ExportData[], 
  fields: string[], 
  headers: ExportHeaders = {}, 
  exportFormat: ExportFormat = 'generic'
): ExportData[] => {
  return data.map((item: ExportData) => {
    const formatted: ExportData = {};

    fields.forEach((key: string) => {
      // Skip certificateURL except for JSON format
      if (key === 'certificateURL') {
        if (exportFormat === 'json') {
          formatted[headers[key] || key] = item[key] ?? '';
        }
        return;
      }

      let value = item[key];

      // Format dates - safe type casting
      if (['trainingDate', 'expiryDate', 'updatedAt'].includes(key)) {
        try {
          if (value !== null && value !== undefined) {
            // Convert to appropriate type for formatDate
            if (value instanceof Date || 
                typeof value === 'string' || 
                (typeof value === 'object' && 'toDate' in (value as any))) {
              value = formatDate(value as any);
            } else {
              value = ''; // Invalid date format
            }
          } else {
            value = '';
          }
        } catch (error) {
          console.warn('Date formatting error:', error);
          value = '';
        }
      }

      // Excel formula link for certificate URLs
      if (key === 'certificateURL' && typeof value === 'string' && value) {
        if (exportFormat === 'excel') {
          value = `=HYPERLINK("${value}", "เปิดไฟล์")`;
        }
      }

      // Remove object fields
      if (typeof value === 'object' && value !== null) {
        value = '';
      }

      formatted[headers[key] || key] = value ?? '';
    });

    return formatted;
  });
};

// Excel Export with ExcelJS
export const exportToExcel = async (
  data: ExportData[], 
  filename: string = 'export'
): Promise<void> => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Get headers from first data row
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      
      // Add headers row
      worksheet.addRow(headers);
      
      // Style headers
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '16A085' } // Green color
      };
      
      // Add data rows
      data.forEach((row) => {
        const values = headers.map(header => {
          const value = row[header];
          // Handle hyperlinks for certificateURL
          if (header === 'certificateURL' && typeof value === 'string' && value.startsWith('http')) {
            return {
              text: 'เปิดไฟล์',
              hyperlink: value
            };
          }
          return value ?? '';
        });
        worksheet.addRow(values);
      });
      
      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        if (column.values) {
          const maxLength = column.values.reduce((max: number, value: unknown) => {
            const length = String(value || '').length;
            return Math.max(max, length);
          }, 0);
          column.width = Math.min(Math.max(maxLength + 2, 10), 50);
        }
      });
    }

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyMMddHHmmss')}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error('Failed to export Excel file');
  }
};

// PDF Export
export const exportToPDF = (
  data: ExportData[], 
  filename: string = 'export', 
  headerArray: string[] = []
): void => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    doc.setFont('Sarabun-Regular');
    doc.setFontSize(10);

    // Optional Thai title
    doc.text('รายงานผลการฝึกอบรม', 40, 30);

    const headers = [headerArray];
    const rows = data.map((row: ExportData) =>
      headerArray.map((header: string) => {
        const value = row[header];
        return typeof value === 'string' ? value : String(value ?? '');
      })
    );

    autoTable(doc, {
      head: headers,
      body: rows,
      styles: {
        font: 'Sarabun-Regular',
        fontSize: 10,
      },
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] }
    });

    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error('Failed to export PDF file');
  }
};

// CSV Export (Pure JavaScript - no external library needed)
export const exportToCSV = (data: ExportData[], filename: string = 'export'): void => {
  try {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    // Get headers
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      // Headers row
      headers.map(header => `"${String(header).replace(/"/g, '""')}"`).join(','),
      // Data rows
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes
          const stringValue = String(value ?? '').replace(/"/g, '""');
          return `"${stringValue}"`;
        }).join(',')
      )
    ].join('\n');

    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyMMddHHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('CSV export error:', error);
    throw new Error('Failed to export CSV file');
  }
};

// JSON Export
export const exportToJSON = (data: ExportData[], filename: string = 'export'): void => {
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyMMddHHmmss')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('JSON export error:', error);
    throw new Error('Failed to export JSON file');
  }
};

// Utility function to validate export data
export const validateExportData = (data: unknown[]): data is ExportData[] => {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }
  
  return data.every(item => 
    typeof item === 'object' && 
    item !== null && 
    !Array.isArray(item)
  );
};

// Export all functions with error handling wrapper
export const safeExportToExcel = async (data: ExportData[], filename?: string): Promise<boolean> => {
  try {
    if (!validateExportData(data)) {
      throw new Error('Invalid export data');
    }
    await exportToExcel(data, filename);
    return true;
  } catch (error) {
    console.error('Safe Excel export failed:', error);
    return false;
  }
};

export const safeExportToCSV = (data: ExportData[], filename?: string): boolean => {
  try {
    if (!validateExportData(data)) {
      throw new Error('Invalid export data');
    }
    exportToCSV(data, filename);
    return true;
  } catch (error) {
    console.error('Safe CSV export failed:', error);
    return false;
  }
};

export const safeExportToPDF = (data: ExportData[], filename?: string, headers?: string[]): boolean => {
  try {
    if (!validateExportData(data)) {
      throw new Error('Invalid export data');
    }
    exportToPDF(data, filename, headers);
    return true;
  } catch (error) {
    console.error('Safe PDF export failed:', error);
    return false;
  }
};

export const safeExportToJSON = (data: ExportData[], filename?: string): boolean => {
  try {
    if (!validateExportData(data)) {
      throw new Error('Invalid export data');
    }
    exportToJSON(data, filename);
    return true;
  } catch (error) {
    console.error('Safe JSON export failed:', error);
    return false;
  }
};