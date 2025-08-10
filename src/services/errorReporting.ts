// 📁 src/services/errorReporting.ts
import { CSMError } from '../features/errors/CSMError';

export class ErrorReportingService {
  private errors: CSMError[] = [];
  
  reportError(error: CSMError, context?: Record<string, unknown>): void {
    console.error('CSM Error:', {
      message: error.message,
      code: error.code,
      severity: error.severity,
      context,
      stack: error.stack
    });
    
    this.errors.push(error);
    
    if (error.severity === 'critical') {
      this.notifyAdministrators(error, context);
    }
  }
  
  private notifyAdministrators(error: CSMError, _context?: Record<string, unknown>): void {
    console.warn('Critical error reported:', error && _context);
  }
  
  getErrorStats(): { total: number; bySeverity: Record<string, number> } {
    return {
      total: this.errors.length,
      bySeverity: this.errors.reduce((acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

export const errorReporter = new ErrorReportingService();