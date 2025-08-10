// src/components/forms/FormComponents.tsx - Part 1: Basic Components
import React, { useState, useEffect, useMemo } from 'react';
import {Search, FileText, Plus, RefreshCw, Grid, List, Table, 
  Eye, Edit, Trash2, Copy, Download, Archive, Share2, 
  Star, MoreVertical, Clock, Users, AlertCircle, Tag,  Heart,
} from 'lucide-react';
import type { FormDoc } from '../../../types';
import { safeFormatDate, calculateFormScore, getFormStatusColor } from '../../../hooks/formHooks';
//import { SearchableSelect } from '../../../components/ui/SearchableSelect';

// =================== BASIC LOADING COMPONENTS ===================
export const LoadingSpinner = React.memo(() => (
  <div className="flex items-center justify-center min-h-96">
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping"></div>
        <div className="relative w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
      </div>
      <p className="text-lg font-medium text-gray-700">กำลังโหลดข้อมูล...</p>
      <p className="mt-1 text-sm text-gray-500">กรุณารอสักครู่</p>
    </div>
  </div>
));
LoadingSpinner.displayName = 'LoadingSpinner';

export const SkeletonCard = React.memo(() => (
  <div className="p-6 bg-white border border-gray-200 animate-pulse rounded-xl">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
      <div className="flex-1">
        <div className="w-3/4 h-4 mb-2 bg-gray-200 rounded"></div>
        <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
      </div>
    </div>
    <div className="mb-4 space-y-2">
      <div className="w-full h-3 bg-gray-200 rounded"></div>
      <div className="w-2/3 h-3 bg-gray-200 rounded"></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="p-2 bg-gray-100 rounded">
        <div className="w-8 h-6 mx-auto mb-1 bg-gray-200 rounded"></div>
        <div className="w-12 h-3 mx-auto bg-gray-200 rounded"></div>
      </div>
      <div className="p-2 bg-gray-100 rounded">
        <div className="w-8 h-6 mx-auto mb-1 bg-gray-200 rounded"></div>
        <div className="w-12 h-3 mx-auto bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
));
SkeletonCard.displayName = 'SkeletonCard';

