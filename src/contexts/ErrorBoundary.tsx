// 📁 src/contexts/ErrorBoundary.tsx 
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { CSMError, CSMErrorCodes } from '../features/errors/CSMError';
import { errorReporter } from '../services/errorReporting';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export class CSMErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorId = Date.now().toString();
    return {
      hasError: true,
      error,
      errorId
    };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const csmError = new CSMError(
      error.message,
      CSMErrorCodes.VALIDATION_ERROR,
      'high',
      false,
      error
    );
    
    errorReporter.reportError(csmError, {
      errorInfo,
      timestamp: new Date().toISOString()
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              เกิดข้อผิดพลาด
            </h1>
            <p className="text-gray-600 mb-4">
              ระบบพบปัญหาในการทำงาน กรุณาลองใหม่อีกครั้ง
            </p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                รีโหลดหน้า
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                ลองอีกครั้ง
              </button>
            </div>
            {this.state.errorId && (
              <p className="text-xs text-gray-500 mt-4">
                Error ID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}