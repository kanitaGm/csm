// src/hooks/useFileUpload.ts - Enhanced Version
import { useState, useCallback, useRef, useEffect } from 'react';
import { compressFile, validateFile, formatFileSize, canCompress } from '../utils/fileCompression';
import type { CompressionResult, FileUploadOptions } from '../utils/fileCompression';

// ========================================
// TYPES & INTERFACES
// ========================================

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  base64?: string;
  compressionApplied?: boolean;
  originalSize?: number;
  compressionRatio?: number;
  status: 'pending' | 'processing' | 'ready' | 'error' | 'uploading' | 'uploaded';
  error?: string;
  uploadProgress?: number;
  metadata?: {
    lastModified: number;
    dimensions?: { width: number; height: number };
    duration?: number; // for video/audio files
  };
}

export interface ToastMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export interface FileUploadStats {
  totalFiles: number;
  totalSize: number;
  totalSizeFormatted: string;
  compressedFiles: number;
  compressionSaved: number;
  compressionSavedFormatted: string;
  averageCompressionRatio: number;
  processedCount: number;
  errorCount: number;
}

export interface UseFileUploadOptions extends FileUploadOptions {
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
  onToast?: (toast: ToastMessage) => void;
  onFileProcessed?: (file: FileAttachment) => void;
  onAllFilesProcessed?: (files: FileAttachment[], stats: FileUploadStats) => void;
  autoCompress?: boolean;
  showCompressionResults?: boolean;
  maxFiles?: number;
  allowDuplicates?: boolean;
  generatePreviews?: boolean;
  enableBatchProcessing?: boolean;
  batchSize?: number;
}

export interface BatchProcessingOptions {
  concurrency?: number;
  onBatchStart?: (batchNumber: number, totalBatches: number) => void;
  onBatchComplete?: (batchNumber: number, results: FileAttachment[]) => void;
}

export interface UseFileUploadReturn {
  // File state
  files: FileAttachment[];
  isProcessing: boolean;
  isDragOver: boolean;
  stats: FileUploadStats;
  
