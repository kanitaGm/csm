// 📁 src/utils/debugCSMData.ts
// Utility สำหรับตรวจสอบข้อมูล CSM ใน Firestore

import { 
  collection, 
  getDocs, 
  addDoc, 
  doc,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CSMVendor, Company } from '../types';

// =================== DEBUG FUNCTIONS ===================

/**
 * ตรวจสอบว่ามีข้อมูล vendors ใน Firestore หรือไม่
 */
export const checkVendorsData = async () => {
  console.log('🔍 Checking CSM Vendors data...');
  
  try {
    // ตรวจสอบ collection csmVendors
    const vendorsSnapshot = await getDocs(collection(db, 'csmVendors'));
    console.log(`📊 Found ${vendorsSnapshot.size} documents in csmVendors collection`);
    
    if (vendorsSnapshot.size === 0) {
      console.log('⚠️ No vendors found in csmVendors collection');
      return { count: 0, vendors: [] };
    }
    
    const vendors: CSMVendor[] = [];
    vendorsSnapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() } as CSMVendor;
      vendors.push(data);
      console.log('📄 Vendor:', data.vdCode, '-', data.vdName);
    });
    
    return { count: vendors.length, vendors };
    
  } catch (error) {
    console.error('❌ Error checking vendors data:', error);
    return { count: 0, vendors: [], error };
  }
};

/**
 * ตรวจสอบว่ามีข้อมูล companies ใน Firestore หรือไม่
 */
export const checkCompaniesData = async () => {
  console.log('🔍 Checking Companies data...');
  
  try {
    const companiesSnapshot = await getDocs(collection(db, 'companies'));
    console.log(`📊 Found ${companiesSnapshot.size} documents in companies collection`);
    
    if (companiesSnapshot.size === 0) {
      console.log('⚠️ No companies found in companies collection');
      return { count: 0, companies: [] };
    }
    
    const companies: Company[] = [];
    companiesSnapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() } as Company;
      companies.push(data);
      console.log('🏢 Company:', data.companyId, '-', data.name);
    });
    
    return { count: companies.length, companies };
    
  } catch (error) {
    console.error('❌ Error checking companies data:', error);
    return { count: 0, companies: [], error };
  }
};

/**
 * ตรวจสอบข้อมูลทั้งหมดที่เกี่ยวข้องกับ CSM
 */
export const performCSMDataCheck = async () => {
  console.group('🏥 CSM Data Health Check');
  
  const results = {
    vendors: await checkVendorsData(),
    companies: await checkCompaniesData(),
    timestamp: new Date().toISOString()
  };
  
  console.log('📋 Summary:');
  console.log(`- Vendors: ${results.vendors.count}`);
  console.log(`- Companies: ${results.companies.count}`);
  
  console.groupEnd();
  return results;
};

/**
 * สร้างข้อมูลตัวอย่างสำหรับทดสอบ
 */
export const createSampleData = async () => {
  console.log('🔧 Creating sample data...');
  
  try {
    // สร้าง sample companies
    const sampleCompanies: Omit<Company, 'id'>[] = [
      {
        companyId: 'COM001',
        name: 'บริษัท ทดสอบ จำกัด',
        type: 'main',
        contactPerson: 'นาย ทดสอบ ระบบ',
        email: 'test@company.com',
        phone: '02-123-4567',
        address: '123 ถนนทดสอบ กรุงเทพ 10100',
        isActive: true,
        workingArea: ['กรุงเทพ', 'ปริมณฑล'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        companyId: 'COM002',
        name: 'บริษัท ตัวอย่าง จำกัด',
        type: 'sub',
        contactPerson: 'นาง ตัวอย่าง ข้อมูล',
        email: 'sample@company.com',
        phone: '02-765-4321',
        address: '456 ถนนตัวอย่าง กรุงเทพ 10200',
        isActive: true,
        workingArea: ['ภาคกลาง', 'ภาคตะวันออก'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];
    
    // สร้าง sample vendors
    const sampleVendors: Omit<CSMVendor, 'id'>[] = [
      {
        companyId: 'COM001',
        vdCode: 'VD001',
        vdName: 'ผู้รับเหมาทดสอบ 1',
        freqAss: '365',
        isActive: true,
        category: '1',
        workingArea: ['กรุงเทพ'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        lastUpdatedBy: 'system'
      },
      {
        companyId: 'COM001',
        vdCode: 'VD002',
        vdName: 'ผู้รับเหมาทดสอบ 2',
        freqAss: '180',
        isActive: true,
        category: '2',
        workingArea: ['ปริมณฑล'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        lastUpdatedBy: 'system'
      },
      {
        companyId: 'COM002',
        vdCode: 'VD003',
        vdName: 'ผู้รับเหมาตัวอย่าง',
        freqAss: '365',
        isActive: true,
        category: 'maintenance',
        workingArea: ['ภาคกลาง'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        lastUpdatedBy: 'system'
      }
    ];
    
    // บันทึก companies
    console.log('📝 Creating companies...');
    for (const company of sampleCompanies) {
      await setDoc(doc(db, 'companies', company.companyId), company);
      console.log(`✅ Created company: ${company.name}`);
    }
    
    // บันทึก vendors
    console.log('📝 Creating vendors...');
    for (const vendor of sampleVendors) {
      await addDoc(collection(db, 'csmVendors'), vendor);
      console.log(`✅ Created vendor: ${vendor.vdName}`);
    }
    
    console.log('🎉 Sample data created successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    return false;
  }
};

/**
 * ฟังก์ชันหลักสำหรับ debug ระบบ CSM
 */
export const debugCSMSystem = async () => {
  console.log('🚀 Starting CSM System Debug...');
  
  // ตรวจสอบข้อมูลปัจจุบัน
  const currentData = await performCSMDataCheck();
  
  // ถ้าไม่มีข้อมูล ให้สร้างข้อมูลตัวอย่าง
  if (currentData.vendors.count === 0 || currentData.companies.count === 0) {
    console.log('💡 No data found, creating sample data...');
    const created = await createSampleData();
    
    if (created) {
      console.log('🔄 Rechecking data after creation...');
      await performCSMDataCheck();
    }
  }
  
  console.log('✅ CSM System Debug completed!');
};

// =================== UTILITY FOR REACT COMPONENTS ===================
/**
 * Hook สำหรับใช้ใน React Component เพื่อ debug CSM data
 */
export const useCSMDebug = () => {
  const debugData = async () => {
    try {
      await debugCSMSystem();
    } catch (error) {
      console.error('Debug failed:', error);
    }
  };
  
  const checkData = async () => {
    return await performCSMDataCheck();
  };
  
  const createSample = async () => {
    return await createSampleData();
  };
  
  return {
    debugData,
    checkData,
    createSample
  };
};