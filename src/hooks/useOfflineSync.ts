// ================================
// Fixed useOfflineSync Hook - TypeScript Strict Mode Compatible
// ไฟล์: src/hooks/useOfflineSync.ts
// ================================

import { useState, useEffect, useCallback, useRef } from 'react';

interface OfflineAction {
  readonly id: string;
  readonly type: string;
  readonly data: unknown;
  readonly timestamp: Date;
  readonly retryCount: number;
  readonly execute: () => Promise<void>;
}

interface OfflineSyncState {
  readonly isOnline: boolean;
  readonly pendingActions: readonly OfflineAction[];
  readonly isSyncing: boolean;
  readonly syncErrors: readonly string[];
}

interface OfflineSyncActions {
  readonly addAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => void;
  readonly clearSyncErrors: () => void;
}

type OfflineSyncResult = OfflineSyncState & OfflineSyncActions;

export const useOfflineSync = (): OfflineSyncResult => {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    pendingActions: [],
    isSyncing: false,
    syncErrors: []
  });

  // Use ref to store the latest executeAction function to avoid stale closures
  const executeActionRef = useRef<((action: OfflineAction) => Promise<void>) | null>(null);

  const executeAction = useCallback(async (action: OfflineAction): Promise<void> => {
    try {
      await action.execute();
      setState(prev => ({
        ...prev,
        pendingActions: prev.pendingActions.filter(a => a.id !== action.id)
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (action.retryCount < 3) {
        // Retry with exponential backoff
        const retryDelay = Math.pow(2, action.retryCount) * 1000;
        setTimeout(() => {
          const updatedAction: OfflineAction = {
            ...action,
            retryCount: action.retryCount + 1
          };
          void executeActionRef.current?.(updatedAction);
        }, retryDelay);
      } else {
        // Max retries reached, add to errors
        setState(prev => ({
          ...prev,
          syncErrors: [
            ...prev.syncErrors,
            `Failed to sync ${action.type}: ${errorMessage}`
          ],
          pendingActions: prev.pendingActions.filter(a => a.id !== action.id)
        }));
      }
    }
  }, []);

  // Update ref with latest executeAction
  useEffect(() => {
    executeActionRef.current = executeAction;
  }, [executeAction]);

  const addAction = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): void => {
    const newAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      retryCount: 0
    };

    setState(prev => ({
      ...prev,
      pendingActions: [...prev.pendingActions, newAction]
    }));

    // If online, try to execute immediately
    if (state.isOnline) {
      void executeAction(newAction);
    }
  }, [state.isOnline, executeAction]);

  const syncPendingActions = useCallback(async (): Promise<void> => {
    if (state.pendingActions.length === 0) return;

    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      // Execute all pending actions
      await Promise.allSettled(
        state.pendingActions.map(action => executeAction(action))
      );
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.pendingActions, executeAction]);

  const clearSyncErrors = useCallback((): void => {
    setState(prev => ({ ...prev, syncErrors: [] }));
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = (): void => {
      setState(prev => ({ ...prev, isOnline: true }));
      void syncPendingActions();
    };

    const handleOffline = (): void => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingActions]);

  return {
    ...state,
    addAction,
    clearSyncErrors
  };
};

// ================================
// Enhanced version with retry strategies
// ================================

interface RetryStrategy {
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
}

interface EnhancedOfflineAction extends Omit<OfflineAction, 'retryCount'> {
  readonly retryCount: number;
  readonly retryStrategy?: RetryStrategy;
  readonly priority?: 'low' | 'normal' | 'high';
}

interface EnhancedOfflineSyncOptions {
  readonly defaultRetryStrategy?: RetryStrategy;
  readonly maxQueueSize?: number;
  readonly persistToStorage?: boolean;
}

