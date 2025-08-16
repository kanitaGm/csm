// src/hooks/useFileUpload.ts - Enhanced React Hook
import { useState, useCallback, useRef } from 'react';
import { compressFile, validateFile, formatFileSize, canCompress } from '../utils/fileCompression';
import type { CompressionResult, FileUploadOptions } from '../utils/fileCompression';

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string; 
  url?: string;              // optional
  base64?: string;           // optional
  compressionApplied?: boolean;
  originalSize?: number;
  compressionRatio?: number;
  status?: string;
}

export interface ToastMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export interface UseFileUploadOptions extends FileUploadOptions {
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
  onToast?: (toast: ToastMessage) => void;
  autoCompress?: boolean;
  showCompressionResults?: boolean;
  maxFiles?: number;
}

export const useFileUpload = (options: UseFileUploadOptions = {}) => {
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    maxFiles = 10,
    autoCompress = true,
    showCompressionResults = true,
    onError,
    onSuccess,
    onToast,
    ...compressionOptions
  } = options;

  const showToast = useCallback((toast: ToastMessage) => {
    if (onToast) {
      onToast(toast);
    } else {
      if (toast.type === 'error' && onError) onError(toast.message);
      else if (toast.type === 'success' && onSuccess) onSuccess(toast.message);
    }
  }, [onToast, onError, onSuccess]);

  const processFiles = useCallback(async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > maxFiles) {
      showToast({
        type: 'error',
        title: 'ไฟล์เกินจำนวนที่อนุญาต',
        message: `สามารถแนบได้สูงสุด ${maxFiles} ไฟล์`
      });
      return;
    }

    setIsProcessing(true);
    const newFiles: FileAttachment[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const file of selectedFiles) {
        try {
          // Validate file (pass only defined options)
          const validation = validateFile(file, {
            ...(compressionOptions.maxFileSize !== undefined && { maxSize: compressionOptions.maxFileSize }),
            ...(compressionOptions.allowedTypes !== undefined && { allowedTypes: compressionOptions.allowedTypes })
          });

          if (!validation.valid) {
            showToast({ type: 'error', title: 'ไฟล์ไม่ถูกต้อง', message: `${file.name}: ${validation.error}` });
            errorCount++;
            continue;
          }

          if (autoCompress && canCompress(file, compressionOptions)) {
            const fileTypeText = file.type.startsWith('image/') ? 'รูปภาพ' : 'PDF';
            showToast({ type: 'info', title: `กำลังบีบอัด${fileTypeText}`, message: `กำลังประมวลผล ${file.name}...`, duration: 2000 });
          }

          let result: CompressionResult;
          if (autoCompress) {
            result = await compressFile(file, {
              ...compressionOptions,
              onProgress: (progress) => console.log(`Processing ${file.name}: ${progress}%`)
            });
          } else {
            result = {
              compressedFile: file,
              ...(file.type.startsWith('image/') && { previewURL: URL.createObjectURL(file) }),
              //previewURL: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
              originalSize: file.size,
              compressedSize: file.size,
              compressionType: 'none',
              compressionRatio: 0,
              compressionApplied: false
            };
          }

          if (showCompressionResults && result.compressionApplied) {
            const savedKB = Math.round((result.originalSize - result.compressedSize) / 1024);
            const compressionPercent = Math.round(result.compressionRatio || 0);
            const fileTypeText = result.compressionType === 'image' ? 'รูปภาพ' : 'PDF';
            if (savedKB > 10) {
              showToast({ type: 'success', title: `บีบอัด${fileTypeText}สำเร็จ`, message: `${file.name}: ลดขนาด ${savedKB}KB (${compressionPercent}%)`, duration: 3000 });
            }
          }

          let base64Data: string | undefined;
          if (result.compressedFile.size <= 50 * 1024) {
            try { base64Data = await fileToBase64(result.compressedFile); } 
            catch (error) { console.warn('Failed to convert to base64:', error); }
          }

          const fileAttachment: FileAttachment = {
            id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: result.compressedFile.name,
            size: result.compressedSize,
            type: result.compressedFile.type,
            ...(result.previewURL && { url: result.previewURL }),
            ...(base64Data && { base64: base64Data }),
            compressionApplied: result.compressionApplied,
            originalSize: result.originalSize,
            compressionRatio: result.compressionRatio
          };

          newFiles.push(fileAttachment);
          successCount++;

        } catch (error) {
          console.error('Error processing file:', error);
          showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: `ไม่สามารถประมวลผลไฟล์ ${file.name} ได้` });
          errorCount++;
        }
      }

      setFiles(prev => [...prev, ...newFiles]);

      if (successCount > 0 || errorCount > 0) {
        if (errorCount === 0) showToast({ type: 'success', title: 'เพิ่มไฟล์สำเร็จ', message: `เพิ่มไฟล์ ${successCount} ไฟล์เรียบร้อยแล้ว` });
        else if (successCount === 0) showToast({ type: 'error', title: 'ไม่สามารถเพิ่มไฟล์ได้', message: `ไฟล์ทั้งหมด ${errorCount} ไฟล์ไม่สามารถเพิ่มได้` });
        else showToast({ type: 'warning', title: 'เพิ่มไฟล์บางส่วน', message: `เพิ่มสำเร็จ ${successCount} ไฟล์, ล้มเหลว ${errorCount} ไฟล์` });
      }

    } finally {
      setIsProcessing(false);
    }
  }, [files.length, maxFiles, autoCompress, showCompressionResults, compressionOptions, showToast]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.url) URL.revokeObjectURL(fileToRemove.url);
      return prev.filter(f => f.id !== id);
    });
    showToast({ type: 'info', title: 'ลบไฟล์แล้ว', message: 'ไฟล์ถูกลบออกจากรายการแล้ว', duration: 2000 });
  }, [showToast]);

  const clearAllFiles = useCallback(() => {
    files.forEach(file => { if (file.url) URL.revokeObjectURL(file.url); });
    setFiles([]);
    showToast({ type: 'info', title: 'ลบไฟล์ทั้งหมดแล้ว', message: 'ไฟล์ทั้งหมดถูกลบออกจากรายการแล้ว', duration: 2000 });
  }, [files, showToast]);

  const triggerFileSelect = useCallback(() => { fileInputRef.current?.click(); }, []);
  const handleDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget === e.target) setIsDragOver(false); }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; }, []);
  const handleDrop = useCallback(async (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); await processFiles(Array.from(e.dataTransfer.files)); }, [processFiles]);
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => { await processFiles(Array.from(e.target.files || [])); e.target.value = ''; }, [processFiles]);

  const getCompressionSummary = useCallback(() => {
    const compressedFiles = files.filter(f => f.compressionApplied);
    const totalOriginalSize = files.reduce((sum, f) => sum + (f.originalSize || f.size), 0);
    const totalCompressedSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalSaved = totalOriginalSize - totalCompressedSize;

    return {
      totalFiles: files.length,
      compressedFiles: compressedFiles.length,
      totalOriginalSize,
      totalCompressedSize,
      totalSaved,
      totalSavedFormatted: formatFileSize(totalSaved),
      averageCompressionRatio: compressedFiles.length > 0 ? compressedFiles.reduce((sum, f) => sum + (f.compressionRatio || 0), 0) / compressedFiles.length : 0
    };
  }, [files]);

  return {
    files,
    isProcessing,
    isDragOver,
    processFiles,
    removeFile,
    clearAllFiles,
    triggerFileSelect,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    fileInputRef,
    getCompressionSummary,
    setFiles,
    setIsProcessing
  };
};

/**
 * Helper function to convert file to base64
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 1024 * 1024) return reject(new Error('File too large for base64 conversion (max 1MB)'));
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Failed to convert file to base64'));
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsDataURL(file);
  });
};
