// ================================
// 10. DROPDOWN COMPONENT
// ================================

// src/components/design-system/Dropdown.tsx
import React, { useState, useRef, useEffect } from 'react'
import { cn } from '../../utils/cn'
import { ChevronDown } from 'lucide-react'

interface DropdownItem {
  value: string
  label: string
  disabled?: boolean
  icon?: React.ReactNode
}

interface DropdownProps {
  items: DropdownItem[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  error?: string
  label?: string
}

const Dropdown: React.FC<DropdownProps> = ({
  items,
  value,
  onChange,
  placeholder = "เลือก...",
  disabled = false,
  className,
  error,
  label
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedItem = items.find(item => item.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (itemValue: string) => {
    onChange(itemValue)
    setIsOpen(false)
  }

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "relative w-full cursor-default rounded-md border bg-white py-2 pl-3 pr-10 text-left shadow-sm transition-all duration-200",
            "focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500",
            error ? "border-error-500" : "border-gray-300",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
        >
          <span className="block truncate">
            {selectedItem ? (
              <span className="flex items-center">
                {selectedItem.icon && (
                  <span className="mr-2">{selectedItem.icon}</span>
                )}
                {selectedItem.label}
              </span>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform duration-200",
                isOpen && "rotate-180"
              )} 
            />
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none">
            {items.map((item) => (
              <button
                key={item.value}
                onClick={() => !item.disabled && handleSelect(item.value)}
                disabled={item.disabled}
                className={cn(
                  "relative w-full cursor-default select-none py-2 pl-3 pr-9 text-left transition-colors",
                  value === item.value 
                    ? "bg-primary-100 text-primary-900" 
                    : "text-gray-900 hover:bg-gray-100",
                  item.disabled && "cursor-not-allowed opacity-50"
                )}
              >
                <span className="flex items-center">
                  {item.icon && (
                    <span className="mr-2">{item.icon}</span>
                  )}
                  <span className="block font-normal truncate">
                    {item.label}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-xs text-error-600">{error}</p>
      )}
    </div>
  )
}

export { Dropdown, type DropdownItem }