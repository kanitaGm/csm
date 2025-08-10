// =================================================================
// src/config/firestoreService.ts 
// Firestore Service สำหรับจัดการข้อมูลผู้ใช้และสิทธิ์
// ========================================================================
import { collection, query, where, getDocs} from 'firebase/firestore';
import { db } from './firebase';
import type { UserPermissions, EmployeeProfile } from '../types';

export class FirestoreService {
    /**
     * ดึงข้อมูลสิทธิ์และสถานะผู้ใช้จาก Collection 'users' โดยใช้อีเมล
     * @param email - อีเมลของผู้ใช้
     * @returns {Promise<UserPermissions | null>} ข้อมูลสิทธิ์ หรือ null ถ้าไม่พบ
     */
    static async getUserPermissionsByEmail(email: string): Promise<UserPermissions | null> {
        //console.log(`[Firestore] Checking 'users' for email: ${email}`);
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email.toLowerCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            //console.log(`[Firestore] No user found with email: ${email}`);
            return null;
        }

        const userDoc = querySnapshot.docs[0];
        //console.log(`[Firestore] User found:`, userDoc.data());
        return userDoc.data() as UserPermissions;
    }

    /**
     * ดึงข้อมูลโปรไฟล์พนักงานจาก Collection 'employees' โดยใช้ empId
     * @param empId - รหัสพนักงาน
     * @returns {Promise<EmployeeProfile | null>} ข้อมูลโปรไฟล์ หรือ null ถ้าไม่พบ
     */
    static async getEmployeeProfile(empId: string): Promise<EmployeeProfile | null> {
        if (!empId) return null;
        
        //console.log(`[Firestore] Getting 'employees' profile for empId: ${empId}`);
        const employeesRef = collection(db, "employees");
        
        // ลองค้นหาด้วย field 'empId' โดยตรง
        const q = query(employeesRef, where("empId", "==", empId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            //console.log(`[Firestore] No employee profile found for empId: ${empId}`);
            return null;
        }
        
        const profileDoc = querySnapshot.docs[0];
        //console.log(`[Firestore] Employee profile found:`, profileDoc.data());
        return profileDoc.data() as EmployeeProfile;
    }
}