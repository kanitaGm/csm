// src/components/utils/MultiFileInput.tsx - Enhanced with New File System
import React, { useState, useEffect } from "react";
import { Trash2, Plus, Upload, Eye } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";
import { compressFile, formatFileSize, getFileTypeIcon } from "../utils";
import { useToast } from "../hooks/useToast";

interface MultiFileInputProps {
  value?: string[];
  onFilesChange: (urls: string[]) => void;
  maxFiles?: number;
  acceptTypes?: string[];
  vdCode: string;
  disabled?: boolean;
  label?: string;
  className?: string;
}

interface FileState {
  url: string;
  name: string;
  size?: number;
  type?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  preview?: string;
}

export default function MultiFileInput({
  value = [],
  onFilesChange,
  maxFiles = 5,
  acceptTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  vdCode,
  disabled = false,
  label = "File Attachment",
  className = "",
}: MultiFileInputProps) {
  const [fileStates, setFileStates] = useState<FileState[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { addToast } = useToast();

  // Sync external URLs to internal state
  useEffect(() => {
    const newFileStates = value.map(url => ({
      url,
      name: decodeURIComponent(url.split("/").pop() || "unknown"),
    }));
    setFileStates(newFileStates);
  }, [value]);

  // Firebase upload function
  const uploadFile = async (
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    const path = `csmFile/${vdCode}/${Date.now()}_${file.name}`;
    const fileRef = ref(storage, path);
    
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileRef, file);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(Math.round(progress));
        },
        (error) => reject(error),
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  };

  // Handle file processing and upload
  const handleFiles = async (filesList: FileList | File[]) => {
    if (disabled) return;

    const filesArray = Array.from(filesList);
    const currentFileCount = fileStates.length;
    
    // Check file limit
    if (maxFiles && currentFileCount + filesArray.length > maxFiles) {
      addToast({
        type: 'error',
        title: 'เกินขีดจำกัด',
        message: `สามารถอัปโหลดได้สูงสุด ${maxFiles} ไฟล์`
      });
      return;
    }

    setIsProcessing(true);
    const newFileStates: FileState[] = [];
    const newUrls: string[] = [];

    try {
      for (const file of filesArray) {
        // Validate file type
        if (!acceptTypes.includes(file.type)) {
          addToast({
            type: 'error',
            title: 'ไฟล์ไม่รองรับ',
            message: `ไฟล์ประเภท ${file.type} ไม่รองรับ`
          });
          continue;
        }

        // Create initial file state
        const initialState: FileState = {
          url: '',
          name: file.name,
          size: file.size,
          type: file.type,
          isUploading: true,
          uploadProgress: 0
        };

        // Add to state immediately to show progress
        setFileStates(prev => [...prev, initialState]);
        const currentIndex = fileStates.length + newFileStates.length;

        try {
          // Compress file if supported
          let processedFile = file;
          let previewURL = '';
          
          if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            addToast({
              type: 'info',
              title: 'กำลังบีบอัดไฟล์',
              message: `กำลังประมวลผล ${file.name}...`,
              duration: 2000
            });

            const compressionResult = await compressFile(file, {
              onProgress: (progress) => {
                setFileStates(prev => 
                  prev.map((state, index) => 
                    index === currentIndex 
                      ? { ...state, uploadProgress: Math.round(progress * 0.3) } // 30% for compression
                      : state
                  )
                );
              }
            });

            processedFile = compressionResult.compressedFile;
            if (compressionResult.previewURL) {
              previewURL = compressionResult.previewURL;
            }

            // Show compression result
            if (compressionResult.compressionApplied) {
              const savedKB = Math.round((file.size - processedFile.size) / 1024);
              if (savedKB > 10) {
                addToast({
                  type: 'success',
                  title: 'บีบอัดสำเร็จ',
                  message: `${file.name}: ลดขนาด ${savedKB}KB`,
                  duration: 3000
                });
              }
            }
          }

          // Upload to Firebase
          const uploadedURL = await uploadFile(processedFile, (progress) => {
            setFileStates(prev => 
              prev.map((state, index) => 
                index === currentIndex 
                  ? { ...state, uploadProgress: 30 + Math.round(progress * 0.7) } // 70% for upload
                  : state
              )
            );
          });

          // Update file state with final URL
          const finalState: FileState = {
            url: uploadedURL,
            name: file.name,
            size: processedFile.size,
            type: file.type,
            isUploading: false,
            uploadProgress: 100,
            preview: previewURL || (file.type.startsWith('image/') ? uploadedURL : undefined)
          };

          newFileStates.push(finalState);
          newUrls.push(uploadedURL);

          // Update state
          setFileStates(prev => 
            prev.map((state, index) => 
              index === currentIndex ? finalState : state
            )
          );

          // Clean up preview URL if it was created locally
          if (previewURL && previewURL.startsWith('blob:')) {
            setTimeout(() => URL.revokeObjectURL(previewURL), 5000);
          }

        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          
          // Remove failed file from state
          setFileStates(prev => prev.filter((_, index) => index !== currentIndex));
          
          addToast({
            type: 'error',
            title: 'อัปโหลดล้มเหลว',
            message: `ไม่สามารถอัปโหลด ${file.name} ได้`
          });
        }
      }

      // Update parent component with new URLs
      if (newUrls.length > 0) {
        onFilesChange([...value, ...newUrls]);
      }

    } finally {
      setIsProcessing(false);
    }
  };

  // File input change handler
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;
    
    handleFiles(e.target.files);
    e.target.value = ""; // Reset input
  };

  // Drag and drop handlers
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || !e.dataTransfer.files) return;
    handleFiles(e.dataTransfer.files);
  };

  // Remove file
  const removeFile = (index: number) => {
    if (disabled) return;

    const newFileStates = fileStates.filter((_, i) => i !== index);
    const newUrls = newFileStates.map(state => state.url).filter(url => url);
    
    setFileStates(newFileStates);
    onFilesChange(newUrls);

    addToast({
      type: 'info',
      title: 'ลบไฟล์แล้ว',
      message: 'ไฟล์ถูกลบออกจากรายการ'
    });
  };

  // Click handlers
  const handleDropZoneClick = () => {
    if (disabled) return;
    document.getElementById(`multi-file-input-${vdCode}`)?.click();
  };

  const handleAddFileClick = () => {
    if (disabled) return;
    document.getElementById(`multi-file-input-${vdCode}`)?.click();
  };

  // View file
  const viewFile = (fileState: FileState) => {
    if (fileState.url) {
      window.open(fileState.url, '_blank');
    }
  };

  const getFileIcon = (type: string) => {
    const IconComponent = getFileTypeIcon(type);
    return <IconComponent className="w-6 h-6 text-gray-500" />;
  };

  return (
    <div className={`${className} ${disabled ? 'opacity-50' : ''}`}>
      {/* Label */}
      <label className="block mb-3 text-sm font-medium text-gray-700">
        {label}
        {disabled && <span className="ml-2 text-xs text-gray-500">(ไม่สามารถแก้ไขได้)</span>}
      </label>
      
      {/* Drop Zone */}
      {!disabled && (
        <div
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={handleDropZoneClick}
          className={`
            relative p-6 text-center transition-all duration-200 border-2 border-dashed rounded-lg cursor-pointer mb-4
            ${isDragOver 
              ? 'border-blue-400 bg-blue-50 scale-105' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
            ${isProcessing ? 'pointer-events-none opacity-75' : ''}
          `}
        >
          <input
            id={`multi-file-input-${vdCode}`}
            type="file"
            accept={acceptTypes.join(",")}
            multiple
            disabled={disabled}
            onChange={onInputChange}
            className="hidden"
          />
          
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-8 h-8 border-b-2 border-blue-500 rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600">กำลังประมวลผลไฟล์...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="w-8 h-8 text-gray-400" />
              <p className="text-lg text-gray-700">
                ลากไฟล์มาวาง หรือ <span className="text-blue-500 underline">คลิกเพื่อเลือก</span>
              </p>
              <p className="text-sm text-gray-500">
                รองรับ: JPG, PNG, WebP, PDF (สูงสุด {maxFiles} ไฟล์)
              </p>
              <p className="text-xs text-green-600">
                ✨ รูปภาพและ PDF จะถูกบีบอัดอัตโนมัติ
              </p>
            </div>
          )}
        </div>
      )}

      {/* File List */}
      {fileStates.length > 0 && (
        <div className="mb-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            ไฟล์ที่แนบ ({fileStates.length})
            {maxFiles && ` / ${maxFiles}`}
          </h4>
          
          {fileStates.map((fileState, index) => (
            <div key={index} className="flex items-center p-3 transition-shadow bg-white border border-gray-200 rounded-lg hover:shadow-sm">
              {/* File Icon/Preview */}
              <div className="relative flex-shrink-0 w-12 h-12 mr-3">
                {fileState.preview ? (
                  <img 
                    src={fileState.preview} 
                    alt="Preview" 
                    className="object-cover w-12 h-12 rounded"
                  />
                ) : (
                  <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded">                    
                    {getFileIcon(fileState.type || 'application/octet-stream')}
                  </div>
                )}

                {/* Upload Progress */}
                {fileState.isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
                    <div className="text-xs font-medium text-white">
                      {fileState.uploadProgress || 0}%
                    </div>
                  </div>
                )}
              </div>

              {/* File Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {fileState.name}
                </p>
                <div className="flex items-center mt-1 space-x-2">
                  {fileState.size && (
                    <p className="text-xs text-gray-500">
                      {formatFileSize(fileState.size)}
                    </p>
                  )}
                  {fileState.isUploading && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded animate-pulse">
                      กำลังอัปโหลด...
                    </span>
                  )}
                  {!fileState.isUploading && fileState.url && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                      ✓ อัปโหลดแล้ว
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {fileState.isUploading && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${fileState.uploadProgress || 0}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center ml-2 space-x-1">
                {fileState.url && !fileState.isUploading && (
                  <button
                    onClick={() => viewFile(fileState)}
                    className="p-1 text-gray-400 transition-colors hover:text-gray-600"
                    title="ดูไฟล์"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                
                {!disabled && !fileState.isUploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-gray-400 transition-colors hover:text-red-600"
                    title="ลบไฟล์"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add File Button */}
      <button
        type="button"
        onClick={handleAddFileClick}
        disabled={disabled || (maxFiles !== undefined && fileStates.length >= maxFiles) || isProcessing}
        className={`
          inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md
          ${disabled || (maxFiles !== undefined && fileStates.length >= maxFiles) || isProcessing
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }
        `}
        title={
          disabled 
            ? "ไม่สามารถเพิ่มได้ในโหมดอ่านอย่างเดียว" 
            : maxFiles !== undefined && fileStates.length >= maxFiles
            ? "ถึงขีดจำกัดจำนวนไฟล์แล้ว"
            : "เพิ่มไฟล์"
        }
      >
        <Plus className="w-4 h-4 mr-2" />
        เพิ่มไฟล์
      </button>

      {/* File Count */}
      {maxFiles !== undefined && (
        <div className="mt-2 text-xs text-gray-600">
          {fileStates.length} / {maxFiles} ไฟล์
          {disabled && <span className="ml-2">(โหมดอ่านอย่างเดียว)</span>}
        </div>
      )}
    </div>
  );
}

/*
// การใช้งานเหมือนเดิม
<MultiFileInput
  value={attachmentUrls}
  onFilesChange={setAttachmentUrls}
  maxFiles={5}
  vdCode={assessment.vdCode}
  disabled={false}
  label="แนบเอกสารประกอบ"
  acceptTypes={['image/jpeg', 'image/png', 'image/webp', 'application/pdf']}
/>
*/