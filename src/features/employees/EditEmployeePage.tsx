// pages/employees/EditEmployeePage.tsx
// src/components/employees/EditEmployeeForm.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { FaSave,  FaSpinner } from 'react-icons/fa';
import type { EmployeeFormState } from '../../types';
import { normalizeEmployeePayload,  createSearchKeywords } from '../../utils/employeeUtils';

/*
interface FormErrors {
  [key: string]: string;
}
  */

export default function EditEmployeeForm() {
  // ✅ 1. ดึง ID ของพนักงานจาก URL (เช่น /employees/EMP001/edit)
  const { empId } = useParams<{ empId: string }>(); 
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<EmployeeFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  //const [errors, setErrors] = useState<FormErrors>({});

  // ✅ 2. Fetch ข้อมูลพนักงานเมื่อคอมโพเนนต์โหลด
  useEffect(() => {
    const fetchEmployee = async () => {
      if (!empId) {
        navigate('/employees'); // ถ้าไม่มี ID ให้กลับไปหน้าหลัก
        return;
      }
      
      // Firestore ไม่อนุญาตให้ query ด้วย ID ของ document โดยตรง เราต้องใช้ getDoc
      const docRef = doc(db, "employees", empId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setFormData(docSnap.data() as EmployeeFormState);
      } else {
        console.log("No such document!");
        alert("Employee not found.");
        navigate('/employees');
      }
      setLoading(false);
    };

    fetchEmployee();
  }, [empId, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (formData) {
        setFormData(prev => ({ ...prev!, [name]: value }));
    }
  };

  // ✅ 3. ฟังก์ชัน handleSubmit สำหรับการ "อัปเดต"
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // (Optional) คุณอาจต้องปรับ validateForm เล็กน้อยเพื่อให้ไม่เช็ค empId ซ้ำกับของตัวเอง
      // แต่เพื่อความง่าย เราจะข้ามส่วน validation ไปก่อน

      // 3.1. เตรียมข้อมูลที่จะอัปเดต
      const normalizedData = normalizeEmployeePayload(formData);
      // eslint-disable-next-line 
      const updatedData: any = {
          ...normalizedData,
          lastUpdateBy: user?.email || 'System',
          lastUpdateAt: serverTimestamp(),
      };

      // ✅ 3.2. สร้าง searchKeywords ชุดใหม่จากข้อมูลที่อัปเดตแล้ว
      updatedData.searchKeywords = createSearchKeywords(updatedData);

      // ✅ 3.3. ใช้ updateDoc เพื่อบันทึกข้อมูล
      const docRef = doc(db, 'employees', empId!);
      await updateDoc(docRef, updatedData);

      alert('Employee updated successfully!');
      navigate('/employees');

    } catch (error) {
      console.error("Error updating employee: ", error);
      alert("Failed to update employee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <FaSpinner className="text-3xl text-blue-500 animate-spin" />
        <span className="ml-4 text-gray-700">Loading Employee Data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* วาง JSX ของฟอร์มทั้งหมดที่นี่ 
          ซึ่งจะเหมือนกับใน SingleEmployeeForm.tsx 
          โดยใช้ value={formData.empId || ''} และ onChange={handleInputChange}
        */}
        <div className="p-6">
            <h2 className="text-2xl font-bold">Editing Employee: {formData?.empId}</h2>
            {/* ... ตัวอย่างฟิลด์ ... */}
             <div>
              <label htmlFor="firstName">First Name *</label>
              <input 
                type="text" 
                name="firstName" 
                value={formData?.firstName || ''} 
                onChange={handleInputChange} 
                className="w-full p-2 border rounded"
                required
              />
            </div>
             <div>
              <label htmlFor="lastName">Last Name *</label>
              <input 
                type="text" 
                name="lastName" 
                value={formData?.lastName || ''} 
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            {/* ... ใส่ฟิลด์อื่นๆ ให้ครบ ... */}
        </div>

        <div className="flex justify-end p-6 space-x-4">
          <button 
            type="button" 
            onClick={() => navigate('/employees')} 
            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <div className="flex items-center space-x-2">
                <FaSave />
                <span>{isSubmitting ? 'Updating...' : 'Update Employee'}</span>
            </div>
          </button>
        </div>
      </form>
    </div>
  );
}