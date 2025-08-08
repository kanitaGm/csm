// src/features/admin/forms/CreateFormPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from '../../../services/firebase';
import { collection, addDoc, Timestamp } from "firebase/firestore";
import type { StdFormField, StdFormDoc } from '../../../types/types';


const defaultField: StdFormField = {
  ckItem: "1",
  ckType: "M",
  ckQuestion: "",
  ckRequirement: "",
  ckChoice: "Pass",
  fScore: "",
  required: true,
  allowAttach: false,
  updated: "",

};

export default function CreateFormPage() {
  const navigate = useNavigate();
  const [formTitle, setFormTitle] = useState("");
  const [formCode, setFormCode] = useState("");
  const [applicableTo, setApplicableTo] = useState<string[]>(["csm"]);
  const [fields, setFields] = useState<StdFormField[]>([defaultField]);

  const handleAddField = () => {
    setFields(prev => [...prev, { ...defaultField, ckItem: String(prev.length + 1) }]);
  };

  const handleFieldChange = (index: number, key: keyof StdFormField, value: any) => {
    const updated = [...fields];
    updated[index][key] = value;
    setFields(updated);
  };

  const handleSubmit = async () => {
    const newForm: Omit<StdFormDoc, "id"> = {
      formCode,
      formTitle,
      isActive: true,
      applicableTo,
      createdBy: "admin@test.com", // TODO: ดึงจาก user จริง
      updatedAt: Timestamp.now(),
      fields,
    };
    const docRef = await addDoc(collection(db, "forms"), newForm);
    navigate(`/admin/forms/e/${docRef.id}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">สร้างแบบฟอร์มใหม่</h1>

      <div className="mb-4">
        <label className="block font-semibold mb-1">ชื่อฟอร์ม</label>
        <input
          className="w-full border p-2 rounded"
          value={formTitle}
          onChange={e => setFormTitle(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="block font-semibold mb-1">รหัสฟอร์ม</label>
        <input
          className="w-full border p-2 rounded"
          value={formCode}
          onChange={e => setFormCode(e.target.value)}
        />
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">รายการคำถาม</h2>
      {fields.map((field, index) => (
        <div key={index} className="border rounded p-4 mb-4">
          <div className="mb-2">
            <label className="block font-medium">รหัสข้อคำถาม</label>
            <input
              className="w-full border p-2 rounded"
              value={field.ckItem}
              onChange={e => handleFieldChange(index, "ckItem", e.target.value)}
            /> 
            </div>           
          <div className="mb-2">
            <label className="block font-medium">คำถาม</label>
            <input
              className="w-full border p-2 rounded"
              value={field.ckQuestion}
              onChange={e => handleFieldChange(index, "ckQuestion", e.target.value)}
            />
          </div>
          <div className="mb-2">
            <label className="block font-medium">คำอธิบาย/ข้อกำหนด</label>
            <textarea
              className="w-full border p-2 rounded"
              value={field.ckRequirement}
              onChange={e => handleFieldChange(index, "ckRequirement", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block font-medium">ประเภท</label>
              <select
                className="w-full border p-2 rounded"
                value={field.ckType}
                onChange={e => handleFieldChange(index, "ckType", e.target.value)}
              >
                <option value="M">M:Mandatory</option>
                <option value="P">P:Preferable</option>
              </select>
            </div>
            <div>
              <label className="block font-medium">คะแนน</label>
              <input
                type="number"
                className="w-full border p-2 rounded"
                value={field.fScore}
                onChange={e => handleFieldChange(index, "fScore", e.target.value)}
              />
            </div>
            <div className="flex items-center mt-6">
              <input
                type="checkbox"
                checked={field.required}
                onChange={e => handleFieldChange(index, "required", e.target.checked)}
              />
              <span className="ml-2">จำเป็นต้องตอบ</span>
            </div>
            <div className="flex items-center mt-6">
              <input
                type="checkbox"
                checked={field.allowAttach}
                onChange={e => handleFieldChange(index, "allowAttach", e.target.checked)}
              />
              <span className="ml-2">แนบไฟล์ได้</span>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={handleAddField}
        className="mb-6 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
      >+ เพิ่มคำถาม</button>

      <div>
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >บันทึก</button>
      </div>
    </div>
  );
}
