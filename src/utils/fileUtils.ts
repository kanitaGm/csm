// src/utils/fileUtils.ts - Simple Version
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression'; 
import { storage } from '../config/firebase';
import { sanitizeEmpId } from '../utils/employeeUtils';

interface CompressionResult {
  compressedFile: File;
  previewURL: string;
  compressionRatio: number;
  originalSize: number;
  compressedSize: number;
}

interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

/**
 *  Simple image compression without Web Workers
 */
export const compressAndCreatePreview = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<CompressionResult> => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Check file size limit (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size must be less than 10MB');
  }

  const options = {
    maxSizeMB: 0.2, // 200KB max
    maxWidthOrHeight: 600,
    initialQuality: 0.8,
    fileType: 'image/webp' as const,
    useWebWorker: false, // Disable for compatibility
    onProgress: onProgress ? (progress: number) => {
      onProgress(Math.round(progress * 100));
    } : undefined,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    const previewURL = URL.createObjectURL(compressedFile);
    const compressionRatio = file.size > 0 
      ? ((file.size - compressedFile.size) / file.size) * 100 
      : 0;

    return {
      compressedFile,
      previewURL,
      compressionRatio,
      originalSize: file.size,
      compressedSize: compressedFile.size
    };

  } catch (error) {
    console.error('Error during image compression:', error);
    throw new Error(`Image compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 *  Simple employee photo upload
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

    // Compress image first
    const compressionResult = await compressAndCreatePreview(photoFile);
    
    // Create storage path
    const empIdForPath = sanitizeEmpId(empId);
    const timestamp = Date.now();
    const newFilename = `${empIdForPath}_profile_${timestamp}.webp`;
    const storageRef = ref(storage, `employees/${empIdForPath}/photo/${newFilename}`);
    
    // Upload with progress tracking
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
            
            // Clean up preview URL
            URL.revokeObjectURL(compressionResult.previewURL);
            
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
 *  Simple file validation
 */
export const validateFile = (
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(maxSize / 1024 / 1024)}MB)`
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  return { valid: true };
};

/**
 *  Create simple thumbnail
 */
export const createThumbnail = async (
  file: File,
  size: number = 150
): Promise<{ thumbnailFile: File; thumbnailURL: string }> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  try {
    const options = {
      maxSizeMB: 0.05, // 50KB for thumbnail
      maxWidthOrHeight: size,
      initialQuality: 0.7,
      fileType: 'image/webp' as const,
      useWebWorker: false
    };

    const thumbnailFile = await imageCompression(file, options);
    const thumbnailURL = URL.createObjectURL(thumbnailFile);

    return { thumbnailFile, thumbnailURL };

  } catch (error) {
    console.error('Error creating thumbnail:', error);
    throw new Error(`Thumbnail creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 *  Memory cleanup utility
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
 *  Convert file to base64 (for small files)
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
 *  Download file from URL
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
 *  Get file metadata
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