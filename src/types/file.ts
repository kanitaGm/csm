// ========================================================================
// MULTI FILE UPLOAD TYPES - สำหรับ MultiInsertFiles Component
// ========================================================================
export interface MultiFileInputProps {
  value?: string[];
  onFilesChange: (urls: string[]) => void;
  maxFiles?: number;
  acceptTypes?: string[];
  vdCode: string;
  disabled?: boolean;
}

// ========================================================================
// CSV IMPORT TYPES
// ========================================================================
export interface CSVImportError {
  row: number;
  field?: string;
  message: string;
  data?: Record<string, unknown>;
}
export interface CSVImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: CSVImportError[];
  duplicates: number;
}