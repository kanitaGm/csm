// src/components/utils/fileUtils.js
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { Options } from 'browser-image-compression'; 
import imageCompression from 'browser-image-compression'; 
import { storage } from '../../services/firebase';
import { sanitizeEmpId } from '../utils/employeeUtils';


/** * อัปโหลดรูปภาพพนักงานไปยัง Firebase Storage */
export const uploadEmployeePhoto = async (photoFile: File | null, empId: string): Promise<string | null> => {
  if (!photoFile) return null;
  if (!empId) throw new Error("Employee ID is required for photo upload.");
  try {
    const empIdForPath = sanitizeEmpId(empId);
    const newFilename = `${empIdForPath}_profile_${Date.now()}.webp`;
    const storageRef = ref(storage, `employees/${empIdForPath}/photo/${newFilename}`);
    const uploadTask = await uploadBytesResumable(storageRef, photoFile);
    return await getDownloadURL(uploadTask.ref);
  } catch (error) {
    console.error("Error during photo upload:", error);
    throw new Error("Failed to upload employee photo.");
  }
};
 
/** * บีบอัดรูปภาพและสร้าง URL สำหรับ Preview ****  ใช้ imageCompression library  
 * @param file - ไฟล์รูปภาพที่ต้องการบีบอัด
 * @param onProgress - (Optional) ฟังก์ชัน callback สำหรับรายงานความคืบหน้า
 */
export const compressAndCreatePreview = async (
  file: File,  onProgress?: (progress: number) => void): Promise<{ compressedFile: File, previewURL: string }> => {
  const options: Options = {
    maxSizeMB: 0.2, // ขนาดไฟล์สุดท้ายไม่เกิน 200KB
    maxWidthOrHeight: 600,  // ด้านที่ยาวที่สุดไม่เกิน 600px
    initialQuality: 0.8, // เริ่มบีบอัดที่คุณภาพ 80%
    fileType: 'image/webp',  // แปลงไฟล์เป็น WebP เสมอ
    // --- การตั้งค่าขั้นสูง ---
    useWebWorker: true,  // ใช้ Web Worker เพื่อไม่ให้หน้าเว็บค้าง    
    //maxIteration: 10,          // พยายามบีบอัดซ้ำ 10 ครั้ง
    exifOrientation : -1,     // แก้ปัญหารูปตะแคงอัตโนมัติ ค่า -1 หมายถึง "แก้ไขการหมุนภาพอัตโนมัติตามข้อมูล EXIF"
    onProgress: onProgress,     //ใช้ onProgress ที่รับเข้ามา
  };
  
  try {
    const compressedFile = await imageCompression(file, options);
    const previewURL = URL.createObjectURL(compressedFile);
    return { compressedFile, previewURL };
  } catch (error) {
    console.error('Error during image compression:', error);
    throw new Error('An error occurred while processing the image.');
  }
};


///////////// resizeImageFile  บีบอัดรูปภาพและสร้าง URL (เขียนเองโดยใช้ canvas) คืนค่าเป็นไฟล์แบบเดียวกับต้นฉบับ (type เดิม เช่น image/jpeg)
export const resizeImageFile = (
  file: File,
  maxSize: number = 256): Promise<File> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        image.src = result;
      } else {
        reject(new Error('Failed to read image file'));
      }
    };

    image.onload = () => {
      let width = image.width;
      let height = image.height;

      // คำนวณขนาดใหม่ (preserve aspect ratio)
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > width && height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      } else if (width === height && width > maxSize) {
        width = height = maxSize;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas rendering context not available'));
        return;
      }

      ctx.drawImage(image, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        file.type,
        0.8 // quality (0-1)
      );
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

