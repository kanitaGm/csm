
// 📁 src/components/utils/retryUtils.ts 
import { CSMError, CSMErrorCodes } from '../../features/errors/CSMError';

export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw new CSMError(
          `Operation failed after ${maxRetries + 1} attempts`,
          CSMErrorCodes.NETWORK_ERROR,
          'high',
          false,
          lastError
        );
      }
      
      const delay = backoffMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};
