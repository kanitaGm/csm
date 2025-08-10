// src/utils/dateUtils.ts
import { Timestamp } from 'firebase/firestore';
import { format, parseISO, isValid } from 'date-fns';
//import { th } from 'date-fns/locale';

// Type definitions
export type DateInput = Timestamp | Date | string | null | undefined | { seconds: number; nanoseconds?: number };

// ฟังก์ชันแปลง DateInput เป็น Date object
export const parseDate = (dateInput: DateInput): Date | null => {
  if (!dateInput) return null;

  try {
    // กรณีเป็น Firestore Timestamp
    if (dateInput && typeof dateInput === 'object' && 'toDate' in dateInput && typeof dateInput.toDate === 'function') {
      return (dateInput as Timestamp).toDate();
    }

    // กรณีเป็น object แบบ { seconds, nanoseconds }
    if (dateInput && typeof dateInput === 'object' && 'seconds' in dateInput && typeof dateInput.seconds === 'number') {
      return new Date(dateInput.seconds * 1000);
    }

    // กรณีเป็น Date object
    if (dateInput instanceof Date) {
      return isValid(dateInput) ? dateInput : null;
    }

    // กรณีเป็น string
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      if (!trimmed) return null;

      // จัดการกับรูปแบบ Firestore date string เช่น "July 16, 2025 at 12:00:00 AM UTC+7"
      if (trimmed.includes(' at ') && (trimmed.includes('UTC') || trimmed.includes('GMT'))) {
        try {
          // วิธีที่ 1: แปลงทั้งหมด
          const date1 = new Date(trimmed);
          if (isValid(date1)) return date1;
          
          // วิธีที่ 2: ตัดส่วน " at ..." ออก
          const datePart = trimmed.split(' at ')[0];
          const date2 = new Date(datePart);
          if (isValid(date2)) return date2;
          
          // วิธีที่ 3: แปลงด้วย regex extraction
          const monthMatch = trimmed.match(/^(\w+)\s+(\d{1,2}),\s+(\d{4})/);
          if (monthMatch) {
            const [, monthName, day, year] = monthMatch;
            const date3 = new Date(`${monthName} ${day}, ${year}`);
            if (isValid(date3)) return date3;
          }
        } catch (e) {
          console.warn('Failed to parse Firestore date string:', trimmed, e);
        }
      }

      // ลองแปลงด้วย parseISO ก่อน (สำหรับ ISO format)
      if (trimmed.match(/^\d{4}-\d{2}-\d{2}/)) {
        const parsed = parseISO(trimmed);
        if (isValid(parsed)) return parsed;
      }

      // ลองแปลงด้วย Date constructor
      const date = new Date(trimmed);
      return isValid(date) ? date : null;
    }

    return null;
  } catch (error) {
    console.warn('Error parsing date:', error, dateInput);
    return null;
  }
};

// ฟังก์ชันจัดรูปแบบวันที่แบบสากล (YYYY-MM-DD)
export const formatDate = (dateInput: DateInput): string => {
  const date = parseDate(dateInput);
  if (!date) return 'ไม่ระบุ';

  try {
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    console.warn('Error formatting date:', error, dateInput);
    return 'รูปแบบวันที่ไม่ถูกต้อง';
  }
};

// ฟังก์ชันจัดรูปแบบวันที่แบบไทย (DD MMM YYYY) พร้อม debugging
export const formatDateThai = (dateInput: DateInput, includeBuddhistYear: boolean = true): string => {
  // Debug: แสดงข้อมูลที่เข้ามา
  //console.log('formatDateThai input:', dateInput, typeof dateInput);
  
  const date = parseDate(dateInput);
  if (!date) {
    console.warn('formatDateThai: Unable to parse date:', dateInput);
    return 'ไม่ระบุ';
  }

  try {
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('th-TH', { month: 'short' });
    const year = includeBuddhistYear ? date.getFullYear() + 543 : date.getFullYear();
    
    const result = `${day} ${month} ${year}`;
    //console.log('formatDateThai result:', result);
    return result;
  } catch (error) {
    console.warn('Error formatting Thai date:', error, dateInput);
    return 'รูปแบบวันที่ไม่ถูกต้อง';
  }
};

// ฟังก์ชันจัดรูปแบบวันที่แบบสั้น (DD-MMM-YYYY)
export const formatDateShort = (dateInput: DateInput): string => {
  const date = parseDate(dateInput);
  if (!date) return 'N/A';

  try {
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.warn('Error formatting short date:', error, dateInput);
    return 'Invalid Date';
  }
};

