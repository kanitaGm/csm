// 📁 src/utils/firebaseDebug.ts - Complete Firebase Debug Service
import { 
  collection, 
  getDocs, 
  getDoc,
  addDoc, 
  query, 
  limit,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

// =================== COLLECTION NAMES ===================
export const COLLECTIONS = {
  CSM_ASSESSMENTS: 'csmAssessments',
  CSM_SUMMARIES: 'csmAssessmentSummaries',
  CSM_VENDORS: 'csmVendors',
  FORMS: 'forms',
  COMPANIES: 'companies',
  USERS: 'users'
} as const;

// =================== TYPES ===================
interface HealthCheckResult {
  connection: boolean;
  collections: Record<string, boolean>;
  saveTest: boolean;
  existingData: boolean;
}

interface ConfigInfo {
  projectId: string;
  authDomain: string;
  databaseId: string;
  region: string;
}

// =================== DEBUG SERVICE ===================
export class FirebaseDebugService {
  
  /**
   * Test Firestore connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Firestore connection...');
      
      // Try to read from a collection
      const testQuery = query(collection(db, COLLECTIONS.USERS), limit(1));
      await getDocs(testQuery);
      
      console.log('✅ Firestore connection successful');
      return true;
      
    } catch (error) {
      console.error('❌ Firestore connection failed:', error);
      return false;
    }
  }

  /**
   * Verify all collections exist and are accessible
   */
  static async verifyCollections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name, collectionName] of Object.entries(COLLECTIONS)) {
      try {
        console.log(`🔍 Checking collection: ${collectionName}`);
        
        const testQuery = query(collection(db, collectionName), limit(1));
        const snapshot = await getDocs(testQuery);
        
        results[name] = true;
        console.log(`✅ Collection ${collectionName} accessible (${snapshot.size} docs found)`);
        
      } catch (error) {
        results[name] = false;
        console.error(`❌ Collection ${collectionName} not accessible:`, error);
      }
    }
    
    return results;
  }

  /**
   * Test CSM Assessment save operation
   */
  static async testCSMAssessmentSave(): Promise<boolean> {
    try {
      console.log('🧪 Testing CSM Assessment save...');
      
      const testAssessment = {
        vdCode: 'TEST_VENDOR_001',
        vdName: 'Test Vendor Name',
        companyId: 'test-company-id',
        formId: 'test-form-id',
        formVersion: '1.0',
        answers: [],
        auditor: {
          name: 'Test Auditor',
          email: 'test@example.com',
          phone: '0123456789',
          position: 'Test Position'
        },
        vdCategory: 'Testing',
        vdWorkingArea: 'Test Area',
        isActive: true,
        isFinish: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Try to save to collection
      const docRef = await addDoc(collection(db, COLLECTIONS.CSM_ASSESSMENTS), testAssessment);
      console.log('✅ Test assessment saved with ID:', docRef.id);
      
      // Try to read it back
      const savedDoc = await getDoc(docRef);
      if (savedDoc.exists()) {
        console.log('✅ Test assessment read back successfully');
        console.log('📄 Saved data:', savedDoc.data());
        return true;
      } else {
        console.error('❌ Test assessment not found after save');
        return false;
      }
      
    } catch (error) {
      console.error('❌ CSM Assessment save test failed:', error);
      return false;
    }
  }

  /**
   * Check existing CSM assessments
   */
  static async checkExistingAssessments(vdCode?: string): Promise<void> {
    try {
      console.log('🔍 Checking existing CSM assessments...');
      
      let assessmentQuery;
      if (vdCode) {
        assessmentQuery = query(
          collection(db, COLLECTIONS.CSM_ASSESSMENTS),
          where('vdCode', '==', vdCode),
          limit(10)
        );
        console.log(`🔍 Searching for assessments with vdCode: ${vdCode}`);
      } else {
        assessmentQuery = query(collection(db, COLLECTIONS.CSM_ASSESSMENTS), limit(10));
      }
      
      const snapshot = await getDocs(assessmentQuery);
      
      console.log(`📋 Found ${snapshot.size} assessments`);
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📄 Assessment ${doc.id}:`, {
          vdCode: data.vdCode,
          vdName: data.vdName,
          isFinish: data.isFinish,
          createdAt: data.createdAt,
          answersCount: data.answers?.length || 0
        });
      });
      
    } catch (error) {
      console.error('❌ Error checking existing assessments:', error);
    }
  }

  /**
   * Comprehensive Firestore health check
   */
  static async performHealthCheck(vdCode?: string): Promise<HealthCheckResult> {
    console.log('🏥 Starting Firestore health check...');
    
    const results: HealthCheckResult = {
      connection: false,
      collections: {},
      saveTest: false,
      existingData: false
    };

    // Test connection
    results.connection = await this.testConnection();
    if (!results.connection) {
      console.log('❌ Stopping health check due to connection failure');
      return results;
    }

    // Check collections
    results.collections = await this.verifyCollections();
    
    // Test save operation
    if (results.collections.CSM_ASSESSMENTS) {
      results.saveTest = await this.testCSMAssessmentSave();
    }

    // Check existing data
    if (vdCode) {
      await this.checkExistingAssessments(vdCode);
      results.existingData = true;
    }

    console.log('🏥 Health check complete:', results);
    return results;
  }

  /**
   * Get Firebase configuration info (without sensitive data)
   */
  static getConfigInfo(): ConfigInfo {
    return {
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'Not set',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'Not set',
      databaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)',
      region: 'asia-southeast1'
    };
  }

  /**
   * Debug Firestore rules (client-side check)
   */
  static async debugFirestoreRules(): Promise<void> {
    console.log('🔒 Testing Firestore security rules...');
    
    const testOperations = [
      {
        name: 'Read CSM Assessments',
        operation: () => getDocs(query(collection(db, COLLECTIONS.CSM_ASSESSMENTS), limit(1)))
      },
      {
        name: 'Read CSM Vendors',
        operation: () => getDocs(query(collection(db, COLLECTIONS.CSM_VENDORS), limit(1)))
      },
      {
        name: 'Read Forms',
        operation: () => getDocs(query(collection(db, COLLECTIONS.FORMS), limit(1)))
      }
    ];

    for (const test of testOperations) {
      try {
        await test.operation();
        console.log(`✅ ${test.name}: Allowed`);
      } catch (error) {
        console.error(`❌ ${test.name}: Denied -`, error);
      }
    }
  }

  /**
   * Log system information
   */
  static logSystemInfo(): void {
    console.group('🔧 System Information');
    console.log('📊 Config info:', this.getConfigInfo());
    console.log('🌐 Environment:', import.meta.env.DEV ? 'Development' : 'Production');
    console.log('📅 Current time:', new Date().toISOString());
    console.groupEnd();
  }
}

// =================== UTILITY FUNCTIONS ===================
export const debugFirebase = async (vdCode?: string): Promise<void> => {
  try {
    FirebaseDebugService.logSystemInfo();
    const results = await FirebaseDebugService.performHealthCheck(vdCode);
    await FirebaseDebugService.debugFirestoreRules();
    
    console.group('📋 Health Check Summary');
    console.log('Connection:', results.connection ? '✅' : '❌');
    console.log('Collections:', Object.entries(results.collections).map(([name, ok]) => `${ok ? '✅' : '❌'} ${name}`).join(', '));
    console.log('Save Test:', results.saveTest ? '✅' : '❌');
    console.groupEnd();
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
};

// =================== EXPORTS ===================
export default FirebaseDebugService;
//export { debugFirebase };