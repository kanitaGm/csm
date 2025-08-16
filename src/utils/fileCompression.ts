// src/utils/fileCompression.ts - Enhanced Core Logic
import imageCompression from 'browser-image-compression';
import { PDFDocument } from 'pdf-lib';

export interface CompressionResult {
  compressedFile: File;
  previewURL?: string | undefined;
  compressionRatio: number;
  originalSize: number;
  compressedSize: number;
  compressionType: 'image' | 'pdf' | 'none';
  compressionApplied: boolean;
}

export interface ImageCompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  fileType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface FileUploadOptions {
  imageOptions?: ImageCompressionOptions;
  pdfMinSize?: number;
  imageMinSize?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * File validation with enhanced error messages
 */
export const validateFile = (
  file: File,
  options: { maxSize?: number; allowedTypes?: string[] } = {}
): ValidationResult => {
  const {
    maxSize = 10 * 1024 * 1024,
    allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  } = options;

  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / 1024 / 1024);
    const fileSizeMB = Math.round(file.size / 1024 / 1024);
    return { 
      valid: false, 
      error: `ขนาดไฟล์ ${fileSizeMB}MB เกินขีดจำกัด ${maxSizeMB}MB` 
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `ไม่รองรับไฟล์ประเภท ${file.type}` 
    };
  }

  if (file.size === 0) {
    return { 
      valid: false, 
      error: 'ไฟล์ว่างเปล่า' 
    };
  }

  return { valid: true };
};

/**
 * Enhanced image compression with TypeScript-safe onProgress
 */
export const compressImage = async (
  file: File,
  options: ImageCompressionOptions = {},
  onProgress?: (progress: number) => void
): Promise<File> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('ไฟล์ต้องเป็นรูปภาพ');
  }

  const { 
    maxSizeMB = 0.2, 
    maxWidthOrHeight = 600, 
    quality = 0.8, 
    fileType = 'image/webp' 
  } = options;

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      initialQuality: quality,
      fileType,
      useWebWorker: false,
      onProgress: (progress: number) => {
        if (onProgress) onProgress(Math.round(progress * 100));
      }
    });

    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error(
      `การบีบอัดรูปภาพล้มเหลว: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Enhanced PDF compression with better error handling
 */
export const compressPDF = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> => {
  if (file.type !== 'application/pdf') {
    throw new Error('ไฟล์ต้องเป็น PDF');
  }

  try {
    onProgress?.(10);
    
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.(30);
    
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    onProgress?.(50);

    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    onProgress?.(80);

    const compressedPdfBytes = await pdfDoc.save({ 
      useObjectStreams: false,
      addDefaultPage: false
    });

    onProgress?.(90);

    const safeBuffer = new Uint8Array(compressedPdfBytes).slice().buffer;
    const compressedFile = new File([safeBuffer], file.name, { 
      type: 'application/pdf',
      lastModified: Date.now()
    });

    onProgress?.(100);
    return compressedFile;
    
  } catch (error) {
    console.error('PDF compression failed:', error);
    throw new Error(`การบีบอัด PDF ล้มเหลว: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Universal file compression
 */
export const compressFile = async (
  file: File, 
  options: FileUploadOptions = {}
): Promise<CompressionResult> => {
  const {
    imageOptions = { maxSizeMB: 0.2, maxWidthOrHeight: 600, quality: 0.8 },
    pdfMinSize = 500 * 1024,
    imageMinSize = 100 * 1024,
    onProgress
  } = options;

  const originalSize = file.size;

  try {
    if (file.type.startsWith('image/')) {
      if (file.size > imageMinSize) {
        try {
          const compressedFile = await compressImage(file, imageOptions, onProgress);
          const compressionRatio = originalSize > 0 
            ? ((originalSize - compressedFile.size) / originalSize) * 100 
            : 0;

          return {
            compressedFile,
            previewURL: URL.createObjectURL(compressedFile),
            compressionRatio,
            originalSize,
            compressedSize: compressedFile.size,
            compressionType: 'image',
            compressionApplied: compressionRatio > 1
          };
        } catch (error) {
          console.warn('Image compression failed, using original:', error);
          return {
            compressedFile: file,
            previewURL: URL.createObjectURL(file),
            compressionRatio: 0,
            originalSize,
            compressedSize: originalSize,
            compressionType: 'image',
            compressionApplied: false
          };
        }
      } else {
        return {
          compressedFile: file,
          previewURL: URL.createObjectURL(file),
          compressionRatio: 0,
          originalSize,
          compressedSize: originalSize,
          compressionType: 'image',
          compressionApplied: false
        };
      }
    }

    if (file.type === 'application/pdf') {
      if (file.size > pdfMinSize) {
        try {
          const compressedFile = await compressPDF(file, onProgress);
          const compressionRatio = originalSize > 0 
            ? ((originalSize - compressedFile.size) / originalSize) * 100 
            : 0;

          return {
            compressedFile,
            compressionRatio,
            originalSize,
            compressedSize: compressedFile.size,
            compressionType: 'pdf',
            compressionApplied: compressionRatio > 1
          };
        } catch (error) {
          console.warn('PDF compression failed, using original:', error);
          return {
            compressedFile: file,
            compressionRatio: 0,
            originalSize,
            compressedSize: originalSize,
            compressionType: 'pdf',
            compressionApplied: false
          };
        }
      } else {
        return {
          compressedFile: file,
          compressionRatio: 0,
          originalSize,
          compressedSize: originalSize,
          compressionType: 'pdf',
          compressionApplied: false
        };
      }
    }

    return {
      compressedFile: file,
      compressionRatio: 0,
      originalSize,
      compressedSize: originalSize,
      compressionType: 'none',
      compressionApplied: false
    };

  } catch (error) {
    console.error('File compression error:', error);
    return {
      compressedFile: file,
      compressionRatio: 0,
      originalSize,
      compressedSize: originalSize,
      compressionType: 'none',
      compressionApplied: false
    };
  }
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file type icon for React
 */
import { FileText, Image, FileSpreadsheet } from 'lucide-react';

export const getFileTypeIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return Image;
  if (fileType === 'application/pdf') return FileText;
  if (fileType.includes('word')) return FileText;
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return FileSpreadsheet;
  return FileText;
};

/**
 * Check if file can be compressed
 */
export const canCompress = (file: File, options: FileUploadOptions = {}): boolean => {
  const { pdfMinSize = 500 * 1024, imageMinSize = 100 * 1024 } = options;
  
  if (file.type.startsWith('image/') && file.size > imageMinSize) return true;
  if (file.type === 'application/pdf' && file.size > pdfMinSize) return true;
  
  return false;
};
