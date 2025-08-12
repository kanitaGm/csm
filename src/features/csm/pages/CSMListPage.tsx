import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Building2, RefreshCw } from 'lucide-react';
import type { CSMVendor, CSMAssessmentSummary } from '../../../types/csm';
import { useCSMData } from '../../../hooks/useCSMData';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useVirtualList } from '../../../hooks/useVirtualList';

interface CSMFilterOptions {
  readonly search: string;
  readonly category: string;
  readonly assessmentStatus: 'all' | 'completed' | 'in-progress' | 'not-assessed' | 'expired';
  readonly riskLevel: string;
}

const OptimizedCSMListPage: React.FC = () => {
  const [filters, setFilters] = useState<CSMFilterOptions>({
    search: '',
    category: 'all',
    assessmentStatus: 'all',
    riskLevel: 'all'
  });

  const {
    vendors,
    assessmentSummaries,
    loading,
    error,
    loadData,
    refreshData
  } = useCSMData('current-company-id'); // Replace with actual company ID

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  // Memoized filtered data
  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor: CSMVendor) => {
      const matchesSearch = debouncedSearch === '' || 
        vendor.vdName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        vendor.vdCode.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesCategory = filters.category === 'all' || vendor.category === filters.category;
      
      // Add other filter logic here
      
      return matchesSearch && matchesCategory;
    });
  }, [vendors, debouncedSearch, filters.category]);

  // Virtual scrolling for large lists
  const { containerRef, visibleItems } = useVirtualList({
    items: filteredVendors,
    itemHeight: 120,
    containerHeight: 600
  });

  // Event handlers with useCallback
  const handleSearchChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  }, []);

  const handleRefresh = useCallback(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="p-6 bg-white border rounded-lg shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ vendor หรือรหัส..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          พบ {filteredVendors.length} รายการ จากทั้งหมด {vendors.length} vendors
        </div>
      </div>

      {/* Virtual Scrolled List */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div ref={containerRef} className="overflow-auto h-96">
          {visibleItems.map(({ item: vendor, index }) => (
            <VendorCard
              key={vendor.vdCode}
              vendor={vendor}
              summary={assessmentSummaries.find(s => s.vdCode === vendor.vdCode)}
              className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Optimized VendorCard component
interface VendorCardProps {
  readonly vendor: CSMVendor;
  readonly summary?: CSMAssessmentSummary;
  readonly className?: string;
}

const VendorCard: React.FC<VendorCardProps> = React.memo(({ 
  vendor, 
  summary, 
  className = '' 
}) => {
  return (
    <div className={`p-4 border-b hover:bg-blue-50 cursor-pointer transition-colors ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-gray-400" />
            <div>
              <h3 className="font-medium text-gray-900">{vendor.vdName}</h3>
              <p className="text-sm text-gray-500">รหัส: {vendor.vdCode}</p>
            </div>
          </div>
        </div>
        
        {summary && (
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">
              {summary.avgScore.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(summary.lastAssessmentDate).toLocaleDateString('th-TH')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

VendorCard.displayName = 'VendorCard';

export default OptimizedCSMListPage;