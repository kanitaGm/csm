// =================================================================
// src/services/firebase.ts
// ไฟล์สำหรับตั้งค่าและ export instance ของ Firebase // *โค้ดสำหรับเชื่อมต่อ Firebase
// =================================================================
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// TODO: ใส่ Firebase config ของคุณที่นี่
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  //databaseURL: "https://pelagic-core-320402-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  region: 'asia-southeast1',
};

// ✅ Debug: แสดงค่า config
/*
console.log('🔧 Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? 'SET' : 'MISSING',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
});
*/

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)";
const db = getFirestore(app, databaseId);

const functions = getFunctions(app, 'asia-southeast1'); // ใช้ default region หรือ region ที่ตั้งค่าไว้
const storage = getStorage(app); // Initialize Firebase Storage and get a reference to the service (ถ้าใช้)


// สร้าง Google Provider แบบใหม่ทุกครั้งในการใช้งาน (ไม่ reuse)
export const createGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.addScope('openid');
  
  // ตั้งค่าให้ขอ permission ใหม่ทุกครั้ง
  provider.setCustomParameters({
    prompt: 'consent select_account',
    include_granted_scopes: 'true',
    access_type: 'online'
  });
  
  //console.log('🔧 Google Provider created with scopes:', provider.getScopes());
  return provider;
};

const googleProvider = createGoogleProvider();

/*
// เชื่อมต่อกับ emulator ในโหมด development (ถ้าต้องการ)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  console.log('🔧 Connecting to Firebase Emulators...');  
  // Auth Emulator
  if (!auth.config.emulator) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  }  
  // Firestore Emulator
  if (!db._delegate._databaseId) {
    connectFirestoreEmulator(db, 'localhost', 8080);
  }  
  // Functions Emulator
  if (!functions.customDomain) {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  }
}
*/
export { app, auth, db, functions, storage, googleProvider };
