// =================================================================
// src/Main.tsx
// =================================================================
import React from 'react'; 
import ReactDOM from 'react-dom/client';   
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes/AppRoutes';
import './styles/index.css';

// เรียกใช้งาน createRoot ผ่าน ReactDOM ที่ import เข้ามา
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
     <AuthProvider>
   	<AppRoutes />
     </AuthProvider>
  </React.StrictMode>
);
