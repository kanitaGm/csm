// src/pages/employees/AddEmployeePage.tsx - Updated with UniversalFileUpload
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import SingleEmployeeForm from './components/SingleEmployeeForm';
import ImportEmployeePage from './components/ImportEmployeeForm';
import type { EmployeeFormState, OptionType } from '../../types/';
import { normalizeEmployeePayload, validateSingleEmployee } from '../../utils/employeeUtils';
// Updated imports for new file system
import { uploadEmployeePhoto } from '../../utils/fileUtils';
import { UniversalFileUpload } from '../../components/ui/UniversalFileUpload';
import type { FileAttachment } from '../../hooks/useFileUpload';
import { useToast } from '../../hooks/useToast';
import { FaArrowLeft, FaFileUpload, FaUser, FaSpinner, FaUsers, FaPlus } from 'react-icons/fa';

type TabType = 'single' | 'import';

// Enhanced initial form data with better defaults
const INITIAL_FORM_DATA: EmployeeFormState = {
  empId: '', idCard: '', employeeType: 'employee', status: 'active', email: '',
  firstName: '', lastName: '', level: '', prefix: '', displayName: '',
  nickname: '', phoneNumber: '', address: '', profileImageUrl: null,
  position: '', companyId: '', company: '', department: '',
  countryId: '', zoneId: '', siteId: '', plantId: '', 
  dateOfBirth: '', startDate: '', cardExpiryDate: '',
};

// Enhanced loading states - updated to remove photo processing state
interface LoadingStates {
  companies: boolean;
  submitting: boolean;
}

