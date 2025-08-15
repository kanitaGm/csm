// src/utils/fileUtils.ts - Firebase & Legacy Support Only
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { sanitizeEmpId } from '../utils/employeeUtils';
import { compressFile } from './fileCompression';
import type { CompressionResult } from './fileCompression';

interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}



/**
 * Employee photo upload with compression using new system
 */
export const uploadEmployeePhoto = async (
  photoFile: File | null,
  empId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string | null> => {
  if (!photoFile) return null;
  
  if (!empId) {
    throw new Error("Employee ID is required for photo upload");
  }

  try {
    // Validate file
    if (!photoFile.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Use new compression system
    const compressionResult = await compressFile(photoFile, {
      imageOptions: {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 600,
        quality: 0.8,
        fileType: 'image/webp'
      }
    });
    
    // Create storage path
    const empIdForPath = sanitizeEmpId(empId);
    const timestamp = Date.now();
    const newFilename = `${empIdForPath}_profile_${timestamp}.webp`;
    const storageRef = ref(storage, `employees/${empIdForPath}/photo/${newFilename}`);
    
    // Upload compressed file with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, compressionResult.compressedFile);
    
    return new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (onProgress) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress({
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              progress: Math.round(progress)
            });
          }
        },
        (error) => {
          console.error("Upload error:", error);
          reject(new Error(`Upload failed: ${error.message}`));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Clean up preview URL if exists
            if (compressionResult.previewURL) {
              URL.revokeObjectURL(compressionResult.previewURL);
            }
            
            resolve(downloadURL);
          } catch (error) {
            reject(new Error(`Failed to get download URL: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        }
      );
    });

  } catch (error) {
    console.error("Error during photo upload:", error);
    throw new Error(`Photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Upload multiple files to Firebase Storage
 */
export const uploadMultipleFiles = async (
  files: File[],
  storagePath: string,
  options: {
    onProgress?: (fileIndex: number, totalFiles: number, fileProgress: number) => void;
    onFileComplete?: (downloadURL: string, fileIndex: number, originalFile: File) => void;
    compressFiles?: boolean;
  } = {}
): Promise<string[]> => {
  const { onProgress, onFileComplete, compressFiles = true } = options;
  const downloadURLs: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      // Compress file if enabled and file type is supported
      let fileToUpload = file;
      if (compressFiles && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        const compressionResult = await compressFile(file);
        fileToUpload = compressionResult.compressedFile;
      }

      // Create unique filename
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      const filename = `${timestamp}_${randomSuffix}_${file.name}`;
      const storageRef = ref(storage, `${storagePath}/${filename}`);
      
      // Upload file
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);
      
      const downloadURL = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress?.(i, files.length, Math.round(progress));
          },
          (error) => {
            reject(error);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (error) {
              reject(error);
            }
          }
        );
      });

      downloadURLs.push(downloadURL);
      onFileComplete?.(downloadURL, i, file);

    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return downloadURLs;
};

/**
 * Download file from URL with better error handling
 */
export const downloadFile = async (
  url: string,
  filename: string
): Promise<void> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 100);
    
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Delete file from Firebase Storage
 */
export const deleteFileFromStorage = async (downloadURL: string): Promise<void> => {
  try {
    // Extract storage path from download URL
    const url = new URL(downloadURL);
    // Match Firebase Storage URL pattern: /v0/b/{bucket}/o/{path}
    const pathMatch = url.pathname.match(/\/v0\/b\/[^/]+\/o\/(.+)/);
    
    if (!pathMatch) {
      throw new Error('Invalid Firebase Storage URL');
    }
    
    const storagePath = decodeURIComponent(pathMatch[1]);
    const fileRef = ref(storage, storagePath);
    
    // Delete file
    const { deleteObject } = await import('firebase/storage');
    await deleteObject(fileRef);
    
  } catch (error) {
    console.error('Error deleting file from storage:', error);
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Convert file to base64 (for small files only)
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check file size limit (1MB for base64)
    if (file.size > 1024 * 1024) {
      reject(new Error('File too large for base64 conversion (max 1MB)'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Memory cleanup utility
 */
export const cleanupObjectURLs = (urls: string[]): void => {
  urls.forEach(url => {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Failed to revoke object URL:', url, error);
    }
  });
};

/**
 * Get file metadata
 */
export const getFileMetadata = (file: File): {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  sizeFormatted: string;
} => {
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    sizeFormatted: formatSize(file.size)
  };
};

/**
 * Batch upload with compression and progress tracking
 */
export const uploadCompressedFiles = async (
  files: File[],
  storagePath: string,
  options: {
    onProgress?: (current: number, total: number, currentFileProgress: number) => void;
    onFileComplete?: (result: { downloadURL: string; originalFile: File; compressionInfo: CompressionResult }) => void;
    maxConcurrent?: number;
  } = {}
): Promise<Array<{ downloadURL: string; originalFile: File; compressionInfo: CompressionResult }>> => {
  const { onProgress, onFileComplete, maxConcurrent = 3 } = options;
  const results: Array<{ downloadURL: string; originalFile: File; compressionInfo: CompressionResult }> = [];
  
  // Process files in batches
  for (let i = 0; i < files.length; i += maxConcurrent) {
    const batch = files.slice(i, i + maxConcurrent);
    
    const batchPromises = batch.map(async (file, batchIndex) => {
      const fileIndex = i + batchIndex;
      
      try {
        // Compress file first
        const compressionResult = await compressFile(file, {
          onProgress: (progress) => {
            onProgress?.(fileIndex + 1, files.length, progress);
          }
        });

        // Create unique filename
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substr(2, 9);
        const filename = `${timestamp}_${randomSuffix}_${file.name}`;
        const storageRef = ref(storage, `${storagePath}/${filename}`);
        
        // Upload compressed file
        const uploadTask = uploadBytesResumable(storageRef, compressionResult.compressedFile);
        
        const downloadURL = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress?.(fileIndex + 1, files.length, Math.round(progress));
            },
            reject,
            async () => {
              try {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
              } catch (error) {
                reject(error);
              }
            }
          );
        });

        const result = {
          downloadURL,
          originalFile: file,
          compressionInfo: compressionResult
        };

        onFileComplete?.(result);
        return result;

      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        throw error;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
};