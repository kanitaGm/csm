// 📁 src/components/hooks/useKeyboardShortcuts.ts 
import { useEffect } from 'react';

export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S = Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const saveButton = document.querySelector('[data-action="save"]') as HTMLButtonElement;
        if (saveButton) saveButton.click();
      }
      
      // Ctrl/Cmd + Enter = Submit/Approve
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const submitButton = document.querySelector('[data-action="submit"]') as HTMLButtonElement;
        if (submitButton) submitButton.click();
      }
      
      // Escape = Close modals
      if (e.key === 'Escape') {
        const closeButton = document.querySelector('[data-action="close"]') as HTMLButtonElement;
        if (closeButton) closeButton.click();
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);
};