export default function AddEmployeePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState<TabType>('single');
  const [formData, setFormData] = useState<EmployeeFormState>(INITIAL_FORM_DATA);
  const [companies, setCompanies] = useState<OptionType[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<OptionType | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Updated photo handling states - using UniversalFileUpload format
  const [profilePhoto, setProfilePhoto] = useState<FileAttachment[]>([]);
  
  // Loading states - removed photo processing
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    companies: true,
    submitting: false
  });

  // Enhanced company fetching with error handling
  const fetchCompanies = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, companies: true }));
      
      const companyCollection = collection(db, 'companies');
      const companySnapshot = await getDocs(companyCollection);
      
      const companyList = companySnapshot.docs
        .map(doc => ({
          value: doc.id,
          label: doc.data().name || 'Unnamed Company'
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      
      setCompanies(companyList);
    } catch (error) {
      console.error("Error fetching companies:", error);
      addToast({
        type: 'error',
        title: 'Loading Error',
        message: 'Failed to load companies. Please refresh the page.'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, companies: false }));
    }
  }, [addToast]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Enhanced company change handler
  const handleCompanyChange = useCallback((company: OptionType | null) => {
    setSelectedCompany(company);
    setFormData(prev => ({
      ...prev,
      companyId: company?.value || '',
      company: company?.label || '',
    }));
    
    // Clear company-related errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.company;
      delete newErrors.companyId;
      return newErrors;
    });
  }, []);

  // Enhanced input change handler with better validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Special handling for different input types
    let processedValue = value;
    
    switch (name) {
      case 'employeeType':
        setFormData(prev => ({
          ...prev,
          employeeType: value as EmployeeFormState['employeeType'],
          level: '' // Reset level when employee type changes
        }));
        return;
        
      case 'idCard':
        // Remove non-digits and limit to 13 characters
        processedValue = value.replace(/\D/g, '').slice(0, 13);
        break;
        
      case 'email':
        // Convert to lowercase for consistency
        processedValue = value.toLowerCase().trim();
        break;
        
      case 'firstName':
      case 'lastName':
        // Capitalize first letter of each word
        processedValue = value.replace(/\b\w/g, l => l.toUpperCase());
        break;
        
      case 'phoneNumber':
        // Remove non-digits and format
        processedValue = value.replace(/\D/g, '').slice(0, 10);
        break;
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    
    // Clear field-specific errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  // Updated photo change handler using UniversalFileUpload
  const handlePhotoChange = useCallback((files: FileAttachment[]) => {
    setProfilePhoto(files);
    
    // Update form data with the photo URL
    if (files.length > 0) {
      const photoFile = files[0];
      setFormData(prev => ({
        ...prev,
        profileImageUrl: photoFile.url || null
      }));
      
      addToast({
        type: 'success',
        title: 'Photo Added',
        message: `Profile photo "${photoFile.name}" has been added.`
      });
    } else {
      setFormData(prev => ({
        ...prev,
        profileImageUrl: null
      }));
    }
  }, [addToast]);

  // Enhanced form validation with proper dependencies
  const validateForm = useCallback(async (): Promise<boolean> => {
    const basicErrors = validateSingleEmployee(formData);
    const formatErrors: Record<string, string> = {};
    const duplicateErrors: Record<string, string> = {};
    
    // Email format validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      formatErrors.email = 'Please enter a valid email address';
    }
    
    // Phone number validation
    if (formData.phoneNumber && formData.phoneNumber.length < 9) {
      formatErrors.phoneNumber = 'Phone number must be at least 9 digits';
    }
    
    // ID Card validation
    if (formData.idCard && formData.idCard.length !== 13) {
      formatErrors.idCard = 'ID Card must be exactly 13 digits';
    }
    
    // Check for duplicate Employee ID
    if (formData.empId?.trim()) {
      try {
        const q = query(
          collection(db, 'employees'), 
          where('empId', '==', formData.empId.trim())
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          duplicateErrors.empId = 'Employee ID already exists';
        }
      } catch (error) {
        console.error('Error checking duplicate Employee ID:', error);
        formatErrors.empId = 'Unable to verify Employee ID uniqueness';
      }
    }
    
    // Check for duplicate ID Card
    if (formData.idCard?.trim()) {
      try {
        const q = query(
          collection(db, 'employees'), 
          where('idCard', '==', formData.idCard.trim())
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          duplicateErrors.idCard = 'ID Card number already exists';
        }
      } catch (error) {
        console.error('Error checking duplicate ID Card:', error);
        formatErrors.idCard = 'Unable to verify ID Card uniqueness';
      }
    }
    
    const allErrors = { ...basicErrors, ...formatErrors, ...duplicateErrors };
    setErrors(allErrors);
    
    return Object.keys(allErrors).length === 0;
  }, [formData]);

  // Enhanced reset handler
  const handleReset = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setSelectedCompany(null);
    setErrors({});
    setProfilePhoto([]); // Clear photo files
    
    addToast({
      type: 'success',
      title: 'Form Reset',
      message: 'Form has been reset successfully.'
    });
  }, [addToast]);

  // Enhanced form submission with better error handling
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loadingStates.submitting) return;
    
    setLoadingStates(prev => ({ ...prev, submitting: true }));
    setFeedback(null);
    
    try {
      // Validate form
      const isValid = await validateForm();
      if (!isValid) {
        addToast({
          type: 'error',
          title: 'Validation Error',
          message: 'Please fix the errors below before submitting.'
        });
        return;
      }
      
      // Upload photo if selected
      let uploadedPhotoUrl: string | null = formData.profileImageUrl || null;
      if (profilePhoto.length > 0 && formData.empId) {
        try {
          const photoFile = profilePhoto[0];
          
          // Convert FileAttachment to File for upload
          if (photoFile.url && photoFile.url.startsWith('blob:')) {
            const response = await fetch(photoFile.url);
            const blob = await response.blob();
            const file = new File([blob], photoFile.name, { type: photoFile.type });
            
            uploadedPhotoUrl = await uploadEmployeePhoto(file, formData.empId);
            
            addToast({
              type: 'success',
              title: 'Photo Uploaded',
              message: 'Profile photo has been uploaded successfully.'
            });
          }
        } catch (photoError) {
          console.error('Error uploading photo:', photoError);
          addToast({
            type: 'warning',
            title: 'Photo Upload Failed',
            message: 'Failed to upload photo. Employee will be saved without photo.'
          });
        }
      }
      
      // Prepare data for saving
      const dataToSave = normalizeEmployeePayload({
        ...formData,
        profileImageUrl: uploadedPhotoUrl,
      });
      
      const finalPayload = {
        ...dataToSave,
        createdBy: user?.email || 'System',
        createdAt: serverTimestamp(),
        lastUpdatedBy: user?.email || 'System',
        lastUpdateAt: serverTimestamp(),
      };
      
      // Save to database
      await addDoc(collection(db, 'employees'), finalPayload);
      
      addToast({
        type: 'success',
        title: 'Employee Added',
        message: `Employee "${formData.firstName} ${formData.lastName}" has been added successfully!`
      });
      
      // Reset form after successful submission
      handleReset();
      
    } catch (error) {
      console.error('Error adding employee:', error);
      addToast({
        type: 'error',
        title: 'Submission Failed',
        message: 'Failed to add employee. Please try again or contact support.'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, submitting: false }));
    }
  }, [loadingStates.submitting, validateForm, formData, profilePhoto, user?.email, handleReset, addToast]);

  // Enhanced tab configuration
  const tabs = useMemo(() => [
    { 
      id: 'single' as TabType, 
      label: 'Add Single Employee', 
      icon: FaUser,
      description: 'Add one employee at a time'
    },
    { 
      id: 'import' as TabType, 
      label: 'Import Employees', 
      icon: FaFileUpload,
      description: 'Import multiple employees from file'
    }
  ], []);

  // Enhanced loading component
  const LoadingSpinner = ({ message }: { message: string }) => (
    <div className="flex items-center justify-center p-8">
      <FaSpinner className="w-6 h-6 mr-3 text-indigo-600 animate-spin" />
      <span className="text-gray-600">{message}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-6 py-4 mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/employees')}
                className="flex items-center px-3 py-2 space-x-2 text-gray-600 transition-all duration-200 rounded-lg hover:text-gray-800 hover:bg-gray-100"
              >
                <FaArrowLeft className="w-4 h-4" />
                <span className="font-medium">Back to Employees</span>
              </button>
              <div className="h-6 border-l border-gray-300" />
              <div>
                <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
                  <FaPlus className="text-indigo-600 w-7 h-7" />
                  Add Employees
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Create new employee records individually or import in bulk
                </p>
              </div>
            </div>
            
            <div className="items-center hidden space-x-4 text-sm text-gray-500 md:flex">
              <div className="flex items-center gap-2">
                <FaUsers className="w-4 h-4" />
                <span>Total Companies: {companies.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6 mx-auto max-w-7xl">
        <div className="overflow-hidden bg-white border shadow-sm rounded-xl">
          
          {/* Enhanced Tab Navigation */}
          <div className="border-b border-gray-200 bg-gray-50">
            <nav className="flex px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-3 py-4 px-6 border-b-2 font-medium text-sm transition-all duration-200 relative group
                      ${activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600 bg-white -mb-px'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className={`text-lg ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <div className="text-left">
                      <div className="font-semibold">{tab.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-2">
            {loadingStates.companies ? (
              <LoadingSpinner message="Loading companies..." />
            ) : (
              <>
                {activeTab === 'single' && (
                  <div className="space-y-6">
                    {/* Profile Photo Upload Section */}
                    <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
                      <h3 className="mb-4 text-lg font-medium text-gray-900">Profile Photo</h3>
                      <UniversalFileUpload
                        files={profilePhoto}
                        onFilesChange={handlePhotoChange}
                        options={{
                          maxFiles: 1,
                          label: 'Employee Profile Photo',
                          description: 'Upload a profile photo for the employee (JPG, PNG, WebP - max 10MB)',
                          acceptedFileTypes: 'image/*',
                          allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
                          maxFileSize: 10 * 1024 * 1024, // 10MB
                          showPreview: true,
                          showCompressionInfo: true,
                          disabled: loadingStates.submitting,
                          imageOptions: {
                            maxSizeMB: 0.2,
                            maxWidthOrHeight: 400,
                            quality: 0.8,
                            fileType: 'image/webp'
                          }
                        }}
                      />
                      
                      {/* Photo Preview Summary */}
                      {profilePhoto.length > 0 && (
                        <div className="p-3 mt-4 border border-blue-200 rounded-lg bg-blue-50">
                          <p className="text-sm text-blue-800">
                            ✅ Profile photo ready for upload: <strong>{profilePhoto[0].name}</strong>
                          </p>
                          {profilePhoto[0].compressionRatio && profilePhoto[0].compressionRatio > 0 && (
                            <p className="mt-1 text-xs text-blue-700">
                              File size optimized by {Math.round(profilePhoto[0].compressionRatio)}%
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <SingleEmployeeForm
                      formData={formData}
                      errors={errors}
                      isSubmitting={loadingStates.submitting}
                      feedback={feedback}
                      previewImage={profilePhoto.length > 0 ? profilePhoto[0].url || null : null}
                      onInputChange={handleInputChange}
                      onPhotoChange={() => {}} // Disabled since we handle it above
                      onSubmit={handleSubmit}
                      onReset={handleReset}
                      companies={companies}
                      selectedCompany={selectedCompany}
                      onCompanyChange={handleCompanyChange}
                      compressionProgress={null} // No longer used
                    />
                  </div>
                )}
                
                {activeTab === 'import' && (
                  <div className="space-y-6">
                    <ImportEmployeePage />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}