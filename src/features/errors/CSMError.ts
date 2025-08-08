// ============= ERROR HANDLING & RELIABILITY - FILE CHANGES =============

// 📁 src/fetures/errors/CSMError.ts 
export class CSMError extends Error {
  public code: string;
  public severity: 'low' | 'medium' | 'high' | 'critical';
  public retryable: boolean;
  public cause?: Error;

  constructor(
    message: string,
    code: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    retryable: boolean = false,
    cause?: Error
  ) {
    super(message);
    this.name = 'CSMError';
    this.code = code;
    this.severity = severity;
    this.retryable = retryable;
    this.cause = cause;
  }
}

export const CSMErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  SAVE_CONFLICT: 'SAVE_CONFLICT',
  FIRESTORE_ERROR: 'FIRESTORE_ERROR'
} as const;
