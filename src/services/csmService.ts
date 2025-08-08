// 📁 src/services/csmService.ts 
import { collection, doc, getDocs, getDoc,  updateDoc, deleteDoc, 
  query, where, orderBy, limit,Timestamp,writeBatch, startAfter} from 'firebase/firestore';
import { db } from './firebase';
import { parseDate } from '../components/utils/dateUtils'; 
import type { FormDoc, CsmAssessment, AssessmentDoc, CsmAssessmentSummary,Company,AssessmentAnswer, FormField
} from '../types/types';
import { cacheService } from './cacheService';
import { withRetry } from '../components/utils/retryUtils';
import { CircuitBreaker } from '../components/utils/circuitBreaker';
import { CSMError, CSMErrorCodes } from '../features/errors/CSMError';
import { errorReporter } from './errorReporting';


// สร้าง circuit breaker instance
const firestoreCircuitBreaker = new CircuitBreaker(5, 60000);


// =================== UTILITY FUNCTIONS ===================
/**
 * ลบค่า undefined ออกจาก object ก่อนส่งไปยัง Firestore
 * @param obj - object ที่ต้องการทำความสะอาด
 * @returns object ที่ไม่มี undefined values
 */
const cleanUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedValues(item));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value);
      }
    });
    return cleaned;
  }
  
  return obj;
};

/**
 * เตรียมข้อมูลสำหรับ Firestore โดยแปลง undefined เป็น null หรือลบออก
 * @param data - ข้อมูลที่ต้องการเตรียม
 * @returns ข้อมูลที่พร้อมส่งไปยัง Firestore
 */
const prepareFirestoreData = (data: any): any => {
  const cleaned = cleanUndefinedValues(data);
  
  // ตรวจสอบและแปลงค่าพิเศษ
  if (cleaned && typeof cleaned === 'object') {
    // แปลง Date objects เป็น Timestamp
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] instanceof Date) {
        cleaned[key] = Timestamp.fromDate(cleaned[key]);
      }
    });
  }
  
  return cleaned;
};

/**
 * แปลง DateInput เป็น Date object ใช้ parseDate จาก dateUtils
 * @param dateValue - ค่า date ในรูปแบบต่างๆ
 * @returns Date object หรือ Date ปัจจุบันถ้าแปลงไม่ได้
 */
const safeParseDate = (dateValue: any): Date => {
  const parsed = parseDate(dateValue);
  return parsed || new Date();
};



// =================== COMPANIES SERVICES ===================
export const companiesService = {
  // ... (เก็บ methods เดิมไว้)
  async getAll(): Promise<Company[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, 'companies'),
          where('type', '==', 'csm'),
          orderBy('name', 'asc')
        )        
      );
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        companyId: doc.id
      } as Company));
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  },

  async search(searchTerm: string): Promise<Company[]> {
    try {
      const companies = await this.getAll();
      const term = searchTerm.toLowerCase();
      return companies.filter(company => 
        company.name.toLowerCase().includes(term) ||
        company.vdCode.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching companies:', error);
      throw error;
    }
  },

  async getById(companyId: string): Promise<Company | null> {
    try {
      const docSnap = await getDoc(doc(db, 'companies', companyId));
      if (docSnap.exists()) {
        return { ...docSnap.data(), companyId: docSnap.id } as Company;
      }
      return null;
    } catch (error) {
      console.error('Error fetching company:', error);
      throw error;
    }
  },

  async getByVdCode(vdCode: string): Promise<Company | null> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'companies'), where('vdCode', '==', vdCode), limit(1))
      );
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { ...doc.data(), companyId: doc.id } as Company;
      }
      return null;
    } catch (error) {
      console.error('Error fetching company by vdCode:', error);
      throw error;
    }
  }
};

