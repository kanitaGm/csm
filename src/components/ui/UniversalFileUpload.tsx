// src/components/UniversalFileUpload.tsx - Enhanced UI Component
import React from 'react';
import { Upload, X,  Download, Eye } from 'lucide-react';
import { useFileUpload } from '../../hooks/useFileUpload';
import { formatFileSize, getFileTypeIcon } from '../../utils/fileCompression';
import type { FileAttachment, UseFileUploadOptions } from '../../hooks/useFileUpload';

interface UniversalFileUploadProps {
  files?: FileAttachment[];
  onFilesChange?: (files: FileAttachment[]) => void;
  options?: UseFileUploadOptions & {
    disabled?: boolean;
    label?: string;
    description?: string;
    className?: string;
    showPreview?: boolean;
    showCompressionInfo?: boolean;
    acceptedFileTypes?: string;
  };
}

export const UniversalFileUpload: React.FC<UniversalFileUploadProps> = ({
  files: externalFiles,
  onFilesChange,
  options = {}
}) => {
  const {
    disabled = false,
    label = 'แนบไฟล์หลักฐาน (ถ้ามี)',
    description = 'รองรับ: JPG, PNG, WebP, PDF, DOC, DOCX (ขนาดไม่เกิน 10MB)',
    className = '',
    showPreview = true,
    showCompressionInfo = true,
    acceptedFileTypes = 'image/*,.pdf,.doc,.docx',
    ...hookOptions
  } = options;

  // Use the custom hook
  const {
    files: internalFiles,
    isProcessing,
    isDragOver,
    removeFile,
    clearAllFiles,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    fileInputRef,
    getCompressionSummary
  } = useFileUpload(hookOptions);

  // Use external files if provided, otherwise use internal state
  const currentFiles = externalFiles || internalFiles;

  // Notify parent of file changes
  React.useEffect(() => {
    if (onFilesChange && !externalFiles) {
      onFilesChange(internalFiles);
    }
  }, [internalFiles, onFilesChange, externalFiles]);

  const handleRemoveFile = (id: string) => {
    if (externalFiles && onFilesChange) {
      // External file management
      const updatedFiles = externalFiles.filter(f => f.id !== id);
      const fileToRemove = externalFiles.find(f => f.id === id);
      if (fileToRemove?.url) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      onFilesChange(updatedFiles);
    } else {
      // Internal file management
      removeFile(id);
    }
  };

  const handleClearAll = () => {
    if (externalFiles && onFilesChange) {
      // Clean up external files
      externalFiles.forEach(file => {
        if (file.url) {
          URL.revokeObjectURL(file.url);
        }
      });
      onFilesChange([]);
    } else {
      clearAllFiles();
    }
  };

  const compressionSummary = getCompressionSummary();

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      {/* Drop Zone */}
      {!disabled && (
        <div
          className={`
            relative p-6 text-center transition-all duration-200 border-2 border-dashed rounded-lg cursor-pointer
            ${isDragOver 
              ? 'border-blue-400 bg-blue-50 scale-105' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
            ${isProcessing ? 'pointer-events-none opacity-75' : ''}
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedFileTypes}
            onChange={handleFileSelect}
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
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          )}
        </div>
      )}

      {/* File Preview Section */}
      {currentFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              ไฟล์ที่แนบ ({currentFiles.length})
            </h4>
            {currentFiles.length > 1 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-red-600 transition-colors hover:text-red-800"
              >
                ลบทั้งหมด
              </button>
            )}
          </div>

          {/* Compression Summary */}
          {showCompressionInfo && compressionSummary.totalOriginalSize > 0 && (
            <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
              <div className="text-xs text-blue-700">
                <div className="flex items-center justify-between">
                  <span>ขนาดไฟล์รวม:</span>
                  <span>{formatFileSize(compressionSummary.totalCompressedSize)}</span>
                </div>
                {compressionSummary.averageCompressionRatio > 0.1 && (
                  <div className="flex items-center justify-between mt-1">
                    <span>ประหยัดพื้นที่:</span>
                    <span className="font-medium text-green-600">
                      -{Math.round((1 - compressionSummary.averageCompressionRatio) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Files List */}
          <div className="grid gap-3 overflow-y-auto max-h-60">
            {currentFiles.map((file) => (
              <FilePreviewCard
                key={file.id}
                file={file}
                showPreview={showPreview}
                onRemove={handleRemoveFile}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// File Preview Card Component
interface FilePreviewCardProps {
  file: FileAttachment;
  showPreview: boolean;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const FilePreviewCard: React.FC<FilePreviewCardProps> = ({
  file,
  showPreview,
  onRemove,
  disabled = false
}) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  const isImage = file.type.startsWith('image/');
  const FileIcon = getFileTypeIcon(file.type);

  const handleDownload = () => {
    if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePreview = () => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  return (
    <div className="flex items-center p-3 transition-shadow bg-white border border-gray-200 rounded-lg hover:shadow-sm">
      {/* File Icon/Preview */}
      <div className="relative flex-shrink-0 w-12 h-12 mr-3">
        {showPreview && isImage && file.url && !imageError ? (
          <img
            src={file.url}
            alt={file.name}
            className={`w-12 h-12 object-cover rounded transition-opacity ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded">
            <FileIcon  />
          </div>
        )}
        
        {/* Loading overlay for images */}
        {showPreview && isImage && file.url && !imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
            <div className="w-4 h-4 border-b-2 border-gray-400 rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* File Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        <div className="flex items-center mt-1 space-x-2">
          <p className="text-xs text-gray-500">
            {formatFileSize(file.size)}
          </p>
          {file.compressionRatio && file.compressionRatio < 0.9 && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
              -{Math.round((1 - file.compressionRatio) * 100)}%
            </span>
          )}
          {file.status === 'processing' && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded animate-pulse">
              ประมวลผล...
            </span>
          )}
          {file.status === 'error' && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
              ข้อผิดพลาด
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center ml-2 space-x-1">
        {file.url && (
          <>
            <button
              onClick={handlePreview}
              className="p-1 text-gray-400 transition-colors hover:text-gray-600"
              title="ดูไฟล์"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="p-1 text-gray-400 transition-colors hover:text-gray-600"
              title="ดาวน์โหลด"
            >
              <Download className="w-4 h-4" />
            </button>
          </>
        )}
        
        {!disabled && (
          <button
            onClick={() => onRemove(file.id)}
            className="p-1 text-gray-400 transition-colors hover:text-red-600"
            title="ลบไฟล์"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default UniversalFileUpload;