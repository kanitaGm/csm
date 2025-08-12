// 📁 src/utils/dataValidation.ts
// Data validation utilities to prevent runtime errors

import type { CSMVendor } from "../types";

export const safeArrayAccess = <T>(
  array: T[] | undefined | null, 
  defaultValue: T[] = []
): T[] => {
  return Array.isArray(array) ? array : defaultValue;
};

export const safeStringAccess = (
  value: string | undefined | null, 
  defaultValue: string = ''
): string => {
  return typeof value === 'string' ? value : defaultValue;
};

export const safeJoinArray = (
  array: string[] | undefined | null,
  separator: string = ', ',
  maxItems?: number
): string => {
  const safeArray = safeArrayAccess(array);
  const itemsToShow = maxItems ? safeArray.slice(0, maxItems) : safeArray;
  return itemsToShow.join(separator);
};

export const safeWorkingAreaDisplay = (
  workingArea: string[] | string | undefined | null,
  maxDisplay: number = 2
): { display: string; hasMore: boolean; totalCount: number } => {
  let areas: string[] = [];
  
  if (Array.isArray(workingArea)) {
    areas = workingArea;
  } else if (typeof workingArea === 'string') {
    areas = [workingArea];
  }
  
  const displayAreas = areas.slice(0, maxDisplay);
  const hasMore = areas.length > maxDisplay;
  
  return {
    display: displayAreas.join(', '),
    hasMore,
    totalCount: areas.length
  };
};

// CSM-specific data validation
export const validateCSMVendor = (vendor: CSMVendor): boolean => {
  return !!(
    vendor &&
    typeof vendor.vdCode === 'string' &&
    typeof vendor.vdName === 'string' &&
    typeof vendor.companyId === 'string'
  );
};

export const normalizeCSMVendor = (rawVendor: CSMVendor): unknown => {
  if (!validateCSMVendor(rawVendor)) {
    console.warn('Invalid vendor data:', rawVendor);
    return null;
  }

  return {
    ...rawVendor,
    workingArea: safeArrayAccess(rawVendor.workingArea, ['Unknown']),
    vdName: safeStringAccess(rawVendor.vdName, 'Unknown Vendor'),
    category: safeStringAccess(rawVendor.category, '1'),
    freqAss: safeStringAccess(rawVendor.freqAss, '1year')
  };
};