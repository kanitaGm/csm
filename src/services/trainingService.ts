// srv/service/trainingService.ts
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  where,
  getDoc,
  Timestamp, 
  query, 
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  QueryDocumentSnapshot,
  Query,
  QueryConstraint,
  type DocumentData
} from 'firebase/firestore';
import { db, storage } from '../config/firebase';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

// Import existing types from your types file
import type { TrainingRecord, EmployeeProfile } from '../types'; 

// Additional interfaces for service layer
interface TrainingFilters {
  empId?: string;
  employeeName?: string;
  courseName?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface SearchResult {
  docs: QueryDocumentSnapshot<DocumentData>[];
  lastVisible: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

type TrainingCallback = (
  trainings: TrainingRecord[], 
  lastVisible: QueryDocumentSnapshot<DocumentData> | null, 
  hasMore: boolean
) => void;

/**
 * ค้นหาข้อมูล training ด้วยเงื่อนไขต่างๆ
 */
export const searchTrainingsWithFilters = (
  filters: TrainingFilters, 
  limitCount: number = 25, 
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null, 
  callback: TrainingCallback
): (() => void) => {
  try {
    const trainingsRef = collection(db, 'trainings');
    let q = query(trainingsRef);
    
    // สร้าง where clauses ตามเงื่อนไขที่มี
    const conditions: QueryConstraint[] = [];
    
    // ค้นหาจาก empId
    if (filters.empId && filters.empId.trim()) {
      conditions.push(where('empId', '>=', filters.empId.trim()));
      conditions.push(where('empId', '<=', filters.empId.trim() + '\uf8ff'));
    }
    
    // ค้นหาจาก employeeName
    if (filters.employeeName && filters.employeeName.trim()) {
      const name = filters.employeeName.trim().toLowerCase();
      conditions.push(where('employeeName', '>=', name));
      conditions.push(where('employeeName', '<=', name + '\uf8ff'));
    }
    
    // ค้นหาจาก courseName
    if (filters.courseName && filters.courseName.trim()) {
      const course = filters.courseName.trim().toLowerCase();
      conditions.push(where('courseName', '>=', course));
      conditions.push(where('courseName', '<=', course + '\uf8ff'));
    }
    
    // ค้นหาจากช่วงวันที่
    if (filters.dateFrom && filters.dateTo) {
      const fromDate = Timestamp.fromDate(new Date(filters.dateFrom));
      const toDate = Timestamp.fromDate(new Date(filters.dateTo + 'T23:59:59'));
      conditions.push(where('trainingDate', '>=', fromDate));
      conditions.push(where('trainingDate', '<=', toDate));
    } else if (filters.dateFrom) {
      const fromDate = Timestamp.fromDate(new Date(filters.dateFrom));
      conditions.push(where('trainingDate', '>=', fromDate));
    } else if (filters.dateTo) {
      const toDate = Timestamp.fromDate(new Date(filters.dateTo + 'T23:59:59'));
      conditions.push(where('trainingDate', '<=', toDate));
    }
    
    // สร้าง query ด้วยเงื่อนไขทั้งหมด
    conditions.forEach(condition => {
      q = query(q, condition);
    });
    
    // เพิ่ม orderBy และ limit
    q = query(q, orderBy('trainingDate', 'desc'));
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    q = query(q, limit(limitCount));
    
    // Listen to changes
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const trainings: TrainingRecord[] = [];
        const employeePromises: Promise<{ empId: string; employee: EmployeeProfile | null }>[] = [];
        const employeeCache = new Map<string, EmployeeProfile | null>();
        
        // เตรียมข้อมูล training และ employee promises
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          trainings.push({
            id: docSnap.id,
            empId: data.empId || '',
            status: data.status || 'active',
            createdAt: data.createdAt || Timestamp.now(),
            ...data
          } as TrainingRecord);
          
          // Cache employee data requests
          if (data.empId && !employeeCache.has(data.empId)) {
            employeeCache.set(data.empId, null);
            employeePromises.push(
              getEmployeeById(data.empId).then(emp => ({
                empId: data.empId,
                employee: emp
              }))
            );
          }
        });
        
        // โหลดข้อมูล employee แบบ parallel
        if (employeePromises.length > 0) {
          const employeeResults = await Promise.allSettled(employeePromises);
          
          employeeResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
              employeeCache.set(result.value.empId, result.value.employee);
            }
          });
        }
        
        // รวมข้อมูล training กับ employee
        const trainingsWithEmployees: TrainingRecord[] = trainings.map(training => {
          const employee = employeeCache.get(training.empId);
          const fullname = typeof employee?.fullname === 'string' ? employee.fullname : '';
          const displayName = typeof employee?.displayName === 'string' ? employee.displayName : '';
          
          return {
            ...training,
            employeeName: fullname || displayName || 'ไม่พบข้อมูล',
            employeeData: employee
          };
        });
        
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        const hasMore = snapshot.docs.length === limitCount;
        
        callback(trainingsWithEmployees, lastVisible, hasMore);
        
      } catch (error) {
        console.error('Error processing search results:', error);
        callback([], null, false);
      }
    }, (error) => {
      console.error('Search error:', error);
      callback([], null, false);
    });
    
    return unsubscribe;
    
  } catch (error) {
    console.error('Error creating search query:', error);
    callback([], null, false);
    return () => {}; // Return empty unsubscribe function
  }
};

