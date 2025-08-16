// ========================================
// 📁 src/hooks/useOfflineSync.ts - Updated
// ========================================

import { useState, useEffect, useCallback, useRef } from 'react';

interface OfflineAction {
  readonly id: string;
  readonly type: string;
  readonly data: unknown;
  readonly timestamp: Date;
  readonly retryCount: number;
  readonly execute: () => Promise<void>;
}

interface OfflineSyncOptions {
  readonly key: string;
  readonly syncInterval?: number;
  readonly onSync?: () => Promise<void>;
  readonly enabled?: boolean;
  readonly maxRetries?: number;
}

export interface OfflineSyncResult {
  readonly isOnline: boolean;
  readonly pendingActions: readonly OfflineAction[];
  readonly isSyncing: boolean;
  readonly syncErrors: readonly string[];
  readonly lastSync: Date | null;
  readonly addAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => void;
  readonly sync: () => Promise<void>;
  readonly clearSyncErrors: () => void;
  readonly syncStatus: 'idle' | 'syncing' | 'error' | 'success';
}

export const useOfflineSync = (options: OfflineSyncOptions): OfflineSyncResult => {
  const {
    key,
    syncInterval = 30000,
    onSync,
    enabled = true,
    maxRetries = 3
  } = options;

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isComponentMountedRef = useRef<boolean>(true);

  const executeAction = useCallback(async (action: OfflineAction): Promise<void> => {
    try {
      await action.execute();
      setPendingActions(prev => prev.filter(a => a.id !== action.id));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (action.retryCount < maxRetries) {
        // Retry with exponential backoff
        const retryDelay = Math.pow(2, action.retryCount) * 1000;
        setTimeout(() => {
          if (isComponentMountedRef.current) {
            const updatedAction: OfflineAction = {
              ...action,
              retryCount: action.retryCount + 1
            };
            void executeAction(updatedAction);
          }
        }, retryDelay);
      } else {
        setSyncErrors(prev => [...prev, `Failed to execute ${action.type}: ${errorMessage}`]);
        setPendingActions(prev => prev.filter(a => a.id !== action.id));
      }
    }
  }, [maxRetries]);

  const sync = useCallback(async (): Promise<void> => {
    if (!enabled || !isOnline || isSyncing) return;

    try {
      setIsSyncing(true);
      setSyncStatus('syncing');
      setSyncErrors([]);

      // Execute custom sync function
      if (onSync) {
        await onSync();
      }

      // Execute pending actions
      const actionsToExecute = [...pendingActions];
      for (const action of actionsToExecute) {
        if (isComponentMountedRef.current) {
          await executeAction(action);
        }
      }

      if (isComponentMountedRef.current) {
        setLastSync(new Date());
        setSyncStatus('success');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      if (isComponentMountedRef.current) {
        setSyncErrors(prev => [...prev, errorMessage]);
        setSyncStatus('error');
      }
    } finally {
      if (isComponentMountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, [enabled, isOnline, isSyncing, onSync, pendingActions, executeAction]);

  const addAction = useCallback((actionData: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): void => {
    const action: OfflineAction = {
      ...actionData,
      id: `${key}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      retryCount: 0
    };

    setPendingActions(prev => [...prev, action]);

    // Try to execute immediately if online
    if (isOnline && enabled) {
      void executeAction(action);
    }
  }, [key, isOnline, enabled, executeAction]);

  const clearSyncErrors = useCallback((): void => {
    setSyncErrors([]);
    setSyncStatus('idle');
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = (): void => {
      setIsOnline(true);
      if (enabled) {
        void sync();
      }
    };

    const handleOffline = (): void => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, sync]);

  // Periodic sync
  useEffect(() => {
    if (!enabled || !isOnline) return;

    syncIntervalRef.current = setInterval(() => {
      if (pendingActions.length > 0 || onSync) {
        void sync();
      }
    }, syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [enabled, isOnline, syncInterval, pendingActions.length, onSync, sync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMountedRef.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  return {
    isOnline,
    pendingActions,
    isSyncing,
    syncErrors,
    lastSync,
    syncStatus,
    addAction,
    sync,
    clearSyncErrors
  };
};
