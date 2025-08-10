// src/services/employeeService.ts
import { db } from '../config/firebase'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'

export async function getAllEmployees() {
  const q = query(collection(db, 'employees'))
  const snap = await getDocs(q)
  return snap.docs.map(doc => ({ ...doc.data(), docId: doc.id }))
}

export async function getEmployeeByEmpId(empId: string) {
  const q = query(collection(db, 'employees'), where('empId', '==', empId))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { ...snap.docs[0].data(), docId: snap.docs[0].id }
}

export async function addEmployee(data: unknown) {
  const col = collection(db, 'employees')
  return await addDoc(col, data)
}

export async function updateEmployee(empId: string, data: unknown) {
  const emp = await getEmployeeByEmpId(empId)
  if (!emp) throw new Error('ไม่พบข้อมูลพนักงาน')
  await updateDoc(doc(db, 'employees', emp.docId), data || '')
}

export async function deleteEmployee(empId: string) {
  const emp = await getEmployeeByEmpId(empId)
  if (!emp) throw new Error('ไม่พบข้อมูลพนักงาน')
  await deleteDoc(doc(db, 'employees', emp.docId))
}
