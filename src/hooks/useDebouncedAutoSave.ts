// 📁 src/components/hooks/useDebouncedAutoSave.ts (ไฟล์ใหม่)
import { useState, useCallback, useEffect } from 'react';
import { debounce } from 'lodash';
// npm install lodash
// npm install --save-dev @types/lodash

export const useDebouncedAutoSave = (
  data: unknown,
  saveFunction: (data: unknown) => Promise<void>,
  delay: number = 5000
) => {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const debouncedSave = useCallback(
    debounce(async (dataToSave: unknown) => {
      try {
        setSaving(true);
        await saveFunction(dataToSave);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setSaving(false);
      }
    }, delay),
    [saveFunction, delay]
  );
  
  useEffect(() => {
    if (data) {
      debouncedSave(data);
    }
  }, [data, debouncedSave]);
  
  return { saving, lastSaved };
};