// src/utils/index.ts - Organized File Utils Exports

// ========================================
// CORE FILE COMPRESSION & PROCESSING
// ========================================
export {
  validateFile,
  compressImage,
  compressPDF,
  compressFile,
  formatFileSize,
  getFileTypeIcon,
  canCompress,
  type CompressionResult,
  type ImageCompressionOptions,
  type FileUploadOptions,
  type ValidationResult
} from './fileCompression';

// ========================================
// FIREBASE STORAGE UTILITIES
// ========================================
export {
  uploadEmployeePhoto,
  uploadMultipleFiles,
  uploadCompressedFiles,
  deleteFileFromStorage,
  downloadFile,
  fileToBase64,
  cleanupObjectURLs,
  getFileMetadata
} from './fileUtils';

// ========================================
// REACT HOOKS & COMPONENTS
// ========================================
export {
  useFileUpload,
  type FileAttachment,
  type UseFileUploadOptions
} from '../hooks/useFileUpload';

export { UniversalFileUpload } from '../components/ui/UniversalFileUpload';

// ========================================
// LEGACY SUPPORT (Re-exports for backward compatibility)
// ========================================

// For components still using old naming
export { compressFile as compressAndCreatePreview } from './fileCompression';
export { validateFile as validateFileType } from './fileCompression';

// ========================================
// UTILITY CONSTANTS
// ========================================
export const FILE_CONSTANTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_PDF_SIZE: 50 * 1024 * 1024,  // 50MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  SUPPORTED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  COMPRESSION_THRESHOLDS: {
    IMAGE_MIN_SIZE: 100 * 1024, // 100KB
    PDF_MIN_SIZE: 500 * 1024,   // 500KB
  },
  DEFAULT_COMPRESSION_OPTIONS: {
    IMAGE: {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 600,
      quality: 0.8,
      fileType: 'image/webp' as const
    },
    PDF: {
      removeMetadata: true,
      useObjectStreams: false
    }
  }
} as const;

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get all supported file types
 */
export const getAllSupportedTypes = (): string[] => {
  return [
    ...FILE_CONSTANTS.SUPPORTED_IMAGE_TYPES,
    ...FILE_CONSTANTS.SUPPORTED_DOCUMENT_TYPES
  ];
};

/**
 * Check if file type is supported
 */
export const isSupportedFileType = (fileType: string): boolean => {
  return getAllSupportedTypes().includes(fileType);
};

/**
 * Check if file can be compressed
 */
export const isCompressibleFile = (file: File): boolean => {
  const isImage = file.type.startsWith('image/') && 
                  file.size > FILE_CONSTANTS.COMPRESSION_THRESHOLDS.IMAGE_MIN_SIZE;
  const isPDF = file.type === 'application/pdf' && 
                file.size > FILE_CONSTANTS.COMPRESSION_THRESHOLDS.PDF_MIN_SIZE;
  
  return isImage || isPDF;
};

/**
 * Get file category
 */
export const getFileCategory = (fileType: string): 'image' | 'document' | 'other' => {
  if ((FILE_CONSTANTS.SUPPORTED_IMAGE_TYPES as readonly string[]).includes(fileType)) {
    return 'image';
  }
  if ((FILE_CONSTANTS.SUPPORTED_DOCUMENT_TYPES as readonly string[]).includes(fileType)) {
    return 'document';
  }
  return 'other';
};

/**
 * Format compression ratio for display
 */
export const formatCompressionRatio = (ratio: number): string => {
  if (ratio <= 0) return 'ไม่มีการบีบอัด';
  return `ลดลง ${Math.round(ratio)}%`;
};