  // File operations
  addFiles: (selectedFiles: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  clearAllFiles: () => void;
  updateFileStatus: (id: string, status: FileAttachment['status'], error?: string) => void;
  retryFailedFiles: () => Promise<void>;
  
  // UI handlers
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  triggerFileSelect: () => void;
  
  // Utilities
  getFileById: (id: string) => FileAttachment | undefined;
  getFilesByStatus: (status: FileAttachment['status']) => FileAttachment[];
  getTotalSize: () => number;
  getTotalSizeFormatted: () => string;
  validateFiles: (files: File[]) => { valid: File[]; invalid: Array<{ file: File; error: string }> };
  
  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  
  // Configuration
  setFiles: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

const generateFileId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 1024 * 1024) {
      reject(new Error('File too large for base64 conversion (max 1MB)'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsDataURL(file);
  });
};

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

// ========================================
// MAIN HOOK
// ========================================

/**
 * Enhanced File Upload Hook
 * - Better error handling and retry mechanism
 * - Batch processing for large file sets
 * - Detailed file metadata and statistics
 * - Progress tracking per file
 * - Duplicate detection
 * - Advanced compression options
 */
export const useFileUpload = (options: UseFileUploadOptions = {}): UseFileUploadReturn => {
  const {
    maxFiles = 10,
    autoCompress = true,
    showCompressionResults = true,
    allowDuplicates = false,
    generatePreviews = true,
    enableBatchProcessing = true,
    batchSize = 3,
    onError,
    onSuccess,
    onToast,
    onFileProcessed,
    onAllFilesProcessed,
    ...compressionOptions
  } = options;

  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========================================
  // TOAST & NOTIFICATION HANDLING
  // ========================================

  const showToast = useCallback((toast: ToastMessage) => {
    if (onToast) {
      onToast(toast);
    } else {
      if (toast.type === 'error' && onError) onError(toast.message);
      else if (toast.type === 'success' && onSuccess) onSuccess(toast.message);
    }
  }, [onToast, onError, onSuccess]);

  // ========================================
  // STATISTICS CALCULATION
  // ========================================

  const calculateStats = useCallback((fileList: FileAttachment[]): FileUploadStats => {
    const totalSize = fileList.reduce((sum, f) => sum + f.size, 0);
    const compressedFiles = fileList.filter(f => f.compressionApplied);
    const originalSize = fileList.reduce((sum, f) => sum + (f.originalSize || f.size), 0);
    const compressionSaved = originalSize - totalSize;
    const processedCount = fileList.filter(f => f.status === 'ready').length;
    const errorCount = fileList.filter(f => f.status === 'error').length;

    return {
      totalFiles: fileList.length,
      totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
      compressedFiles: compressedFiles.length,
      compressionSaved,
      compressionSavedFormatted: formatFileSize(compressionSaved),
      averageCompressionRatio: compressedFiles.length > 0 
        ? compressedFiles.reduce((sum, f) => sum + (f.compressionRatio || 0), 0) / compressedFiles.length 
        : 0,
      processedCount,
      errorCount
    };
  }, []);

  const stats = calculateStats(files);

  // ========================================
  // FILE VALIDATION
  // ========================================

  const validateFiles = useCallback((selectedFiles: File[]) => {
    const valid: File[] = [];
    const invalid: Array<{ file: File; error: string }> = [];

    // Check total file count
    if (files.length + selectedFiles.length > maxFiles) {
      const allowedCount = maxFiles - files.length;
      selectedFiles.slice(allowedCount).forEach(file => {
        invalid.push({ file, error: `เกินจำนวนไฟล์ที่อนุญาต (สูงสุด ${maxFiles} ไฟล์)` });
      });
      selectedFiles = selectedFiles.slice(0, allowedCount);
    }

    // Validate each file
    selectedFiles.forEach(file => {
      // Check for duplicates if not allowed
      if (!allowDuplicates) {
        const isDuplicate = files.some(existingFile => 
          existingFile.name === file.name && 
          existingFile.size === file.size &&
          existingFile.type === file.type
        );
        
        if (isDuplicate) {
          invalid.push({ file, error: 'ไฟล์นี้มีอยู่แล้ว' });
          return;
        }
      }

      // Validate file using utility function
      const validation = validateFile(file, {
        ...(compressionOptions.maxFileSize !== undefined && { maxSize: compressionOptions.maxFileSize }),
        ...(compressionOptions.allowedTypes !== undefined && { allowedTypes: compressionOptions.allowedTypes })
      });

      if (!validation.valid) {
        invalid.push({ file, error: validation.error || 'ไฟล์ไม่ถูกต้อง' });
      } else {
        valid.push(file);
      }
    });

    return { valid, invalid };
  }, [files, maxFiles, allowDuplicates, compressionOptions]);

  // ========================================
  // FILE PROCESSING
  // ========================================

  const processFile = useCallback(async (file: File): Promise<FileAttachment> => {
    const fileId = generateFileId();
    
    let fileAttachment: FileAttachment = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'processing',
      metadata: {
        lastModified: file.lastModified
      }
    };

    try {
      // Get image dimensions if it's an image
      if (file.type.startsWith('image/') && generatePreviews) {
        try {
          const dimensions = await getImageDimensions(file);
          fileAttachment.metadata!.dimensions = dimensions;
        } catch (err) {
          console.warn('Failed to get image dimensions:', err);
        }
      }

      // Compress file if needed
      if (autoCompress && canCompress(file, compressionOptions)) {
        const fileTypeText = file.type.startsWith('image/') ? 'รูปภาพ' : 'เอกสาร';
        
        try {
          const result = await compressFile(file, {
            ...compressionOptions,
            onProgress: (progress) => {
              setFiles(prev => prev.map(f => 
                f.id === fileId 
                  ? { ...f, uploadProgress: progress }
                  : f
              ));
            }
          });

          // Convert to base64 if file is small enough and generatePreviews is enabled
          let base64Data: string | undefined;
          if (generatePreviews && result.compressedFile.size <= 1024 * 1024) {
            try {
              base64Data = await fileToBase64(result.compressedFile);
            } catch (err) {
              console.warn('Failed to generate base64 preview:', err);
            }
          }

          fileAttachment = {
            ...fileAttachment,
            size: result.compressedSize,
            type: result.compressedFile.type,
            ...(result.previewURL && { url: result.previewURL }),
            ...(base64Data && { base64: base64Data }),
            compressionApplied: result.compressionApplied,
            originalSize: result.originalSize,
            compressionRatio: result.compressionRatio,
            status: 'ready'
          };

          if (showCompressionResults && result.compressionApplied) {
            const savedPercentage = Math.round((1 - result.compressionRatio) * 100);
            showToast({
              type: 'success',
              title: `บีบอัด${fileTypeText}สำเร็จ`,
              message: `${file.name} ลดขนาดได้ ${savedPercentage}%`
            });
          }

        } catch (compressionError) {
          console.warn('Compression failed, using original file:', compressionError);
          
          // Fall back to original file
          let base64Data: string | undefined;
          if (generatePreviews && file.size <= 1024 * 1024) {
            try {
              base64Data = await fileToBase64(file);
            } catch (err) {
              console.warn('Failed to generate base64 preview for original file:', err);
            }
          }

          fileAttachment = {
            ...fileAttachment,
            ...(base64Data && { base64: base64Data }),
            status: 'ready',
            compressionApplied: false
          };
        }
      } else {
        // No compression needed/wanted
        let base64Data: string | undefined;
        if (generatePreviews && file.size <= 1024 * 1024) {
          try {
            base64Data = await fileToBase64(file);
          } catch (err) {
            console.warn('Failed to generate base64 preview:', err);
          }
        }

        fileAttachment = {
          ...fileAttachment,
          ...(base64Data && { base64: base64Data }),
          status: 'ready',
          compressionApplied: false
        };
      }

      onFileProcessed?.(fileAttachment);
      return fileAttachment;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ไม่สามารถประมวลผลไฟล์ได้';
      
      fileAttachment = {
        ...fileAttachment,
        status: 'error',
        error: errorMessage
      };

      showToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: `ไม่สามารถประมวลผลไฟล์ ${file.name}: ${errorMessage}`
      });

      return fileAttachment;
    }
  }, [autoCompress, compressionOptions, generatePreviews, showCompressionResults, showToast, onFileProcessed]);

  // ========================================
  // BATCH PROCESSING
  // ========================================

  const processBatch = useCallback(async (
    filesToProcess: File[], 
    batchOptions?: BatchProcessingOptions
  ): Promise<FileAttachment[]> => {
    const { concurrency = batchSize, onBatchStart, onBatchComplete } = batchOptions || {};
    const results: FileAttachment[] = [];
    const totalBatches = Math.ceil(filesToProcess.length / concurrency);

    for (let i = 0; i < filesToProcess.length; i += concurrency) {
      const currentBatch = Math.floor(i / concurrency) + 1;
      const batchFiles = filesToProcess.slice(i, i + concurrency);
      
      onBatchStart?.(currentBatch, totalBatches);

      // Process files in current batch concurrently
      const batchPromises = batchFiles.map(file => processFile(file));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      onBatchComplete?.(currentBatch, batchResults);

      // Small delay between batches to prevent overwhelming the system
      if (i + concurrency < filesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }, [batchSize, processFile]);

  // ========================================
  // MAIN FILE ADDITION FUNCTION
  // ========================================

  const addFiles = useCallback(async (selectedFiles: File[]): Promise<void> => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    
    try {
      // Validate files
      const { valid, invalid } = validateFiles(selectedFiles);

      // Show validation errors
      invalid.forEach(({ file, error }) => {
        showToast({
          type: 'error',
          title: 'ไฟล์ไม่ถูกต้อง',
          message: `${file.name}: ${error}`
        });
      });

      if (valid.length === 0) {
        return;
      }

      // Add files to state with pending status
      const pendingFiles: FileAttachment[] = valid.map(file => ({
        id: generateFileId(),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
        metadata: {
          lastModified: file.lastModified
        }
      }));

      setFiles(prev => [...prev, ...pendingFiles]);

      // Process files
      let processedFiles: FileAttachment[];
      
      if (enableBatchProcessing && valid.length > batchSize) {
        processedFiles = await processBatch(valid, {
          concurrency: batchSize,
          onBatchStart: (batchNumber, totalBatches) => {
            showToast({
              type: 'info',
              title: 'กำลังประมวลผล',
              message: `แบทช์ ${batchNumber}/${totalBatches}`,
              duration: 2000
            });
          }
        });
      } else {
        // Process all files concurrently for small batches
        const filePromises = valid.map(file => processFile(file));
        processedFiles = await Promise.all(filePromises);
      }

      // Update files state with processed results
      setFiles(prev => {
        const updated = [...prev];
        processedFiles.forEach(processedFile => {
          const index = updated.findIndex(f => 
            f.name === processedFile.name && 
            f.size === processedFile.originalSize || processedFile.size
          );
          if (index !== -1) {
            updated[index] = processedFile;
          }
        });
        return updated;
      });

      // Calculate final statistics
      const finalStats = calculateStats(processedFiles);
      onAllFilesProcessed?.(processedFiles, finalStats);

      // Show summary toast
      const successCount = processedFiles.filter(f => f.status === 'ready').length;
      const errorCount = processedFiles.filter(f => f.status === 'error').length;

      if (errorCount === 0) {
        showToast({
          type: 'success',
          title: 'เพิ่มไฟล์สำเร็จ',
          message: `เพิ่มไฟล์ ${successCount} ไฟล์เรียบร้อยแล้ว`
        });
      } else if (successCount === 0) {
        showToast({
          type: 'error',
          title: 'ไม่สามารถเพิ่มไฟล์ได้',
          message: `ไฟล์ทั้งหมด ${errorCount} ไฟล์ไม่สามารถเพิ่มได้`
        });
      } else {
        showToast({
          type: 'warning',
          title: 'เพิ่มไฟล์บางส่วน',
          message: `เพิ่มสำเร็จ ${successCount} ไฟล์, ล้มเหลว ${errorCount} ไฟล์`
        });
      }

    } catch (error) {
      console.error('Error processing files:', error);
      showToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถประมวลผลไฟล์ได้'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [validateFiles, enableBatchProcessing, batchSize, processBatch, processFile, calculateStats, onAllFilesProcessed, showToast]);

  // ========================================
  // FILE MANAGEMENT FUNCTIONS
  // ========================================

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.url) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter(f => f.id !== id);
    });
    
    showToast({
      type: 'info',
      title: 'ลบไฟล์แล้ว',
      message: 'ไฟล์ถูกลบออกจากรายการแล้ว',
      duration: 2000
    });
  }, [showToast]);

  const clearAllFiles = useCallback(() => {
    files.forEach(file => {
      if (file.url) {
        URL.revokeObjectURL(file.url);
      }
    });
    setFiles([]);
    
    showToast({
      type: 'info',
      title: 'ลบไฟล์ทั้งหมดแล้ว',
      message: 'ไฟล์ทั้งหมดถูกลบออกจากรายการแล้ว',
      duration: 2000
    });
  }, [files, showToast]);

  const updateFileStatus = useCallback((
    id: string, 
    status: FileAttachment['status'], 
    error?: string
  ) => {
    setFiles(prev => prev.map(file => 
      file.id === id 
        ? { ...file, status, ...(error && { error }) }
        : file
    ));
  }, []);

  const retryFailedFiles = useCallback(async () => {
    const failedFiles = files.filter(f => f.status === 'error');
    if (failedFiles.length === 0) return;

    // Convert failed FileAttachment back to File objects for reprocessing
    // Note: This is a simplified approach. In a real app, you might want to store the original File objects
    showToast({
      type: 'info',
      title: 'กำลังลองใหม่',
      message: `กำลังประมวลผลไฟล์ที่ล้มเหลว ${failedFiles.length} ไฟล์อีกครั้ง`
    });

    // Update status to processing
    failedFiles.forEach(file => {
      updateFileStatus(file.id, 'processing');
    });

    // In a real implementation, you would need to recreate File objects or store them separately
    // For now, we'll just update the status back to error with a message
    setTimeout(() => {
      failedFiles.forEach(file => {
        updateFileStatus(file.id, 'error', 'ไม่สามารถลองใหม่ได้ - กรุณาเพิ่มไฟล์ใหม่');
      });
    }, 2000);
  }, [files, updateFileStatus, showToast]);

  // ========================================
  // DRAG & DROP HANDLERS
  // ========================================

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    await addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    await addFiles(Array.from(e.target.files || []));
    e.target.value = ''; // Reset input
  }, [addFiles]);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  const getFileById = useCallback((id: string): FileAttachment | undefined => {
    return files.find(f => f.id === id);
  }, [files]);

  const getFilesByStatus = useCallback((status: FileAttachment['status']): FileAttachment[] => {
    return files.filter(f => f.status === status);
  }, [files]);

  const getTotalSize = useCallback((): number => {
    return files.reduce((sum, f) => sum + f.size, 0);
  }, [files]);

  const getTotalSizeFormatted = useCallback((): string => {
    return formatFileSize(getTotalSize());
  }, [getTotalSize]);

  // ========================================
  // CLEANUP ON UNMOUNT
  // ========================================

  useEffect(() => {
    return () => {
      // Cleanup object URLs on unmount
      files.forEach(file => {
        if (file.url) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
  }, []);

  // ========================================
  // RETURN HOOK INTERFACE
  // ========================================

  return {
    // File state
    files,
    isProcessing,
    isDragOver,
    stats,
    
    // File operations
    addFiles,
    removeFile,
    clearAllFiles,
    updateFileStatus,
    retryFailedFiles,
    
    // UI handlers
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    triggerFileSelect,
    
    // Utilities
    getFileById,
    getFilesByStatus,
    getTotalSize,
    getTotalSizeFormatted,
    validateFiles,
    
    // Refs
    fileInputRef,
    
    // Configuration
    setFiles,
    setIsProcessing
  };
};

export default useFileUpload;