export const useEnhancedOfflineSync = (
  options: EnhancedOfflineSyncOptions = {}
): OfflineSyncResult & {
  readonly queueSize: number;
  readonly retryAction: (actionId: string) => void;
  readonly removeAction: (actionId: string) => void;
} => {
  const {
    defaultRetryStrategy = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2
    },
    maxQueueSize = 100,
    persistToStorage = false
  } = options;

  const [state, setState] = useState<OfflineSyncState & { queueSize: number }>(() => {
    const initialState = {
      isOnline: navigator.onLine,
      pendingActions: [],
      isSyncing: false,
      syncErrors: [],
      queueSize: 0
    };

    // Load from storage if enabled
    if (persistToStorage) {
      try {
        const stored = localStorage.getItem('offline-sync-queue');
        if (stored) {
          const parsedActions = JSON.parse(stored) as EnhancedOfflineAction[];
          return {
            ...initialState,
            pendingActions: parsedActions,
            queueSize: parsedActions.length
          };
        }
      } catch (error) {
        console.warn('Failed to load offline sync queue from storage:', error);
      }
    }

    return initialState;
  });

  // Persist to storage when actions change
  useEffect(() => {
    if (persistToStorage) {
      try {
        localStorage.setItem('offline-sync-queue', JSON.stringify(state.pendingActions));
      } catch (error) {
        console.warn('Failed to persist offline sync queue to storage:', error);
      }
    }
  }, [state.pendingActions, persistToStorage]);

  const executeEnhancedAction = useCallback(async (action: EnhancedOfflineAction): Promise<void> => {
    const strategy = action.retryStrategy || defaultRetryStrategy;
    
    try {
      await action.execute();
      setState(prev => ({
        ...prev,
        pendingActions: prev.pendingActions.filter(a => a.id !== action.id),
        queueSize: prev.pendingActions.length - 1
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (action.retryCount < strategy.maxRetries) {
        const delay = Math.min(
          strategy.baseDelay * Math.pow(strategy.backoffMultiplier, action.retryCount),
          strategy.maxDelay
        );
        
        setTimeout(() => {
          const updatedAction: EnhancedOfflineAction = {
            ...action,
            retryCount: action.retryCount + 1
          };
          void executeEnhancedAction(updatedAction);
        }, delay);
      } else {
        setState(prev => ({
          ...prev,
          syncErrors: [
            ...prev.syncErrors,
            `Failed to sync ${action.type} after ${strategy.maxRetries} retries: ${errorMessage}`
          ],
          pendingActions: prev.pendingActions.filter(a => a.id !== action.id),
          queueSize: prev.pendingActions.length - 1
        }));
      }
    }
  }, [defaultRetryStrategy]);

  const addAction = useCallback((
    action: Omit<EnhancedOfflineAction, 'id' | 'timestamp' | 'retryCount'>
  ): void => {
    // Check queue size limit
    if (state.pendingActions.length >= maxQueueSize) {
      console.warn('Offline sync queue is full. Removing oldest action.');
      setState(prev => ({
        ...prev,
        pendingActions: prev.pendingActions.slice(1)
      }));
    }

    const newAction: EnhancedOfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      retryCount: 0,
      priority: action.priority || 'normal'
    };

    setState(prev => ({
      ...prev,
      pendingActions: [...prev.pendingActions, newAction],
      queueSize: prev.pendingActions.length + 1
    }));

    // If online, try to execute immediately
    if (state.isOnline) {
      void executeEnhancedAction(newAction);
    }
  }, [state.isOnline, state.pendingActions.length, maxQueueSize, executeEnhancedAction]);

  const retryAction = useCallback((actionId: string): void => {
    const action = state.pendingActions.find(a => a.id === actionId) as EnhancedOfflineAction;
    if (action) {
      void executeEnhancedAction({ ...action, retryCount: 0 });
    }
  }, [state.pendingActions, executeEnhancedAction]);

  const removeAction = useCallback((actionId: string): void => {
    setState(prev => ({
      ...prev,
      pendingActions: prev.pendingActions.filter(a => a.id !== actionId),
      queueSize: prev.pendingActions.length - 1
    }));
  }, []);

  const syncPendingActions = useCallback(async (): Promise<void> => {
    if (state.pendingActions.length === 0) return;

    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      // Sort by priority before executing
      const sortedActions = [...state.pendingActions].sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const aPriority = (a as EnhancedOfflineAction).priority || 'normal';
        const bPriority = (b as EnhancedOfflineAction).priority || 'normal';
        return priorityOrder[bPriority] - priorityOrder[aPriority];
      });

      await Promise.allSettled(
        sortedActions.map(action => executeEnhancedAction(action as EnhancedOfflineAction))
      );
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.pendingActions, executeEnhancedAction]);

  const clearSyncErrors = useCallback((): void => {
    setState(prev => ({ ...prev, syncErrors: [] }));
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = (): void => {
      setState(prev => ({ ...prev, isOnline: true }));
      void syncPendingActions();
    };

    const handleOffline = (): void => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingActions]);

  return {
    ...state,
    addAction,
    clearSyncErrors,
    queueSize: state.queueSize,
    retryAction,
    removeAction
  };
};

export default useOfflineSync;