// =================== FORMS SERVICES ===================
export const formsService = {
  // ... (เก็บ methods เดิมไว้พร้อมใช้ prepareFirestoreData)
  async getAll(): Promise<FormDoc[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'forms'), orderBy('updatedAt', 'desc'))
      );
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as FormDoc));
    } catch (error) {
      console.error('Error fetching forms:', error);
      throw error;
    }
  },

  async getByFormCode(formCode: string): Promise<FormDoc | null> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'forms'), where('formCode', '==', formCode), limit(1))
      );
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { ...doc.data(), id: doc.id } as FormDoc;
      }
      return null;
    } catch (error) {
      console.error('Error fetching form by code:', error);
      throw error;
    }
  },

  // แก้ไข getCSMChecklist ให้ใช้ cache
  async getCSMChecklist(): Promise<FormDoc | null> {
    const cacheKey = 'csm-checklist-form';
    const cached = cacheService.get<FormDoc>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const form = await this.getByFormCode('CSMChecklist');
    if (form) {
      cacheService.set(cacheKey, form, 30); // Cache for 30 minutes
    }
    
    return form;
  },

  async update(formId: string, formData: Partial<FormDoc>): Promise<void> {
    try {
      const cleanedData = prepareFirestoreData({
        ...formData,
        updatedAt: Timestamp.now()
      });
      
      await updateDoc(doc(db, 'forms', formId), cleanedData);
    } catch (error) {
      console.error('Error updating form:', error);
      throw error;
    }
  },

  async delete(formId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'forms', formId));
    } catch (error) {
      console.error('Error deleting form:', error);
      throw error;
    }
  },
      clearFormCache(): void {
    cacheService.clear();
  },  
};

