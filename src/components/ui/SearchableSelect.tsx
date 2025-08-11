// src/components/ui/SearchableSelect.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { Check, ChevronDown, X, Search, AlertCircle } from 'lucide-react';
import type { SearchableSelectProps, OptionType } from '../../types';

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select an option...",
  isDisabled = false,
  isLoading = false,
  error
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Optimized filtering with useMemo and debouncing
  const filteredOptions = useMemo(() => {
    if (query === '') return options;
    
    const lowercaseQuery = query.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(lowercaseQuery) ||
      option.value.toLowerCase().includes(lowercaseQuery)
    );
  }, [options, query]);

  const hasError = Boolean(error);
  const isEmpty = options.length === 0;

  // Clear query when value changes externally
  useEffect(() => {
    if (value) {
      setQuery('');
    }
  }, [value]);

  // Optimized event handlers
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  }, [onChange]);

  const handleQueryChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const getDisplayValue = useCallback((option: OptionType | null): string => {
    return option?.label || '';
  }, []);

  // Optimized CSS classes
  const containerClasses = useMemo(() => `
    relative w-full
    ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
  `, [isDisabled]);

  const inputContainerClasses = useMemo(() => `
    relative w-full overflow-hidden text-left bg-white border rounded-lg 
    transition-colors duration-200 ease-in-out
    ${hasError 
      ? 'border-red-500 ring-1 ring-red-500' 
      : isFocused 
        ? 'border-blue-500 ring-2 ring-blue-200' 
        : 'border-gray-300 hover:border-gray-400'
    }
    ${isDisabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-default'}
  `, [hasError, isFocused, isDisabled]);

  const inputClasses = useMemo(() => `
    w-full py-3 pl-4 pr-12 text-sm leading-5 text-gray-900 
    border-none bg-transparent focus:ring-0 focus:outline-none
    ${isDisabled ? 'cursor-not-allowed' : ''}
    placeholder:text-gray-400
  `, [isDisabled]);

  const buttonClasses = useMemo(() => `
    absolute inset-y-0 right-0 flex items-center pr-3
    ${isDisabled ? 'pointer-events-none' : 'pointer-events-auto'}
  `, [isDisabled]);

  // Optimized option rendering
  const renderOption = useCallback((option: OptionType) => (
    <Combobox.Option
      key={option.value}
      value={option}
      className={({ active, selected }) => `
        relative cursor-pointer select-none py-3 pl-4 pr-10 transition-colors
        ${active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
        ${selected ? 'bg-blue-100' : ''}
      `}
    >
      {({ selected, active }) => (
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1">
            <span className={`block truncate ${
              selected ? 'font-semibold' : 'font-normal'
            }`}>
              {option.label}
            </span>
            
            {option.value !== option.label && (
              <span className="ml-2 text-xs text-gray-500 truncate">
                ({option.value})
              </span>
            )}
          </div>
          
          {selected && (
            <span className={`flex items-center ${
              active ? 'text-blue-600' : 'text-blue-500'
            }`}>
              <Check className="w-4 h-4" />
            </span>
          )}
        </div>
      )}
    </Combobox.Option>
  ), []);

  // Loading component
  const LoadingState = useMemo(() => (
    <div className="flex items-center justify-center px-4 py-3 text-gray-500">
      <div className="w-4 h-4 mr-2 border-2 border-gray-300 rounded-full animate-spin border-t-blue-600" />
      Loading...
    </div>
  ), []);

  // Empty state component
  const EmptyState = useMemo(() => (
    <div className="flex items-center px-4 py-3 text-gray-500">
      <AlertCircle className="w-4 h-4 mr-2" />
      No options available
    </div>
  ), []);

  // No results component
  const NoResultsState = useMemo(() => (
    <div className="flex items-center px-4 py-3 text-gray-500">
      <Search className="w-4 h-4 mr-2" />
      No results found for "{query}"
    </div>
  ), [query]);

  // Results header component
  const ResultsHeader = useMemo(() => {
    if (!query) return null;
    return (
      <div className="px-4 py-2 text-xs font-medium tracking-wide text-gray-400 uppercase border-b border-gray-100">
        {filteredOptions.length} result{filteredOptions.length !== 1 ? 's' : ''}
      </div>
    );
  }, [query, filteredOptions.length]);

  return (
    <div className={containerClasses}>
      <Combobox
        value={value}
        onChange={onChange}
        disabled={isDisabled}
      >
        <div className={inputContainerClasses}>
          <Combobox.Input
            className={inputClasses}
            displayValue={getDisplayValue}
            onChange={handleQueryChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={value ? '' : placeholder}
            autoComplete="off"
          />
          
          <div className={buttonClasses}>
            {/* Clear button */}
            {value && !isDisabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 mr-1 text-gray-400 rounded-full hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                tabIndex={-1}
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            {/* Dropdown arrow */}
            <Combobox.Button className="flex items-center pointer-events-auto">
              <ChevronDown 
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                  isFocused ? 'rotate-180' : ''
                }`} 
              />
            </Combobox.Button>
          </div>
        </div>

        {/* Dropdown Options */}
        <Transition
          as={React.Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery('')}
        >
          <Combobox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {isLoading ? (
              LoadingState
            ) : isEmpty ? (
              EmptyState
            ) : filteredOptions.length === 0 ? (
              NoResultsState
            ) : (
              <div>
                {ResultsHeader}
                {filteredOptions.map(renderOption)}
              </div>
            )}
          </Combobox.Options>
        </Transition>
      </Combobox>

      {/* Error Message */}
      {error && (
        <div className="flex items-center mt-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Helper Text */}
      {!error && options.length > 10 && (
        <div className="mt-1 text-xs text-gray-500">
          Type to search through {options.length} options
        </div>
      )}
    </div>
  );
};