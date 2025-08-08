// src/features/admin/forms/formsListPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from "react-router-dom";
import { db } from '../../../services/firebase';
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { StdFormDoc } from '../../../types/types';
//import type { formatDate } from '../../../components/utils/dateUtils';



export default function FormListPage() {
  const [forms, setForms] = useState<StdFormDoc[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchForms = async () => {
      const q = query(collection(db, "forms"));
      //const q = query(collection(db, "forms")); // เอา orderBy ออกเพื่อทดสอบก่อน

      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as StdFormDoc))
        .filter(doc => !!doc.formCode && doc.formCode !== ""); // ✅ กรองหลังโหลด

      
      setForms(data);
    };
    fetchForms();
  }, []);


    const filtered = forms.filter(form =>
    (form.formTitle ?? "").includes(search.toLowerCase()) ||
    (form.formCode?.toLowerCase() ?? "").includes(search.toLowerCase())
    );



  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">รายการแบบฟอร์ม</h1>
        <Link to="/admin/forms/c" className="bg-blue-600 text-white px-4 py-2 rounded">+ สร้างแบบฟอร์ม</Link>
      </div>

      <input
        type="text"
        placeholder="ค้นหา..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-4 p-2 border rounded w-full"
      />

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="table-auto w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">รหัส</th>
              <th className="px-4 py-2 text-left">ชื่อฟอร์ม</th>
              <th className="px-4 py-2 text-left">ประเภท</th>
              <th className="px-4 py-2">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(form => (
              <tr key={form.id} className="border-t">
                <td className="px-4 py-2">{form.formCode}</td>
                <td className="px-4 py-2">{form.formTitle}</td>
                <td className="px-4 py-2 text-center">
                  <Link
                    to={`/admin/forms/e/${form.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    แก้ไข
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-4">ไม่พบแบบฟอร์ม</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
