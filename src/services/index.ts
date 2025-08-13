// 📁 src/services/index.ts - Fixed Service Exports
export { default as csmService } from './csmService';
export { csmVendorService } from './csmVendorService';
export { enhancedCSMFormsService } from './enhancedCsmService';
export { cacheService } from './cacheService';

// Auth service
export * from './authService';
export * from './authService';
export * from './csmService';
export * from './employeeService';
export * from './formService';
export * from './trainingService';

// Default exports
export { AuthenticationService } from './authService';

// Re-export individual services
export { 
  vendorsService, 
  assessmentSummariesService, 
  formsService, 
  assessmentsService,
  companiesService
} from './csmService';

export default {
  csmService: () => import('./csmService'),
  csmVendorService: () => import('./csmVendorService'),
  enhancedCSMFormsService: () => import('./enhancedCsmService'),
  cacheService: () => import('./cacheService')
};