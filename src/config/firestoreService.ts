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

    static async getInternalUserByEmpId(empId: string): Promise<any | null> {
        try {
            console.log(`[FirestoreService] Looking up internal user: ${empId}`);

            // ลองหาใน users collection ก่อน
            const usersRef = collection(db, 'users');
            const userQuery = query(usersRef, where('empId', '==', empId));
            const userSnapshot = await getDocs(userQuery);
            
            if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0];
                const userData = userDoc.data();
                console.log(`[FirestoreService] Found user in 'users' collection:`, userData);
                return { id: userDoc.id, ...userData };
            }

            // หาใน internalUsers collection
            const internalUsersRef = collection(db, 'internalUsers');
            const internalQuery = query(internalUsersRef, where('empId', '==', empId));
            const internalSnapshot = await getDocs(internalQuery);
            
            if (!internalSnapshot.empty) {
                const internalDoc = internalSnapshot.docs[0];
                const internalData = internalDoc.data();
                console.log(`[FirestoreService] Found user in 'internalUsers' collection:`, internalData);
                return { id: internalDoc.id, ...internalData };
            }

            // หาใน employees collection (สำหรับกรณีที่เก็บ auth info ใน employees)
            const employeesRef = collection(db, 'employees');
            const empQuery = query(employeesRef, where('empId', '==', empId));
            const empSnapshot = await getDocs(empQuery);
            
            if (!empSnapshot.empty) {
                const empDoc = empSnapshot.docs[0];
                const empData = empDoc.data();
                
                // ตรวจสอบว่ามี passcode หรือไม่
                if (empData.passcode) {
                    console.log(`[FirestoreService] Found user in 'employees' collection with passcode:`, empData);
                    return { id: empDoc.id, ...empData };
                }
            }

            console.log(`[FirestoreService] User not found: ${empId}`);
            return null;

        } catch (error) {
            console.error(`[FirestoreService] Failed to get internal user ${empId}:`, error);
            throw error;
        }
    }    

    /**
     * ดึงข้อมูลผู้ใช้ภายใน (internal user) โดย empId และ passcode
     * @param empId - รหัสพนักงาน
     * @param passcode - รหัสผ่านสำหรับยืนยันตัวตน
     * @returns {Promise<any | null>} ข้อมูลผู้ใช้ หรือ null ถ้าไม่พบ
     * @throws {Error} ถ้ารหัสผ่านไม่ถูกต้อง
     */   
 /**
     * ค้นหา Internal User โดย empId และ passcode (เพิ่มความปลอดภัย)
     */
    static async validateInternalUser(empId: string, passcode: string): Promise<any | null> {
        try {
            const user = await this.getInternalUserByEmpId(empId);
            
            if (!user) {
                return null;
            }

            // ตรวจสอบ passcode
            if (user.passcode !== passcode) {
                throw new Error('Invalid passcode');
            }

            return user;

        } catch (error) {
            console.error(`[FirestoreService] Failed to validate internal user ${empId}:`, error);
            throw error;
        }
    }

  





}