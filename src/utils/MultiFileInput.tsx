// src/components/utils/MultiFileInput.tsx
import React, { useState, useEffect } from "react";
import DeleteForeverSharpIcon from "@mui/icons-material/DeleteForeverSharp";
import { FaPlus } from "react-icons/fa";
import { compressAndCreatePreview } from "./fileUtils";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";

interface MultiFileInputProps {
  value?: string[];
  onFilesChange: (urls: string[]) => void;
  maxFiles?: number;
  acceptTypes?: string[];
  vdCode: string;
  disabled?: boolean; // เพิ่ม optional disabled prop
}

export default function MultiFileInput({
  value = [],
  onFilesChange,
  maxFiles = 2,
  acceptTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  vdCode,
  disabled = false, // เพิ่ม default value
}: MultiFileInputProps) {
  const [urls, setUrls] = useState<string[]>(value);
  const [previews, setPreviews] = useState<(string | null)[]>([]);

  // Sync props value to internal state
  useEffect(() => {
    setUrls(value);
  }, [value]);

  // อัพโหลดไฟล์ขึ้น Firebase Storage
  const uploadFile = async (file: File): Promise<string> => {
    const path = `csmFile/${vdCode}/${Date.now()}_${file.name}`;
    const fileRef = ref(storage, path);
    const snapshot = await uploadBytesResumable(fileRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  // เมื่อเลือกหรือ drag & drop ไฟล์เข้ามา (รองรับไฟล์หลายไฟล์พร้อมกัน)
  const handleFiles = async (filesList: FileList | File[]) => {
    if (disabled) return; // ป้องกันการอัปโหลดเมื่อ disabled

    const filesArray = Array.from(filesList);
    const uploadedFiles: string[] = [];
    const uploadedPreviews: (string | null)[] = [];

    for (const file of filesArray) {
      if (maxFiles && urls.length + uploadedFiles.length >= maxFiles) break; // จำกัดจำนวนไฟล์

      if (!acceptTypes.includes(file.type)) {
        alert(`ไฟล์ชนิด ${file.type} ไม่รองรับ`);
        continue;
      }

      let processedFile = file;
      let previewURL = "";

      if (file.type.startsWith("image/")) {
        try {
          const result = await compressAndCreatePreview(file);
          processedFile = result.compressedFile;
          previewURL = result.previewURL;
        } catch {
          console.warn("ใช้ไฟล์ต้นฉบับเพราะบีบอัดไม่สำเร็จ");
        }
      }

      try {
        const uploadedURL = await uploadFile(processedFile);
        uploadedFiles.push(uploadedURL);
        uploadedPreviews.push(previewURL || (file.type.startsWith("image/") ? uploadedURL : null));
      } catch (err) {
        console.error("อัปโหลดไฟล์ไม่สำเร็จ", err);
        alert(`อัปโหลดไฟล์ ${file.name} ไม่สำเร็จ`);
      }
    }

    // ใช้ spread operator แทน push เพื่อหลีกเลี่ยง warning
    const newUrls = [...urls, ...uploadedFiles];
    const newPreviews = [...previews, ...uploadedPreviews];
    
    setUrls(newUrls);
    setPreviews(newPreviews);
    onFilesChange(newUrls);
  };

  // handle input file change (เลือกไฟล์)
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return; // ป้องกันเมื่อ disabled
    
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = ""; // clear input เพื่อให้เลือกไฟล์ซ้ำได้
    }
  };

  // handle drag & drop event
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return; // ป้องกันเมื่อ disabled
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // ลบไฟล์ใน list
  const removeFile = (index: number) => {
    if (disabled) return; // ป้องกันการลบเมื่อ disabled
    
    const newUrls = urls.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setUrls(newUrls);
    setPreviews(newPreviews);
    onFilesChange(newUrls);
  };

  // คลิกเพื่อเลือกไฟล์
  const handleDropZoneClick = () => {
    if (disabled) return; // ป้องกันเมื่อ disabled
    
    const fileInput = document.getElementById("multi-file-input");
    fileInput?.click();
  };

  const handleAddFileClick = () => {
    if (disabled) return; // ป้องกันเมื่อ disabled
    
    document.getElementById("multi-file-input")?.click();
  };

  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <label className="block mb-2 text-sm font-medium text-gray-700">
        File Attachment:
        {disabled && <span className="ml-2 text-xs text-gray-500">(ไม่สามารถแก้ไขได้)</span>}
      </label>
      
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={{
          padding: 10,
          border: "2px dashed #ccc",
          borderRadius: 6,
          marginBottom: 10,
          textAlign: "center",
          color: disabled ? "#999" : "#666",
          cursor: disabled ? "not-allowed" : "pointer",
          backgroundColor: disabled ? "#f5f5f5" : "transparent",
        }}
        title={disabled ? "โหมดอ่านอย่างเดียว" : "ลากไฟล์มาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์"}
        onClick={handleDropZoneClick}
      >
        {disabled ? (
          "โหมดอ่านอย่างเดียว - ไม่สามารถเพิ่มไฟล์ได้"
        ) : urls.length === 0 ? (
          "ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์ (สูงสุด 5 ไฟล์)"
        ) : (
          "เพิ่มไฟล์โดยลากหรือเลือก"
        )}
      </div>

      <input
        id="multi-file-input"
        type="file"
        accept={acceptTypes.join(",")}
        multiple
        disabled={disabled}
        style={{ display: "none" }}
        onChange={onInputChange}
      />

      {urls.map((url, index) => (
        <div key={index} style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
          {previews[index] ? (
            <img 
              src={previews[index]!} 
              alt="Preview" 
              width={100} 
              style={{ 
                marginRight: 10, 
                objectFit: "contain",
                opacity: disabled ? 0.7 : 1
              }} 
            />
          ) : (
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ 
                marginRight: 10,
                color: disabled ? "#999" : "#007bff"
              }}
            >
              🔗 เปิดไฟล์
            </a>
          )}

          <span style={{ 
            flex: 1, 
            wordBreak: "break-all",
            color: disabled ? "#999" : "inherit"
          }}>
            {decodeURIComponent(url.split("/").pop() || "")}
          </span>

          <button
            type="button"
            onClick={() => removeFile(index)}
            disabled={disabled}
            style={{
              marginLeft: 10,
              background: disabled ? "#f5f5f5" : "#fecfcc",
              border: "none",
              padding: "4px 8px",
              cursor: disabled ? "not-allowed" : "pointer",
              color: disabled ? "#999" : "#dc3545",
              borderRadius: 4,
              opacity: disabled ? 0.5 : 1,
            }}
            title={disabled ? "ไม่สามารถลบได้ในโหมดอ่านอย่างเดียว" : "ลบไฟล์"}
          >
            <DeleteForeverSharpIcon />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddFileClick}
        disabled={disabled || (maxFiles !== undefined && urls.length >= maxFiles)}
        className="btn btn-info"
        style={{ 
          marginTop: 6,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
          backgroundColor: disabled ? "#f5f5f5" : undefined,
          color: disabled ? "#999" : undefined,
        }}
        title={disabled ? "ไม่สามารถเพิ่มได้ในโหมดอ่านอย่างเดียว" : "เพิ่มไฟล์"}
      >
        <FaPlus style={{ marginRight: 6 }} />
        เพิ่มไฟล์
      </button>

      {maxFiles !== undefined && (
        <div style={{ 
          fontSize: "0.9em", 
          marginTop: 4, 
          color: disabled ? "#999" : "#666" 
        }}>
          {urls.length} / {maxFiles} ไฟล์
          {disabled && <span className="ml-2 text-xs">(โหมดอ่านอย่างเดียว)</span>}
        </div>
      )}
    </div>
  );
}