/**
 * ฟังก์ชันช่วยในการค้นหาแบบ compound queries สำหรับ Firestore
 */
export const searchTrainingsAdvanced = async (
  filters: TrainingFilters, 
  limitCount: number = 25, 
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<SearchResult> => {
  try {
    const trainingsRef = collection(db, 'trainings');
    const baseQuery = query(trainingsRef, orderBy('trainingDate', 'desc'));
    
    // สำหรับการค้นหาที่ซับซ้อน อาจต้องใช้ multiple queries แล้วรวมผลลัพธ์
    const queries: Query<DocumentData>[] = [];
    
    // Query 1: ค้นหาจาก empId
    if (filters.empId && filters.empId.trim()) {
      const empIdQuery = query(
        trainingsRef,
        where('empId', '>=', filters.empId.trim()),
        where('empId', '<=', filters.empId.trim() + '\uf8ff'),
        orderBy('empId'),
        orderBy('trainingDate', 'desc'),
        limit(limitCount)
      );
      queries.push(empIdQuery);
    }
    
    // Query 2: ค้นหาจากวันที่
    if (filters.dateFrom || filters.dateTo) {
      let dateQuery = query(trainingsRef);
      
      if (filters.dateFrom && filters.dateTo) {
        const fromDate = Timestamp.fromDate(new Date(filters.dateFrom));
        const toDate = Timestamp.fromDate(new Date(filters.dateTo + 'T23:59:59'));
        dateQuery = query(
          dateQuery,
          where('trainingDate', '>=', fromDate),
          where('trainingDate', '<=', toDate),
          orderBy('trainingDate', 'desc'),
          limit(limitCount)
        );
      } else if (filters.dateFrom) {
        const fromDate = Timestamp.fromDate(new Date(filters.dateFrom));
        dateQuery = query(
          dateQuery,
          where('trainingDate', '>=', fromDate),
          orderBy('trainingDate', 'desc'),
          limit(limitCount)
        );
      } else if (filters.dateTo) {
        const toDate = Timestamp.fromDate(new Date(filters.dateTo + 'T23:59:59'));
        dateQuery = query(
          dateQuery,
          where('trainingDate', '<=', toDate),
          orderBy('trainingDate', 'desc'),
          limit(limitCount)
        );
      }
      
      queries.push(dateQuery);
    }
    
    // ถ้าไม่มี query เฉพาะ ให้ใช้ default query
    if (queries.length === 0) {
      queries.push(baseQuery);
    }
    
    // Execute queries และรวมผลลัพธ์
    const results = await Promise.allSettled(
      queries.map(q => getDocs(q))
    );
    
    const allDocs = new Map<string, QueryDocumentSnapshot<DocumentData>>(); // ใช้ Map เพื่อป้องกันข้อมูลซ้ำ
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        result.value.docs.forEach(doc => {
          if (!allDocs.has(doc.id)) {
            allDocs.set(doc.id, doc as QueryDocumentSnapshot<DocumentData>);
          }
        });
      }
    });
    
    // แปลงกลับเป็น array และ sort ตามวันที่
    const sortedDocs = Array.from(allDocs.values()).sort((a, b) => {
      const dateA = a.data().trainingDate?.toDate() || new Date(0);
      const dateB = b.data().trainingDate?.toDate() || new Date(0);
      return dateB.getTime() - dateA.getTime(); // เรียงจากใหม่ไปเก่า
    });
    
    // Filter client-side สำหรับเงื่อนไขที่ไม่สามารถทำใน Firestore ได้
    let filteredDocs = sortedDocs;
    
    if (filters.employeeName && filters.employeeName.trim()) {
      const nameFilter = filters.employeeName.trim().toLowerCase();
      filteredDocs = filteredDocs.filter(doc => {
        const employeeName = doc.data().employeeName?.toLowerCase() || '';
        return employeeName.includes(nameFilter);
      });
    }
    
    if (filters.courseName && filters.courseName.trim()) {
      const courseFilter = filters.courseName.trim().toLowerCase();
      filteredDocs = filteredDocs.filter(doc => {
        const courseName = doc.data().courseName?.toLowerCase() || '';
        return courseName.includes(courseFilter);
      });
    }
    
    // Apply pagination
    const startIndex = lastDoc ? filteredDocs.findIndex(doc => doc.id === lastDoc.id) + 1 : 0;
    const paginatedDocs = filteredDocs.slice(startIndex, startIndex + limitCount);
    
    return {
      docs: paginatedDocs,
      lastVisible: paginatedDocs[paginatedDocs.length - 1] || null,
      hasMore: startIndex + limitCount < filteredDocs.length
    };
    
  } catch (error) {
    console.error('Advanced search error:', error);
    return { docs: [], lastVisible: null, hasMore: false };
  }
};

