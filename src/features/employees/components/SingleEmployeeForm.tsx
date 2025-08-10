// src/components/employees/SingleEmployeeForm.tsx
import React, { useMemo, useCallback } from 'react';
import { 
  FaSave, 
  FaIdCard, 
  FaCamera, 
  FaMapMarkerAlt, 
  FaUser, 
  FaPhone, 
  FaTrash, 
  FaBriefcase, 
  FaEnvelope, 
  FaCalendarAlt,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaBuilding,
  FaUserTie
} from 'react-icons/fa';
import type { EmployeeFormState, OptionType } from '../../../types';
import { formatDate } from '../../../utils/dateUtils';
import { formatIdCard } from '../../../utils/employeeUtils';
import {SearchableSelect} from '../../../components/ui/SearchableSelect';

interface SingleEmployeeFormProps {
  formData: EmployeeFormState;
  errors: Record<string, string>;
  isSubmitting: boolean;
  feedback: { type: 'success' | 'error', message: string } | null;
  previewImage: string | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onPhotoChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  companies: OptionType[]; 
  selectedCompany: OptionType | null;
  onCompanyChange: (option: OptionType | null) => void; 
  compressionProgress: number | null;
}

// Enhanced SectionCard with better styling and animation
const SectionCard: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, children, className = "" }) => (
  <div className={`bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md ${className}`}>
    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50"> 
      <h3 className="flex items-center text-lg font-semibold text-gray-800">
        <div className="flex items-center justify-center w-8 h-8 mr-3 bg-white rounded-lg shadow-sm">
          {icon}
        </div>
        <span>{title}</span>
      </h3>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

// Enhanced Input Field Component
const InputField: React.FC<{
  label: string;
  icon?: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ label, icon, error, required, children, className = "" }) => (
  <div className={className}>
    <label className="block mb-2 text-sm font-medium text-gray-700">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          {icon}
        </div>
      )}
      {children}
    </div>
    {error && (
      <div className="flex items-center mt-1 text-sm text-red-600">
        <FaExclamationTriangle className="w-4 h-4 mr-1" />
        {error}
      </div>
    )}
  </div>
);

// Enhanced Feedback Alert
const FeedbackAlert: React.FC<{ feedback: { type: 'success' | 'error', message: string } }> = ({ feedback }) => (
  <div className={`
    mb-6 border rounded-xl p-4 shadow-sm transition-all duration-300
    ${feedback.type === 'success' 
      ? 'bg-green-50 border-green-200 text-green-800' 
      : 'bg-red-50 border-red-200 text-red-800'
    }
  `}>
    <div className="flex items-center">
      {feedback.type === 'success' ? (
        <FaCheckCircle className="w-5 h-5 mr-2 text-green-600" />
      ) : (
        <FaExclamationTriangle className="w-5 h-5 mr-2 text-red-600" />
      )}
      <p className="font-medium">{feedback.message}</p>
    </div>
  </div>
);

// Configuration constants
const EMPLOYEE_TYPES = [
  { value: 'employee', label: 'Employee', icon: '👨‍💼' }, 
  { value: 'contractor', label: 'Contractor', icon: '🔧' },
  { value: 'tranportor', label: 'Transporter', icon: '🚛' }, 
  { value: 'driver', label: 'Driver', icon: '🚗' }
];

const STATUS_OPTIONS = [
  { value: 'active', icon: '🟢', label: 'Active' },
  { value: 'inactive', icon: '⚫️', label: 'Inactive' },
  { value: 'blacklist', icon: '🔴', label: 'Blacklist' },
  { value: 'pending', icon: '🟡', label: 'Pending' },
];

const PREFIX_OPTIONS = [
  { value: '', label: 'Select Prefix' },
  { value: 'mr.', label: 'Mr.' }, 
  { value: 'mrs.', label: 'Mrs.' },
  { value: 'miss', label: 'Miss' },
  { value: 'mx.', label: 'Mx.' }
];

