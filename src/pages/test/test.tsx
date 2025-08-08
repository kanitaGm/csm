// Create firebase user account for testing purposes
import { useState } from 'react';

const SignUpDebug = () => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const createUser = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      // ใช้ Firebase Auth SDK โดยตรง
      const { createUserWithEmailAndPassword, getAuth } = await import('firebase/auth');
      const { initializeApp, getApps } = await import('firebase/app');
      
      // Firebase config (ใส่ config ของคุณ)
      const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        // ... config อื่นๆ
      };

      // Initialize Firebase app if not already initialized
      if (getApps().length === 0) {
        initializeApp(firebaseConfig);
      }
      const auth = getAuth();

      const result = await createUserWithEmailAndPassword(auth, email, password);
      setMessage(`✅ สร้าง user สำเร็จ: ${result.user.email}`);
      
    } catch (error) {
      console.error('Sign up error:', error);
      if (error instanceof Error) {
        setMessage(`❌ Error: ${error.message}`);
      } else {
        setMessage('❌ Error: An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
      const { signInWithEmailAndPassword, getAuth } = await import('firebase/auth');
      const { initializeApp, getApps } = await import('firebase/app');

      // Firebase config (ใส่ config ของคุณ)
      const firebaseConfig = {
        apiKey: "AIzaSyCbLOLR4KqlWaGOfvZesdVVgFzlyDluPkI",
        authDomain: "sccc-inseesafety-prod.firebaseapp.com",
        projectId: "sccc-inseesafety-prod",
      };

      // Initialize Firebase app if not already initialized
      if (getApps().length === 0) {
        initializeApp(firebaseConfig);
      }
      const auth = getAuth();

      const result = await signInWithEmailAndPassword(auth, email, password);
      setMessage(`✅ Login สำเร็จ: ${result.user.email}`);
    setMessage('');
    
    try {
      const { signInWithEmailAndPassword, getAuth } = await import('firebase/auth');
      const auth = getAuth();
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      setMessage(`✅ Login สำเร็จ: ${result.user.email}`);
      
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        setMessage(`❌ Login Error: ${error.message}`);
      } else {
        setMessage('❌ Login Error: An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  // Add testLogin function
  const testLogin = async () => {
    setLoading(true);
    setMessage('');
    try {
      const { signInWithEmailAndPassword, getAuth } = await import('firebase/auth');
      const { initializeApp, getApps } = await import('firebase/app');
      const firebaseConfig = {
        apiKey: "AIzaSyCbLOLR4KqlWaGOfvZesdVVgFzlyDluPkI",
        authDomain: "sccc-inseesafety-prod.firebaseapp.com",
        projectId: "sccc-inseesafety-prod",
      };
      if (getApps().length === 0) {
        initializeApp(firebaseConfig);
      }
      const auth = getAuth();
      const result = await signInWithEmailAndPassword(auth, email, password);
      setMessage(`✅ Login สำเร็จ: ${result.user.email}`);
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        setMessage(`❌ Login Error: ${error.message}`);
      } else {
        setMessage('❌ Login Error: An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">🔧 Firebase Auth Debug</h2>
        
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={createUser}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? '⏳' : '👤 Create User'}
            </button>
            
            <button
              onClick={testLogin}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '⏳' : '🔑 Test Login'}
            </button>
          </div>
          
          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('✅') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">📋 Debug Steps:</h3>
            <ol className="text-sm text-yellow-700 space-y-1">
              <li>1. กด "Create User" เพื่อสร้าง test account</li>
              <li>2. กด "Test Login" เพื่อทดสอบ login</li>
              <li>3. ตรวจสอบ Firebase Console → Authentication → Users</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpDebug;