// src/components/ui/SearchableSelect.tsx
import React, { useState, useEffect } from 'react';
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

  const filteredOptions = React.useMemo(() => {
    if (query === '') return options;
    
    return options.filter((option) =>
      option.label.toLowerCase().includes(query.toLowerCase()) ||
      option.value.toLowerCase().includes(query.toLowerCase())
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

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  };

  const getDisplayValue = (option: OptionType | null): string => {
    return option?.label || '';
  };

  const containerClasses = `
    relative w-full
    ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
  `;

  const inputContainerClasses = `
    relative w-full overflow-hidden text-left bg-white border rounded-lg 
    transition-colors duration-200 ease-in-out
    ${hasError 
      ? 'border-red-500 ring-1 ring-red-500' 
      : isFocused 
        ? 'border-blue-500 ring-2 ring-blue-200' 
        : 'border-gray-300 hover:border-gray-400'
    }
    ${isDisabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-default'}
  `;

  const inputClasses = `
    w-full py-3 pl-4 pr-12 text-sm leading-5 text-gray-900 
    border-none bg-transparent focus:ring-0 focus:outline-none
    ${isDisabled ? 'cursor-not-allowed' : ''}
    placeholder:text-gray-400
  `;

  const buttonClasses = `
    absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none
    ${isDisabled ? 'text-gray-400' : 'text-gray-500'}
  `;

  return (
    <div className={containerClasses}>
      <Combobox 
        value={value} 
        onChange={onChange}
        disabled={isDisabled}
        nullable
      >
        {({ open }) => (
          <>
            <div className={inputContainerClasses}>
              <Combobox.Input
                className={inputClasses}
                displayValue={getDisplayValue}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={isDisabled}
                autoComplete="off"
              />
              
              <div className={buttonClasses}>
                <div className="flex items-center gap-1">
                  {isLoading && (
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full animate-spin border-t-blue-600" />
                  )}
                  
                  {value && !isDisabled && !isLoading && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="p-1 text-gray-400 transition-colors pointer-events-auto hover:text-gray-600"
                      tabIndex={-1}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  
                  <Combobox.Button className="pointer-events-auto">
                    <ChevronDown 
                      className={`w-4 h-4 transition-transform duration-200 ${
                        open ? 'transform rotate-180' : ''
                      }`} 
                    />
                  </Combobox.Button>
                </div>
              </div>
            </div>

            <Transition
              show={open}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
              afterLeave={() => setQuery('')}
            >
              <Combobox.Options className="absolute z-50 w-full py-1 mt-1 overflow-auto text-base bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {isLoading ? (
                  <div className="flex items-center justify-center px-4 py-3 text-gray-500">
                    <div className="w-4 h-4 mr-2 border-2 border-gray-300 rounded-full animate-spin border-t-blue-600" />
                    Loading...
                  </div>
                ) : isEmpty ? (
                  <div className="flex items-center px-4 py-3 text-gray-500">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    No options available
                  </div>
                ) : filteredOptions.length === 0 ? (
                  <div className="flex items-center px-4 py-3 text-gray-500">
                    <Search className="w-4 h-4 mr-2" />
                    No results found for "{query}"
                  </div>
                ) : (
                  <>
                    {query && (
                      <div className="px-4 py-2 text-xs font-medium tracking-wide text-gray-400 uppercase border-b border-gray-100">
                        {filteredOptions.length} result{filteredOptions.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    
                    {filteredOptions.map((option) => (
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
                          <>
                            <div className="flex items-center">
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
                              <span className={`absolute inset-y-0 left-0 flex items-center pl-1 ${
                                active ? 'text-blue-600' : 'text-blue-500'
                              }`}>
                                <Check className="w-4 h-4" />
                              </span>
                            )}
                          </>
                        )}
                      </Combobox.Option>
                    ))}
                  </>
                )}
              </Combobox.Options>
            </Transition>
          </>
        )}
      </Combobox>

      {/* Error Message */}
      {error && (
        <div className="flex items-center mt-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
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