const EMPLOYEE_LEVELS = [
  { value: '', label: 'Select Level', show: null },
  // Contractor levels
  { value: 'A', label: 'Zone A', show: 'contractor' }, 
  { value: 'B', label: 'Zone B', show: 'contractor' },
  { value: 'C', label: 'Zone C', show: 'contractor' },
  { value: 'PROJECT', label: 'Project/โครงการ', show: 'contractor' },
  { value: 'SHUTDOWN', label: 'ShutDown', show: 'contractor' }, 
  // Employee levels
  { value: 'NML', label: 'NML', show: 'employee' },
  { value: 'FML', label: 'FML', show: 'employee' },
  { value: 'MML', label: 'MML', show: 'employee' },
  { value: 'SML', label: 'SML', show: 'employee' },
  { value: 'TML', label: 'TML', show: 'employee' },
  // Driver/Transporter levels
  { value: 'พนักงานขับ', label: 'พนักงานขับ', show: 'driver' },
  { value: 'ผู้ติดตาม', label: 'ผู้ติดตาม', show: 'driver' },
  { value: 'พนักงานขับ', label: 'พนักงานขับ', show: 'tranportor' },
  { value: 'ผู้ติดตาม', label: 'ผู้ติดตาม', show: 'tranportor' },
];

export default function SingleEmployeeForm({
  formData,
  errors,
  isSubmitting,
  feedback,
  previewImage,
  onInputChange,
  onPhotoChange,
  onSubmit,
  onReset,
  companies,
  selectedCompany,
  onCompanyChange,
  compressionProgress
}: SingleEmployeeFormProps) {

  // Memoized computed values
  const displayImage = useMemo(() => previewImage || formData.profileImageUrl, [previewImage, formData.profileImageUrl]);
  
  const filteredLevels = useMemo(() => {
    const type = formData.employeeType;
    if (!type) return [];
    return EMPLOYEE_LEVELS.filter(level => level.show === type);
  }, [formData.employeeType]);

  // Enhanced photo upload component
  const PhotoUploadSection = useCallback(() => (
    <div className="relative flex items-center justify-center mx-auto overflow-hidden transition-all duration-300 border-2 border-gray-300 border-dashed w-44 h-44 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl group hover:border-indigo-400 hover:shadow-lg">
      {/* Image or placeholder */}
      {displayImage ? (
        <img 
          src={displayImage} 
          alt="Profile Preview" 
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105" 
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-gray-400">
          <FaUser className="w-16 h-16 mb-2" />
          <span className="text-sm font-medium">Upload Photo</span>
        </div>
      )}
      
      {/* Hover overlay */}
      <label 
        htmlFor="photo-upload" 
        className="absolute inset-0 z-10 flex items-center justify-center transition-all duration-300 bg-black bg-opacity-0 cursor-pointer group-hover:bg-opacity-50"
      >
        <div className="flex flex-col items-center text-white transition-opacity duration-300 opacity-0 group-hover:opacity-100">
          <FaCamera className="mb-1 text-2xl" />
          <span className="text-sm font-medium">Change Photo</span>
        </div>
      </label>
      
      <input 
        type="file" 
        id="photo-upload" 
        className="hidden" 
        accept="image/*" 
        onChange={(e) => onPhotoChange(e.target.files?.[0] || null)} 
      />
      
      {/* Compression progress overlay */}
      {compressionProgress !== null && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-white bg-opacity-90 backdrop-blur-sm">
          <div className="w-full max-w-32">
            <div className="flex items-center justify-center mb-2">
              <FaSpinner className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="ml-2 text-sm font-medium text-gray-700">Processing...</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full">
              <div 
                className="h-2 transition-all duration-300 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" 
                style={{ width: `${compressionProgress}%` }}
              ></div>
            </div>
            <div className="mt-1 text-center">
              <span className="text-xs text-gray-600">{compressionProgress}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  ), [displayImage, compressionProgress, onPhotoChange]);

  return (
    <div className="p-4 mx-auto max-w-7xl sm:p-6 lg:p-8">
      {/* Enhanced Feedback Alert */}
      {feedback && <FeedbackAlert feedback={feedback} />}

      {/* Main Layout */}
      <div className="flex flex-col gap-8 lg:flex-row">
        
        {/* Left Column - Enhanced Photo & Basic Info */}
        <div className="self-start w-full lg:w-1/3 lg:sticky lg:top-8">
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
            <PhotoUploadSection />
            
            {/* Remove Photo Button */}
            {displayImage && (
              <div className="mt-4 text-center">
                <button 
                  type="button" 
                  onClick={() => onPhotoChange(null)} 
                  className="flex items-center justify-center gap-2 mx-auto px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <FaTrash className="w-3 h-3" />
                  Remove Photo
                </button>
              </div>
            )}
            
            <hr className="my-6 border-gray-200" />
            
            {/* Employee ID */}
            <InputField
              label="Employee ID"
              icon={<FaIdCard className="w-5 h-5 text-gray-400" />}
              error={errors.empId}
              required
            >
              <input 
                type="text" 
                id="empId" 
                name="empId" 
                value={formData.empId || ''} 
                onChange={onInputChange} 
                className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                  errors.empId ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Enter employee ID"
              />
            </InputField>

            {/* Status */}
            <InputField label="Status" className="mt-6">
              <select 
                id="status" 
                name="status" 
                value={formData.status || 'active'} 
                onChange={onInputChange} 
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </InputField>
          </div>
        </div>

        {/* Right Column - Form Fields */}
        <div className="w-full lg:w-2/3">
          <form onSubmit={onSubmit} className="space-y-8">
            
            {/* Basic Information Section */}
            <SectionCard title="Basic Information" icon={<FaUser className="text-indigo-600" />}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
                
                {/* ID Card - Full width */}
                <InputField
                  label="ID Card Number"
                  icon={<FaIdCard className="w-5 h-5 text-gray-400" />}
                  error={errors.idCard}
                  required
                  className="md:col-span-6"
                >
                  <input
                    type="text"
                    id="idCard"
                    name="idCard"
                    value={formatIdCard(formData.idCard || '')}
                    onChange={onInputChange}
                    className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                      errors.idCard ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    maxLength={17}
                    placeholder="1-2345-67890-12-3"
                  />
                </InputField>
                
                {/* Name fields */}
                <InputField label="Prefix" className="md:col-span-2">
                  <select 
                    id="prefix" 
                    name="prefix" 
                    value={formData.prefix || ''} 
                    onChange={onInputChange} 
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
                  >
                    {PREFIX_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </InputField>
                
                <InputField label="First Name" error={errors.firstName} required className="md:col-span-2">
                  <input 
                    type="text" 
                    id="firstName" 
                    name="firstName" 
                    value={formData.firstName || ''} 
                    onChange={onInputChange} 
                    className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    placeholder="Enter first name"
                  />
                </InputField>
                
                <InputField label="Last Name" error={errors.lastName} required className="md:col-span-2">
                  <input 
                    type="text" 
                    id="lastName" 
                    name="lastName" 
                    value={formData.lastName || ''} 
                    onChange={onInputChange} 
                    className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    placeholder="Enter last name"
                  />
                </InputField>
                
                {/* Display name and nickname */}
                <InputField label="Local Name or Display" className="md:col-span-3">
                  <input 
                    type="text" 
                    id="displayName" 
                    name="displayName" 
                    value={formData.displayName || ''} 
                    onChange={onInputChange} 
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
                    placeholder="Enter display name"
                  />
                </InputField>
                
                <InputField label="UserName or NickName" className="md:col-span-3">
                  <input 
                    type="text" 
                    id="nickname" 
                    name="nickname" 
                    value={formData.nickname || ''} 
                    onChange={onInputChange} 
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
                    placeholder="Enter nickname"
                  />
                </InputField>
              </div>
            </SectionCard>

            {/* Contact Information Section */}
            <SectionCard title="Contact Information" icon={<FaEnvelope className="text-indigo-600" />}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                
                <InputField
                  label="Email"
                  icon={<FaEnvelope className="w-5 h-5 text-gray-400" />}
                  error={errors.email}
                >
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    value={formData.email || ''} 
                    onChange={onInputChange} 
                    className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                      errors.email ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    placeholder="example@email.com"
                  />
                </InputField>
                
                <InputField
                  label="Phone Number"
                  icon={<FaPhone className="w-5 h-5 text-gray-400" />}
                >
                  <input 
                    type="tel" 
                    id="phoneNumber" 
                    name="phoneNumber" 
                    value={formData.phoneNumber || ''} 
                    onChange={onInputChange} 
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
                    placeholder="081-234-5678"
                  />
                </InputField>
                
                <InputField
                  label="Address"
                  icon={<FaMapMarkerAlt className="w-5 h-5 text-gray-400" />}
                  className="md:col-span-2"
                >
                  <textarea 
                    id="address" 
                    name="address" 
                    value={formData.address || ''} 
                    onChange={onInputChange} 
                    rows={4} 
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors resize-none"
                    placeholder="Enter address details..."
                  />
                </InputField>
              </div>
            </SectionCard>

            {/* Work Information Section */}
            <SectionCard title="Work Information" icon={<FaBriefcase className="text-indigo-600" />}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                
                <InputField
                  label="Company"
                  icon={<FaBuilding className="w-5 h-5 text-gray-400" />}
                  error={errors.company}
                  required
                >
                  <div className="pl-10">
                    <SearchableSelect
                      options={companies}
                      value={selectedCompany} 
                      onChange={onCompanyChange} 
                      placeholder="Search for a company..."
                    />
                  </div>
                </InputField>

                <InputField
                  label="Position"
                  icon={<FaUserTie className="w-5 h-5 text-gray-400" />}
                >
                  <input 
                    type="text" 
                    id="position" 
                    name="position" 
                    value={formData.position || ''} 
                    onChange={onInputChange} 
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
                    placeholder="Enter position"
                  />
                </InputField>
                
                <InputField label="Department">
                  <input 
                    type="text" 
                    id="department" 
                    name="department" 
                    value={formData.department || ''} 
                    onChange={onInputChange} 
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
                    placeholder="Enter department"
                  />
                </InputField>
                
                <InputField label="Plant Site ID">
                  <input 
                    type="text" 
                    id="plantId" 
                    name="plantId" 
                    value={formData.plantId || ''} 
                    onChange={onInputChange} 
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
                    placeholder="Enter plant site ID"
                  />
                </InputField>
                
                <InputField label="Employee Type">
                  <select 
                    id="employeeType" 
                    name="employeeType" 
                    value={formData.employeeType || 'employee'} 
                    onChange={onInputChange} 
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
                  >
                    {EMPLOYEE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </InputField>
                
                <InputField label="Level / Zone">
                  <select 
                    id="level" 
                    name="level" 
                    value={formData.level || ''} 
                    onChange={onInputChange} 
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
                    disabled={!formData.employeeType}
                  >
                    {filteredLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </InputField>
              </div>
            </SectionCard>
            
            {/* Dates Section */}
            <SectionCard title="Important Dates" icon={<FaCalendarAlt className="text-indigo-600" />}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                
                <InputField label="Date of Birth">
                  <input 
                    type="date" 
                    id="dateOfBirth" 
                    name="dateOfBirth" 
                    value={formatDate(formData.dateOfBirth)} 
                    onChange={onInputChange} 
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
                  />
                </InputField>
                
                <InputField label="Start Date">
                  <input 
                    type="date" 
                    id="startDate" 
                    name="startDate" 
                    value={formatDate(formData.startDate)} 
                    onChange={onInputChange} 
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
                  />
                </InputField>
                
                <InputField label="Card Expiry Date">
                  <input 
                    type="date" 
                    id="cardExpiryDate" 
                    name="cardExpiryDate" 
                    value={formatDate(formData.cardExpiryDate)} 
                    onChange={onInputChange} 
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
                  />
                </InputField>
              </div>
            </SectionCard>

            {/* Enhanced Action Buttons */}
            <div className="flex justify-end pt-6 space-x-4 border-t border-gray-200">
              <button 
                type="button" 
                onClick={onReset} 
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center gap-2"
              >
                <FaTrash className="w-4 h-4" />
                Reset Form
              </button>
              
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave className="w-4 h-4" />
                    Save Employee
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}