// ฟังก์ชันเปรียบเทียบวันที่
export const isDateExpired = (dateInput: DateInput): boolean => {
  const date = parseDate(dateInput);
  if (!date) return false; // ถ้าไม่มีวันที่ถือว่าไม่หมดอายุ (Lifetime)

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date < today;
};

// ฟังก์ชันคำนวณจำนวนวันที่เหลือ
export const getDaysUntilExpiry = (dateInput: DateInput): number | null => {
  const date = parseDate(dateInput);
  if (!date) return null; // Lifetime

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const timeDiff = date.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
};

// ฟังก์ชันตรวจสอบว่าวันที่ใกล้หมดอายุหรือไม่
export const isDateExpiringSoon = (dateInput: DateInput, daysThreshold: number = 30): boolean => {
  const daysLeft = getDaysUntilExpiry(dateInput);
  if (daysLeft === null) return false; // Lifetime
  
  return daysLeft >= 0 && daysLeft <= daysThreshold;
};

// ฟังก์ชันตรวจสอบว่าเป็น Lifetime หรือไม่
export const isLifetime = (dateInput: DateInput): boolean => {
  if (!dateInput) return true;
  
  const date = parseDate(dateInput);
  if (!date) return true;

  // ตรวจสอบว่าเป็นวันที่ในอนาคตมาก (100+ ปี) หรือไม่
  const today = new Date();
  const oneHundredYears = 100 * 365.25 * 24 * 60 * 60 * 1000;
  
  return (date.getTime() - today.getTime()) > oneHundredYears;
};

// ฟังก์ชันสำหรับสร้าง status object ที่ใช้ในการแสดงผล
export const getDateStatus = (dateInput: DateInput, daysThreshold: number = 30) => {
  // ตรวจสอบ Lifetime ก่อน
  if (!dateInput || isLifetime(dateInput)) {
    return {
      type: 'lifetime' as const,
      displayText: 'Lifetime',
      className: 'bg-green-100 text-green-800',
      daysLeft: null
    };
  }

  const daysLeft = getDaysUntilExpiry(dateInput);  
  if (daysLeft === null) {
    return {
      type: 'lifetime' as const,
      displayText: 'Lifetime',
      className: 'bg-green-100 text-green-800',
      daysLeft: null
    };
  }

  if (daysLeft < 0) {
    return {
      type: 'expired' as const,
      displayText: `Expired (${formatDateThai(dateInput)})`,
      className: 'bg-red-100 text-red-800',
      daysLeft
    };
  }

  if (daysLeft <= daysThreshold) {
    return {
      type: 'expiring' as const,
      displayText: `Will expiring in ${daysLeft} days (${formatDateThai(dateInput)})`,
      className: 'bg-orange-100 text-orange-800',
      daysLeft
    };
  }

  return {
    type: 'active' as const,
    displayText: formatDateThai(dateInput),
    className: 'bg-blue-100 text-blue-800',
    daysLeft
  };
};


// ฟังก์ชันกรองข้อมูลตามสถานะวันที่
export const filterByDateStatus = <T extends { expiryDate?: DateInput }>(
  records: T[],
  status: 'all' | 'active' | 'expired' | 'expiring' | 'lifetime'
): T[] => {
  return records.filter(record => {
    const dateStatus = getDateStatus(record.expiryDate);
    
    switch (status) {
      case 'active':
        return dateStatus.type === 'active' || dateStatus.type === 'lifetime';
      case 'expired':
        return dateStatus.type === 'expired';
      case 'expiring':
        return dateStatus.type === 'expiring';
      case 'lifetime':
        return dateStatus.type === 'lifetime';
      case 'all':
      default:
        return true;
    }
  });
};

// ฟังก์ชันสำหรับสร้างสถิติการหมดอายุ
export const getExpiryStatistics = <T extends { expiryDate?: DateInput }>(records: T[]) => {
  const total = records.length;
  let active = 0;
  let expired = 0;
  let expiring = 0;
  let lifetime = 0;

  records.forEach(record => {
    const status = getDateStatus(record.expiryDate);
    
    switch (status.type) {
      case 'lifetime':
        lifetime++;
        active++;
        break;
      case 'active':
        active++;
        break;
      case 'expired':
        expired++;
        break;
      case 'expiring':
        expiring++;
        active++;
        break;
    }
  });

  return { total, active, expired, expiring, lifetime };
};



// Export สำหรับความสะดวกในการใช้งาน
export default {
  parseDate,
  formatDate,
  formatDateThai,
  formatDateShort,
  isDateExpired,
  getDaysUntilExpiry,
  isDateExpiringSoon,
  isLifetime,
  getDateStatus,
  filterByDateStatus,
  getExpiryStatistics
};