// =================== EMPTY STATE COMPONENT ===================
export const EmptyState = React.memo<{ 
  searchTerm: string; 
  onCreateForm: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}>(({ searchTerm, onCreateForm, hasFilters, onClearFilters }) => (
  <div className="py-16 text-center">
    <div className="relative w-32 h-32 mx-auto mb-8">
      <div className="absolute inset-0 rounded-full opacity-50 animate-pulse bg-gradient-to-br from-blue-100 to-indigo-100"></div>
      <div className="relative flex items-center justify-center w-full h-full">
        <FileText className="w-16 h-16 text-gray-300" />
        {!searchTerm && !hasFilters && (
          <div className="absolute flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full shadow-lg -right-2 -top-2 animate-bounce">
            <Plus className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
    </div>
    
    <div className="max-w-md mx-auto space-y-4">
      <h3 className="text-2xl font-bold text-gray-900">
        {searchTerm 
          ? '🔍 ไม่พบแบบฟอร์ม' 
          : hasFilters 
            ? '🎯 ไม่มีผลลัพธ์'
            : '📝 เริ่มต้นสร้างฟอร์ม'}
      </h3>
      
      <p className="leading-relaxed text-gray-600">
        {searchTerm 
          ? `ไม่พบแบบฟอร์มที่ตรงกับ "${searchTerm}" ลองเปลี่ยนคำค้นหาหรือตรวจสอบการสะกด` 
          : hasFilters
            ? 'ลองปรับเปลี่ยนเงื่อนไขการกรองข้อมูลเพื่อดูผลลัพธ์เพิ่มเติม'
            : 'สร้างแบบฟอร์มแรกของคุณเพื่อเริ่มต้นจัดการและเก็บข้อมูลอย่างเป็นระบบ'
        }
      </p>
    </div>
    
    <div className="flex flex-col justify-center gap-4 mt-8 sm:flex-row">
      {(searchTerm || hasFilters) && (
        <button
          onClick={onClearFilters}
          className="inline-flex items-center gap-2 px-6 py-3 text-gray-700 transition-all duration-200 border border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          ล้างตัวกรองและค้นหาใหม่
        </button>
      )}
      
      <button
        onClick={onCreateForm}
        className="inline-flex items-center gap-2 px-8 py-3 text-white transition-all duration-200 transform rounded-lg shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <Plus className="w-5 h-5" />
        สร้างแบบฟอร์มใหม่
      </button>
    </div>
  </div>
));
EmptyState.displayName = 'EmptyState';

// =================== SEARCH COMPONENT ===================
export const EnhancedSearchBar = React.memo<{
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  loading?: boolean;
  placeholder?: string;
}>(({ value, onChange, suggestions, loading = false, placeholder = "ค้นหาฟอร์ม, แท็ก, หรือผู้สร้าง..." }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const filteredSuggestions = useMemo(() => {
    if (!value || !suggestions.length) return [];
    return suggestions
      .filter(s => s.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 8);
  }, [value, suggestions]);

  useEffect(() => {
    setShowSuggestions(filteredSuggestions.length > 0 && value.length > 0);
    setFocusedIndex(-1);
  }, [filteredSuggestions.length, value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0) {
          onChange(filteredSuggestions[focusedIndex]);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setFocusedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative flex-1 max-w-2xl">
      <div className="relative">
        <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-4 top-1/2" />
        {loading && (
          <div className="absolute w-4 h-4 transform -translate-y-1/2 border-2 border-gray-300 rounded-full right-4 top-1/2 animate-spin border-t-blue-600" />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowSuggestions(filteredSuggestions.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full py-4 pl-12 pr-12 text-lg transition-all duration-200 border border-gray-300 shadow-sm rounded-xl bg-white/80 backdrop-blur-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {showSuggestions && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-xl top-full">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b bg-gray-50">
            💡 คำแนะนำ ({filteredSuggestions.length} รายการ)
          </div>
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => {
                onChange(suggestion);
                setShowSuggestions(false);
              }}
              className={`w-full border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
                index === focusedIndex 
                  ? 'bg-blue-50 text-blue-900' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">{suggestion}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
EnhancedSearchBar.displayName = 'EnhancedSearchBar';

// =================== STATS COMPONENT ===================

// Moved StatCard outside of QuickStats for better performance
const StatCard = React.memo(({ title, value, color, icon, loading }: {
  title: string;
  value: string | number;
  color: string;
  icon: string;
  loading: boolean;
}) => (
  <div className={`relative rounded-xl bg-gradient-to-br p-4 shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <div className="text-2xl font-bold text-white">{loading ? '⏳' : value}</div>
        <div className="text-sm text-white/80">{title}</div>
      </div>
      <div className="text-3xl opacity-20">
        {icon}
      </div>
    </div>
    {!loading && (
      <div className="absolute w-2 h-2 bg-white rounded-full -top-0 -right-0 animate-ping opacity-30"></div>
    )}
  </div>
));
StatCard.displayName = 'StatCard';

export const QuickStats = React.memo<{ 
  forms: FormDoc[];
  loading?: boolean;
}>(({ forms, loading = false }) => {
  const stats = useMemo(() => {
    if (loading || !forms.length) {
      return {
        total: 0,
        active: 0,
        published: 0,
        totalSubmissions: 0,
        avgConversion: 0
      };
    }

    return {
      total: forms.length,
      active: forms.filter(f => f.isActive).length,
      published: forms.filter(f => f.status === 'published').length,
      totalSubmissions: forms.reduce((sum, f) => sum + (f.analytics?.submitCount || 0), 0),
      avgConversion: forms.length > 0 
        ? forms.reduce((sum, f) => sum + (f.analytics?.conversionRate || 0), 0) / forms.length 
        : 0
    };
  }, [forms, loading]);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard
        title="ฟอร์มทั้งหมด"
        value={stats.total}
        color="from-blue-500 to-blue-600"
        icon="📊"
        loading={loading}
      />
      <StatCard
        title="ใช้งานอยู่"
        value={stats.active}
        color="from-green-500 to-green-600"
        icon="✅"
        loading={loading}
      />
      <StatCard
        title="เผยแพร่แล้ว"
        value={stats.published}
        color="from-purple-500 to-purple-600"
        icon="📢"
        loading={loading}
      />
      <StatCard
        title="การส่งทั้งหมด"
        value={stats.totalSubmissions}
        color="from-orange-500 to-orange-600"
        icon="📤"
        loading={loading}
      />
      <StatCard
        title="อัตราการตอบ"
        value={`${stats.avgConversion.toFixed(1)}%`}
        color="from-indigo-500 to-indigo-600"
        icon="📈"
        loading={loading}
      />
    </div>
  );
});
QuickStats.displayName = 'QuickStats';

// =================== VIEW MODE TOGGLE ===================
export const ViewModeToggle = React.memo<{
  viewMode: 'grid' | 'list' | 'table';
  onChange: (mode: 'grid' | 'list' | 'table') => void;
}>(({ viewMode, onChange }) => (
  <div className="flex items-center p-1 bg-gray-100 shadow-inner rounded-xl">
    {[
      { mode: 'grid' as const, icon: Grid, label: 'กริด', desc: 'แสดงแบบการ์ด' },
      { mode: 'list' as const, icon: List, label: 'รายการ', desc: 'แสดงแบบรายการ' },
      { mode: 'table' as const, icon: Table, label: 'ตาราง', desc: 'แสดงแบบตาราง' }
    ].map(({ mode, icon: Icon, label, desc }) => (
      <button
        key={mode}
        onClick={() => onChange(mode)}
        className={`relative rounded-lg p-3 transition-all duration-200 ${
          viewMode === mode 
            ? 'scale-105 transform bg-white text-blue-600 shadow-md' 
            : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
        }`}
        title={desc}
      >
        <Icon className="w-4 h-4" />
        <span className="sr-only">{label}</span>
        {viewMode === mode && (
          <div className="absolute w-1 h-1 transform -translate-x-1/2 bg-blue-600 rounded-full -bottom-1 left-1/2"></div>
        )}
      </button>
    ))}
  </div>
));
ViewModeToggle.displayName = 'ViewModeToggle';

// =================== ENHANCED FORM CARD ===================

// Moved ActionButton outside of EnhancedFormCard for better performance
const ActionButton = React.memo(({ 
  onClick, 
  icon: Icon, 
  label, 
  color = 'gray',
  dangerous = false 
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color?: 'gray' | 'blue' | 'green' | 'red' | 'purple' | 'orange';
  dangerous?: boolean;
}) => {
  const colorClasses = {
    gray: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
    blue: 'text-blue-500 hover:text-blue-700 hover:bg-blue-50',
    green: 'text-green-500 hover:text-green-700 hover:bg-green-50',
    red: 'text-red-500 hover:text-red-700 hover:bg-red-50',
    purple: 'text-purple-500 hover:text-purple-700 hover:bg-purple-50',
    orange: 'text-orange-500 hover:text-orange-700 hover:bg-orange-50'
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`group relative rounded-lg p-2 transition-all duration-200 ${colorClasses[color]} ${
        dangerous ? 'hover:scale-110' : 'hover:scale-105'
      }`}
      title={label}
    >
      <Icon className="w-4 h-4" />
      {dangerous && (
        <div className="absolute inset-0 transition-opacity bg-red-500 rounded-lg opacity-0 group-hover:opacity-10"></div>
      )}
    </button>
  );
});
ActionButton.displayName = 'ActionButton';

export const EnhancedFormCard = React.memo<{
  form: FormDoc;
  viewMode: 'grid' | 'list';
  onEdit: (form: FormDoc) => void;
  onDelete: (form: FormDoc) => void;
  onPreview: (form: FormDoc) => void;
  onDuplicate: (form: FormDoc) => void;
  onArchive: (form: FormDoc) => void;
  onExport: (form: FormDoc) => void;
  onShare?: (form: FormDoc) => void;
}>(({ 
  form, 
  viewMode, 
  onEdit, 
  onDelete, 
  onPreview, 
  onDuplicate, 
  onArchive, 
  onExport, 
  onShare 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // ใช้ useMemo เพื่อคำนวณ stats เพียงครั้งเดียวเมื่อ form มีการเปลี่ยนแปลง
  const stats = useMemo(() => ({
    required: form.fields?.filter(f => f.required).length || 0,
    attachable: form.fields?.filter(f => f.allowAttach).length || 0,
    totalFields: form.fields?.length || 0,
    submissions: form.analytics?.submitCount || 0,
    conversionRate: form.analytics?.conversionRate || 0,
    viewCount: form.analytics?.viewCount || 0,
    score: calculateFormScore(form)
  }), [form]);

  // ใช้ useMemo เพื่อให้ค่าวันที่ถูก format เพียงครั้งเดียว
  const lastUpdated = useMemo(() => safeFormatDate(form.updatedAt), [form.updatedAt]);
  //const createdDate = useMemo(() => safeFormatDate(form.createdAt), [form.createdAt]);
  const statusColorClass = getFormStatusColor(form.status);

  // LIST VIEW
  if (viewMode === 'list') {
    return (
      <div 
        className="p-4 transition-all duration-300 bg-white border border-gray-200 cursor-pointer group rounded-xl hover:border-blue-300 hover:shadow-lg"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onPreview(form)}
      >
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center flex-1 gap-4">
            <div className="relative flex-shrink-0">
              <div className="flex items-center justify-center transition-all duration-300 h-14 w-14 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200">
                <FileText className="text-blue-600 h-7 w-7" />
              </div>
              {form.analytics?.submitCount && form.analytics.submitCount > 10 && (
                <div className="absolute w-3 h-3 bg-green-500 rounded-full -top-1 -right-1 animate-pulse"></div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-bold text-gray-900 truncate transition-colors group-hover:text-blue-600">
                  {form.formTitle}
                </h3>
                <span className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-full">
                  {form.formCode}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusColorClass}`}>
                  {form.status}
                </span>
                {isFavorite && (
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                )}
              </div>
              
              <p className="mb-2 text-sm text-gray-600 truncate">
                {form.formDescription || 'ไม่มีรายละเอียด'}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  อัปเดต: {lastUpdated}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {form.createdBy.split('@')[0]}
                </span>
                {form.tags && form.tags.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {form.tags[0]} {form.tags.length > 1 && `+${form.tags.length - 1}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{stats.totalFields}</div>
              <div className="text-xs text-gray-500">คำถาม</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{stats.submissions}</div>
              <div className="text-xs text-gray-500">การส่ง</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{stats.conversionRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">อัตราตอบ</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">{stats.score}</div>
              <div className="text-xs text-gray-500">คะแนน</div>
            </div>
          </div>

          {/* Actions Section */}
          <div className={`flex items-center gap-1 transition-all duration-300 ${
            isHovered ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
          }`}>
            <ActionButton 
              onClick={() => setIsFavorite(!isFavorite)} 
              icon={isFavorite ? Heart : Star} 
              label={isFavorite ? "ลบจากรายการโปรด" : "เพิ่มในรายการโปรด"}
              color={isFavorite ? "red" : "orange"} 
            />
            <ActionButton onClick={() => onPreview(form)} icon={Eye} label="ดูตัวอย่าง" color="gray" />
            <ActionButton onClick={() => onEdit(form)} icon={Edit} label="แก้ไข" color="blue" />
            <ActionButton onClick={() => onDuplicate(form)} icon={Copy} label="ทำสำเนา" color="green" />
            {onShare && (
              <ActionButton onClick={() => onShare(form)} icon={Share2} label="แชร์" color="purple" />
            )}
            <ActionButton onClick={() => onExport(form)} icon={Download} label="ส่งออก" color="purple" />
            <ActionButton onClick={() => onArchive(form)} icon={Archive} label="เก็บถาวร" color="gray" />
            <ActionButton onClick={() => onDelete(form)} icon={Trash2} label="ลบ" color="red" dangerous />
          </div>
        </div>
      </div>
    );
  }

  // GRID VIEW
  return (
    <div 
      className="relative transition-all duration-300 transform bg-white border border-gray-200 shadow-sm cursor-pointer rounded-xl hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl group"
      onClick={() => onPreview(form)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 transition-all duration-300 rounded-xl bg-gradient-to-br from-blue-50/0 to-indigo-50/0 group-hover:from-blue-50/30 group-hover:to-indigo-50/30"></div>
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center flex-1 gap-3">
            <div className="relative flex items-center justify-center w-12 h-12 transition-all duration-300 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200">
              <FileText className="w-6 h-6 text-blue-600" />
              {stats.score > 80 && (
                <div className="absolute w-3 h-3 bg-green-500 rounded-full -top-1 -right-1"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-1 text-sm font-medium text-blue-600 rounded bg-blue-50">
                  {form.formCode}
                </span>
                <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusColorClass}`}>
                  {form.status}
                </span>
                {isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
              </div>
              <h3 className="font-bold text-gray-900 transition-colors line-clamp-2 group-hover:text-blue-600">
                {form.formTitle}
              </h3>
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
              className={`rounded-lg p-2 text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-600 ${
                showActions ? 'bg-gray-100 text-gray-600' : ''
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 z-20 w-56 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl top-full">
                <div className="p-2 space-y-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsFavorite(!isFavorite); setShowActions(false); }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isFavorite ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {isFavorite ? <Heart className="w-4 h-4 fill-current" /> : <Star className="w-4 h-4" />}
                    {isFavorite ? 'ลบจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
                  </button>
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); onPreview(form); setShowActions(false); }}
                    className="flex items-center w-full gap-3 px-3 py-2 text-sm text-gray-700 transition-colors rounded-md hover:bg-gray-100"
                  >
                    <Eye className="w-4 h-4" />
                    ดูตัวอย่าง
                  </button>
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(form); setShowActions(false); }}
                    className="flex items-center w-full gap-3 px-3 py-2 text-sm text-gray-700 transition-colors rounded-md hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4" />
                    แก้ไข
                  </button>
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicate(form); setShowActions(false); }}
                    className="flex items-center w-full gap-3 px-3 py-2 text-sm text-gray-700 transition-colors rounded-md hover:bg-gray-100"
                  >
                    <Copy className="w-4 h-4" />
                    ทำสำเนา
                  </button>
                  
                  {onShare && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onShare(form); setShowActions(false); }}
                      className="flex items-center w-full gap-3 px-3 py-2 text-sm text-gray-700 transition-colors rounded-md hover:bg-gray-100"
                    >
                      <Share2 className="w-4 h-4" />
                      แชร์
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); onExport(form); setShowActions(false); }}
                    className="flex items-center w-full gap-3 px-3 py-2 text-sm text-gray-700 transition-colors rounded-md hover:bg-gray-100"
                  >
                    <Download className="w-4 h-4" />
                    ส่งออก
                  </button>
                  
                  <hr className="my-1" />
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); onArchive(form); setShowActions(false); }}
                    className="flex items-center w-full gap-3 px-3 py-2 text-sm text-gray-700 transition-colors rounded-md hover:bg-gray-100"
                  >
                    <Archive className="w-4 h-4" />
                    เก็บถาวร
                  </button>
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(form); setShowActions(false); }}
                    className="flex items-center w-full gap-3 px-3 py-2 text-sm text-red-600 transition-colors rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    ลบ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {form.formDescription && (
          <p className="mb-4 text-sm leading-relaxed text-gray-600 line-clamp-2">
            {form.formDescription}
          </p>
        )}

        {/* Tags */}
        {form.tags && form.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {form.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-medium text-gray-600 transition-colors bg-gray-100 rounded-full hover:bg-gray-200"
              >
                #{tag}
              </span>
            ))}
            {form.tags.length > 3 && (
              <span className="px-2 py-1 text-xs font-medium text-gray-500 rounded-full bg-gray-50">
                +{form.tags.length - 3} แท็ก
              </span>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 p-4 mb-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{stats.totalFields}</div>
            <div className="text-xs text-gray-600">คำถาม</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{stats.required}</div>
            <div className="text-xs text-gray-600">จำเป็น</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600">{stats.submissions}</div>
            <div className="text-xs text-gray-600">การส่ง</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-600">{stats.conversionRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-600">อัตราตอบ</div>
          </div>
        </div>

        {/* Performance Indicator */}
        {stats.score > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">ประสิทธิภาพ</span>
              <span className={`text-sm font-bold ${
                stats.score >= 80 ? 'text-green-600' :
                stats.score >= 60 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {stats.score}/100
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  stats.score >= 80 ? 'bg-green-500' :
                  stats.score >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(stats.score, 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 text-xs text-gray-500 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>อัปเดต: {lastUpdated}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{form.createdBy?.split('@')[0] || 'ไม่ระบุ'}</span>
            </div>
            {stats.viewCount > 0 && (
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{stats.viewCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hover Effect Indicator */}
        <div className={`absolute bottom-0 left-0 right-0 h-1 transform rounded-b-xl bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ${
          isHovered ? 'scale-x-100' : 'scale-x-0'
        }`}></div>
      </div>
    </div>
  );
});
EnhancedFormCard.displayName = 'EnhancedFormCard';

// =================== FORM PREVIEW COMPONENT ===================
export const QuickFormPreview = React.memo<{
  form: FormDoc;
  onClose: () => void;
  onEdit: (form: FormDoc) => void;
}>(({ form, onClose, onEdit }) => {
  const lastUpdated = useMemo(() => safeFormatDate(form.updatedAt), [form.updatedAt]);
  const stats = useMemo(() => ({
    totalFields: form.fields?.length || 0,
    requiredFields: form.fields?.filter(f => f.required).length || 0,
    attachableFields: form.fields?.filter(f => f.allowAttach).length || 0,
    totalScore: form.fields?.reduce((sum, f) => sum + (parseFloat(f.fScore || '0') * 5), 0) || 0
  }), [form.fields]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">ตัวอย่างแบบฟอร์ม</h2>
            <p className="text-gray-600">พรีวิวเนื้อหาและโครงสร้าง</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(form)}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 transition-colors border border-blue-200 rounded-lg hover:bg-blue-50"
          >
            <Edit className="w-4 h-4" />
            แก้ไข
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 transition-colors rounded-lg hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Form Info Card */}
      <div className="p-6 border border-blue-200 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="mb-4 text-xl font-bold text-blue-900">{form.formTitle}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-700">🏷️ รหัส:</span>
            <span className="px-3 py-1 text-sm font-medium text-blue-800 bg-blue-200 rounded-full">
              {form.formCode}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-700">📊 สถานะ:</span>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${
              form.isActive ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'
            }`}>
              {form.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-700">📁 หมวดหมู่:</span>
            <span className="capitalize">{form.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-700">🎯 ใช้สำหรับ:</span>
            <span>{form.applicableTo?.join(', ') || 'ไม่ระบุ'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-700">❓ คำถาม:</span>
            <span className="text-lg font-semibold">{stats.totalFields} ข้อ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-700">🕐 อัปเดต:</span>
            <span>{lastUpdated}</span>
          </div>
        </div>
        {form.formDescription && (
          <div className="p-4 mt-4 border border-blue-200 rounded-lg bg-white/50">
            <span className="font-medium text-blue-700">📝 รายละเอียด:</span>
            <p className="mt-2 leading-relaxed text-blue-800">{form.formDescription}</p>
          </div>
        )}
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="p-3 text-center rounded-lg bg-white/70">
            <div className="text-lg font-bold text-blue-600">{stats.totalFields}</div>
            <div className="text-xs text-blue-700">คำถามทั้งหมด</div>
          </div>
          <div className="p-3 text-center rounded-lg bg-white/70">
            <div className="text-lg font-bold text-red-600">{stats.requiredFields}</div>
            <div className="text-xs text-red-700">คำถามจำเป็น</div>
          </div>
          <div className="p-3 text-center rounded-lg bg-white/70">
            <div className="text-lg font-bold text-green-600">{stats.attachableFields}</div>
            <div className="text-xs text-green-700">แนบไฟล์ได้</div>
          </div>
          <div className="p-3 text-center rounded-lg bg-white/70">
            <div className="text-lg font-bold text-purple-600">{stats.totalScore}</div>
            <div className="text-xs text-purple-700">คะแนนรวม</div>
          </div>
        </div>
      </div>
      
      {/* Form Fields Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900">🗂️ รายการคำถาม</h4>
          <div className="text-sm text-gray-600"> ทั้งหมด {stats.totalFields} คำถาม </div>
        </div>
        {form.fields && form.fields.length > 0 ? (
          <div className="space-y-3 overflow-y-auto max-h-96">
            {form.fields.map((field, index) => (
              <div key={field.id || index} className="p-4 transition-shadow bg-white border border-gray-200 rounded-lg hover:shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-blue-500 rounded-full">
                      {field.ckItem}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {field.required && (
                        <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full"> ⭐ จำเป็น </span>
                      )}
                      {field.fScore && (
                        <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full"> 🏆 น้ำหนัก {field.fScore} </span>
                      )}
                      {field.allowAttach && (
                        <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full"> 📎 แนบไฟล์ได้ </span>
                      )}
                      <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full"> 🔧 {field.type} </span>
                    </div>
                  </div>
                </div>
                <h5 className="mb-2 font-medium leading-relaxed text-gray-900">{field.ckQuestion}</h5>
                {field.ckRequirement && (
                  <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                    <p className="text-sm text-blue-800">
                      <strong>📋 เกณฑ์การประเมิน:</strong> {field.ckRequirement}
                    </p>
                  </div>
                )}
                {field.helpText && (
                  <p className="mt-2 text-sm text-gray-600">
                    <strong>💡 คำแนะนำ:</strong> {field.helpText}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h5 className="mb-2 text-lg font-medium text-gray-600">ยังไม่มีคำถาม</h5>
            <p className="mb-4 text-gray-500">แบบฟอร์มนี้ยังไม่มีคำถามใดๆ</p>
            <button onClick={() => onEdit(form)} className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 transition-colors border border-blue-200 rounded-lg hover:bg-blue-50">
              <Edit className="w-4 h-4" />
              เพิ่มคำถาม
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
QuickFormPreview.displayName = 'QuickFormPreview';