// =================== CSM ASSESSMENTS SERVICES ===================
export const csmAssessmentsService = {
  async getAll(): Promise<AssessmentDoc[]> {
    try {
      return await firestoreCircuitBreaker.execute(async () => {
        return await withRetry(async () => {
          const querySnapshot = await getDocs(
            query(collection(db, 'csmAssessments'), orderBy('createdAt', 'desc'))
          );
          return querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          } as AssessmentDoc));
        });
      });
    } catch (error) {
      const csmError = new CSMError(
        'Failed to fetch assessments',
        CSMErrorCodes.FIRESTORE_ERROR,
        'medium',
        true,
        error as Error
      );
      errorReporter.reportError(csmError);
      throw csmError;
    }
  },

  async getByVdCode(vdCode: string): Promise<AssessmentDoc[]> {
    try {
      return await firestoreCircuitBreaker.execute(async () => {
        return await withRetry(async () => {
          const querySnapshot = await getDocs(
                  query(
                    collection(db, 'csmAssessments'), 
                    where('vdCode', '==', vdCode),
                    orderBy('createdAt', 'desc')
                  )
                );
                return querySnapshot.docs.map(doc => ({
                  ...doc.data(),
                  id: doc.id
                } as AssessmentDoc));
        });
      });
    } catch (error) {
          const csmError = new CSMError(
            'Failed to fetch assessments',
            CSMErrorCodes.FIRESTORE_ERROR, 
            'medium',
            true,
            error as Error
          );
          errorReporter.reportError(csmError);
          throw csmError;
        }
      },

  async getById(assessmentId: string): Promise<AssessmentDoc | null> {
    try {
      return await firestoreCircuitBreaker.execute(async () => {
        return await withRetry(async () => {
          const docSnap = await getDoc(doc(db, 'csmAssessments', assessmentId));
          if (docSnap.exists()) {
            return { ...docSnap.data(), id: docSnap.id } as AssessmentDoc;
          }
          return null;
        });
      });
   } catch (error) {
      const csmError = new CSMError(
        'Failed to fetch assessments',
        CSMErrorCodes.FIRESTORE_ERROR,
        'medium',
        true,
        error as Error
      );
      errorReporter.reportError(csmError);
      throw csmError;
    }
  },

  // =================== SCORE CALCULATION FUNCTIONS ===================
  calculateTotalScore(answers: AssessmentAnswer[], formFields: FormField[]): number {
    return answers.reduce((total, answer) => {
      if (!answer.score || answer.score === 'n/a') {
        return total;
      }

      const score = parseFloat(answer.score) || 0;
      const field = formFields.find(f => f.ckItem === answer.ckItem);
      const fScore = parseFloat(field?.fScore || '1');
      
      const tScore = score * fScore;
      return total + tScore;
    }, 0);
  },

  calculateMaxScore(answers: AssessmentAnswer[], formFields: FormField[], maxScorePerQuestion: number = 2): number {
    return answers.reduce((total, answer) => {
      if (!answer.score || answer.score === 'n/a') {
        return total;
      }

      const field = formFields.find(f => f.ckItem === answer.ckItem);
      const fScore = parseFloat(field?.fScore || '1');
      const maxScore = maxScorePerQuestion * fScore;
      
      return total + maxScore;
    }, 0);
  },

  calculateAverageScore(answers: AssessmentAnswer[], formFields: FormField[], maxScorePerQuestion: number = 2): number {
    const totalScore = this.calculateTotalScore(answers, formFields);
    const maxScore = this.calculateMaxScore(answers, formFields, maxScorePerQuestion);
    
    if (maxScore === 0) return 0;
    return (totalScore / maxScore) * 100;
  },

  updateAnswerScores(answers: AssessmentAnswer[], formFields: FormField[]): AssessmentAnswer[] {
    return answers.map(answer => {
      if (!answer.score || answer.score === 'n/a') {
        return {
          ...answer,
          tScore: undefined
        };
      }

      const score = parseFloat(answer.score) || 0;
      const field = formFields.find(f => f.ckItem === answer.ckItem);
      const fScore = parseFloat(field?.fScore || '1');
      const tScore = score * fScore;

      return {
        ...answer,
        tScore: tScore.toString()
      };
    });
  },

  calculateAssessmentStats(answers: AssessmentAnswer[], formFields: FormField[]) {
    const totalQuestions = formFields.length;
    const answeredQuestions = answers.filter(a => a.score && a.score !== '').length;
    const naQuestions = answers.filter(a => a.score === 'n/a').length;
    const scoredQuestions = answers.filter(a => a.score && a.score !== 'n/a' && a.score !== '').length;
    
    const totalScore = this.calculateTotalScore(answers, formFields);
    const maxScore = this.calculateMaxScore(answers, formFields);
    const avgScore = this.calculateAverageScore(answers, formFields);

    return {
      totalQuestions,
      answeredQuestions,
      naQuestions,
      scoredQuestions,
      totalScore,
      maxScore,
      avgScore: Math.round(avgScore * 100) / 100
    };
  },

  //  ใช้ safeParseDate แทน convertToDate
   async getLatestByCompany(cLimit: number = 20,lastDoc?: unknown ): Promise<{ summaries: CsmAssessmentSummary[]; hasMore: boolean; lastVisible: unknown }> {
    try {
      let q = query(
        collection(db, 'csmAssessments'), 
        where('isActive', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(cLimit)
      );
      
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
      
      const querySnapshot = await getDocs(q);
      const summaries: CsmAssessmentSummary[] = [];
      
      // ใช้ cached form
      const formData = await formsService.getCSMChecklist();
      const formFields = formData?.fields || [];

      querySnapshot.docs.forEach(doc => {
        const data = doc.data() as AssessmentDoc;
        
        const totalScore = this.calculateTotalScore(data.answers, formFields);
        const avgScore = this.calculateAverageScore(data.answers, formFields);
        
        const createdAtDate = safeParseDate(data.createdAt);
        const updatedAtDate = safeParseDate(data.updatedAt || data.createdAt);
        
        summaries.push({
          vdCode: data.vdCode,
          vdName: data.vdName,
          lastAssessmentId: doc.id,
          lastAssessmentDate: createdAtDate,
          totalScore,
          avgScore,
          riskLevel: (data.riskLevel as 'Low' | 'Moderate' | 'High' | '') || '',
          updatedAt: updatedAtDate
        });
      });

      return {
        summaries: summaries.sort((a, b) => b.lastAssessmentDate.getTime() - a.lastAssessmentDate.getTime()),
        hasMore: querySnapshot.docs.length === cLimit,
        lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1]
      };
      
    } catch (error) {
      console.error('Error fetching latest assessments:', error);
      return { summaries: [], hasMore: false, lastVisible: null };
    }
  },

  async create(assessmentData: Omit<CsmAssessment, 'id'>): Promise<string> {
    try {
      const batch = writeBatch(db);
      
      const existingAssessments = await this.getByVdCode(assessmentData.vdCode);
      existingAssessments.forEach(assessment => {
        if (assessment.isActive) {
          const assessmentRef = doc(db, 'csmAssessments', assessment.id);
          batch.update(assessmentRef, { isActive: false });
        }
      });

      const newAssessmentRef = doc(collection(db, 'csmAssessments'));
      
      const formData = await formsService.getCSMChecklist();
      const formFields = formData?.fields || [];
      
      const updatedAnswers = this.updateAnswerScores(assessmentData.answers, formFields);
      const totalScore = this.calculateTotalScore(updatedAnswers, formFields);
      const avgScore = this.calculateAverageScore(updatedAnswers, formFields);

      const cleanedData = prepareFirestoreData({
        ...assessmentData,
        answers: updatedAnswers,
        finalScore: totalScore.toString(),
        avgScore: avgScore.toString(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      batch.set(newAssessmentRef, cleanedData);
      await batch.commit();
      return newAssessmentRef.id;
    } catch (error) {
      console.error('Error creating assessment:', error);
      throw error;
    }
  },

  async update(assessmentId: string, assessmentData: Partial<CsmAssessment>): Promise<void> {
    try {
      const updateData: any = {
        ...assessmentData,
        updatedAt: Timestamp.now()
      };

      if (assessmentData.answers) {
        const formData = await formsService.getCSMChecklist();
        const formFields = formData?.fields || [];
        
        const updatedAnswers = this.updateAnswerScores(assessmentData.answers, formFields);
        const totalScore = this.calculateTotalScore(updatedAnswers, formFields);
        const avgScore = this.calculateAverageScore(updatedAnswers, formFields);

        updateData.answers = updatedAnswers;
        updateData.finalScore = totalScore.toString();
        updateData.avgScore = avgScore.toString();
      }

      const cleanedData = prepareFirestoreData(updateData);
      await updateDoc(doc(db, 'csmAssessments', assessmentId), cleanedData);
    } catch (error) {
      console.error('Error updating assessment:', error);
      throw error;
    }
  },

  async delete(assessmentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'csmAssessments', assessmentId));
    } catch (error) {
      console.error('Error deleting assessment:', error);
      throw error;
    }
  },

  isAssessmentComplete(answers: AssessmentAnswer[]): boolean {
    return answers.every(answer => 
      answer.comment.trim() !== '' && 
      answer.score && 
      answer.score !== '' &&
      answer.isFinish === true
    );
  },

  async getStatistics(): Promise<{
    totalAssessments: number;
    activeAssessments: number;
    companiesAssessed: number;
    averageScore: number;
  }> {
    try {
      const assessments = await this.getAll();
      const activeAssessments = assessments.filter(a => a.isActive);
      const uniqueCompanies = new Set(assessments.map(a => a.vdCode));
      
      const totalScore = activeAssessments.reduce((sum, assessment) => {
        return sum + parseFloat(assessment.avgScore || '0');
      }, 0);
      
      const averageScore = activeAssessments.length > 0 ? totalScore / activeAssessments.length : 0;

      return {
        totalAssessments: assessments.length,
        activeAssessments: activeAssessments.length,
        companiesAssessed: uniqueCompanies.size,
        averageScore: Math.round(averageScore * 100) / 100
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        totalAssessments: 0,
        activeAssessments: 0,
        companiesAssessed: 0,
        averageScore: 0
      };
    }
  }
};

export default {
  companies: companiesService,
  forms: formsService,
  assessments: csmAssessmentsService
};