export const listenTrainingsWithEmployeeNames = (
  pageSize: number = 25,
  lastDocSnapshot: QueryDocumentSnapshot<DocumentData> | null = null,
  onData: (data: TrainingRecord[], lastVisible: QueryDocumentSnapshot<DocumentData> | null) => void // callback(data, lastVisibleDoc)
): (() => void) => {
  const q = query(
    collection(db, 'trainings'),
    orderBy('trainingDate', 'desc'),
    ...(lastDocSnapshot ? [startAfter(lastDocSnapshot)] : []),
    limit(pageSize)    
  );

  const unsubscribe = onSnapshot(q, async (snapshot) => {
    const newDocs = snapshot.docs;
    const lastVisible = newDocs.length > 0 ? newDocs[newDocs.length - 1] : null;

    const results = await Promise.all(newDocs.map(async (docSnap) => {
      const data = docSnap.data();
      let employeeName = 'Unknown';

      if (data.empId) {
        const empDoc = await getDoc(doc(db, 'employees', data.empId));
        if (empDoc.exists()) {
          const emp = empDoc.data() as EmployeeProfile;
          const fullname = typeof emp.fullname === 'string' ? emp.fullname : '';
          const firstname = typeof emp.firstname === 'string' ? emp.firstname : '';
          const lastname = typeof emp.lastname === 'string' ? emp.lastname : '';
          
          employeeName = fullname || `${firstname} ${lastname}`.trim() || 'ไม่พบข้อมูล';
        }
      }

      return {
        id: docSnap.id,
        empId: data.empId || '',
        status: data.status || 'active', 
        createdAt: data.createdAt || Timestamp.now(),
        employeeName,
        ...data
      } as TrainingRecord;
    }));

    onData(results, lastVisible);
  });

  return unsubscribe;
};

export const addTraining = async (data: Partial<TrainingRecord>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'trainings'), {
    ...data,
    updatedAt: Timestamp.now()
  });
  return docRef.id;
};

export const updateTraining = async (id: string, data: Partial<TrainingRecord>): Promise<void> => {
  await updateDoc(doc(db, 'trainings', id), {
    ...data,
    updatedAt: Timestamp.now()
  });
};

export const deleteTraining = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'trainings', id));
};

export const updateTrainingCertificate = async (id: string, file: File | null, empId: string): Promise<void> => {
  if (!file) {
    // ถ้าไม่มีไฟล์ ให้ลบ certificateURL ใน Firestore
    await updateDoc(doc(db, 'trainings', id), {
      certificateURL: null
    });
    return;
  }

  const storageRef = ref(storage, `employees/${empId}/files/${id}_${file.name}`);
  const uploadTask = await uploadBytesResumable(storageRef, file);
  const downloadURL = await getDownloadURL(uploadTask.ref);

  await updateDoc(doc(db, 'trainings', id), {
    certificateURL: downloadURL
  });
};

/**
 * ดึงข้อมูล employee จาก Firestore ตาม empId
 */
export const getEmployeeById = async (empId: string): Promise<EmployeeProfile | null> => {
  if (!empId) return null;
  try {
    const employeesRef = collection(db, 'employees');
    const q = query(employeesRef, where('empId', '==', empId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      // สมมติว่า empId เป็น unique
      const docData = querySnapshot.docs[0].data();
      return { 
        id: querySnapshot.docs[0].id,
        empId: docData.empId || '',
        status: docData.status || 'active',
        createdAt: docData.createdAt || Timestamp.now(),
        ...docData 
      } as EmployeeProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching employee by id:', error);
    return null;
  }
};