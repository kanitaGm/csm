// src/components/utils/MultiFileInput.tsx
import React, { useState, useEffect } from "react";
import DeleteForeverSharpIcon from "@mui/icons-material/DeleteForeverSharp";
import { FaPlus } from "react-icons/fa";
import { compressAndCreatePreview } from "./fileUtils";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../services/firebase";

interface MultiFileInputProps {
  value?: string[];
  onFilesChange: (urls: string[]) => void;
  maxFiles?: number;
  acceptTypes?: string[];
  vdCode: string;
}

export default function MultiFileInput({
  value = [],
  onFilesChange,
  maxFiles = 2,
  acceptTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  vdCode,
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
    const filesArray = Array.from(filesList);
    let newUrls = [...urls];
    let newPreviews = [...previews];

    for (const file of filesArray) {
      if (maxFiles && newUrls.length >= maxFiles) break; // จำกัดจำนวนไฟล์

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
        newUrls.push(uploadedURL);
        newPreviews.push(previewURL || (file.type.startsWith("image/") ? uploadedURL : null));
      } catch (err) {
        console.error("อัปโหลดไฟล์ไม่สำเร็จ", err);
        alert(`อัปโหลดไฟล์ ${file.name} ไม่สำเร็จ`);
      }
    }

    setUrls(newUrls);
    setPreviews(newPreviews);
    onFilesChange(newUrls);
  };

  // handle input file change (เลือกไฟล์)
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = ""; // clear input เพื่อให้เลือกไฟล์ซ้ำได้
    }
  };

  // handle drag & drop event
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // ลบไฟล์ใน list
  const removeFile = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setUrls(newUrls);
    setPreviews(newPreviews);
    onFilesChange(newUrls);
  };

  return (
    <div>
      <label>File Attachment:</label>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={{
          padding: 10,
          border: "2px dashed #ccc",
          borderRadius: 6,
          marginBottom: 10,
          textAlign: "center",
          color: "#666",
          cursor: "pointer",
        }}
        title="ลากไฟล์มาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์"
        onClick={() => {
          const fileInput = document.getElementById("multi-file-input");
          fileInput?.click();
        }}
      >
        {urls.length === 0 ? "ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์ (สูงสุด 5 ไฟล์)" : "เพิ่มไฟล์โดยลากหรือเลือก"}
      </div>

      <input
        id="multi-file-input"
        type="file"
        accept={acceptTypes.join(",")}
        multiple
        style={{ display: "none" }}
        onChange={onInputChange}
      />

      {urls.map((url, index) => (
        <div key={index} style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
          {previews[index] ? (
            <img src={previews[index]!} alt="Preview" width={100} style={{ marginRight: 10, objectFit: "contain" }} />
          ) : (
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ marginRight: 10 }}>
              🔗 เปิดไฟล์
            </a>
          )}

          <span style={{ flex: 1, wordBreak: "break-all" }}>{decodeURIComponent(url.split("/").pop() || "")}</span>

          <button
            type="button"
            onClick={() => removeFile(index)}
            style={{
              marginLeft: 10,
              background: "#fecfcc",
              border: "none",
              padding: "4px 8px",
              cursor: "pointer",
              color: "#dc3545",
              borderRadius: 4,
            }}
            title="ลบไฟล์"
          >
            <DeleteForeverSharpIcon />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => document.getElementById("multi-file-input")?.click()}
        disabled={maxFiles !== undefined && urls.length >= maxFiles}
        className="btn btn-info"
        style={{ marginTop: 6 }}
        title="เพิ่มไฟล์"
      >
        <FaPlus style={{ marginRight: 6 }} />
        เพิ่มไฟล์
      </button>

      {maxFiles !== undefined && (
        <div style={{ fontSize: "0.9em", marginTop: 4, color: "#666" }}>
          {urls.length} / {maxFiles} ไฟล์
        </div>
      )}
    </div>
  );
}
