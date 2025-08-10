// 📁 src/contexts/ErrorBoundary.tsx 
import React, { PureComponent } from 'react';
import type {ReactNode, ComponentType, ErrorInfo} from 'react';
import { AlertTriangle, RefreshCw, WifiOff, Lock, AlertCircle } from 'lucide-react';
import { CSMError, CSMErrorCodes } from '../features/errors/CSMError';
import { errorReporter } from '../services/errorReporting';

// =================== STRICT TYPE DEFINITIONS ===================
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
type ErrorCategory = 'network' | 'chunk' | 'permission' | 'validation' | 'runtime' | 'memory' | 'unknown';
type RecoveryStrategy = 'retry' | 'reload' | 'redirect' | 'fallback' | 'none';

interface MemoryInfo {
  readonly usedJSHeapSize: number;
  readonly totalJSHeapSize: number;
  readonly jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  readonly memory?: MemoryInfo;
}

interface ErrorMetrics {
  readonly errorId: string;
  readonly timestamp: number;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly userAgent: string;
  readonly url: string;
  readonly userId?: string;
  readonly sessionId: string;
  readonly retryCount: number;
  readonly recoveryStrategy: RecoveryStrategy;
  readonly componentStack?: string;
  readonly errorBoundary: string;
}

interface ErrorContext {
  readonly lastUserAction?: string;
  readonly lastUserActionTime?: number;
  readonly routeHistory: readonly string[];
  readonly memoryUsage?: MemoryInfo;
  readonly connectionType?: string;
  readonly isOnline: boolean;
}

interface ErrorFallbackProps {
  readonly error: Error;
  readonly errorInfo: ErrorInfo;
  readonly errorId: string;
  readonly retryCount: number;
  readonly onRetry: () => void;
  readonly onReload: () => void;
  readonly onReport: (feedback: string) => void;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly context: ErrorContext;
}

interface ErrorBoundaryConfig {
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly exponentialBackoff: boolean;
  readonly autoRecoveryTimeout: number;
  readonly enableMetrics: boolean;
  readonly enablePersistence: boolean;
  readonly enableOfflineSupport: boolean;
  readonly boundaryName: string;
  readonly isDevelopment: boolean;
}

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: ComponentType<ErrorFallbackProps>;
  readonly onError?: (error: Error, errorInfo: ErrorInfo, metrics: ErrorMetrics) => void;
  readonly config?: Partial<ErrorBoundaryConfig>;
  readonly isolateErrors?: boolean;
  readonly enableRetry?: boolean;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
  readonly errorInfo: ErrorInfo | null;
  readonly errorId: string | null;
  readonly retryCount: number;
  readonly lastErrorTime: number;
  readonly isRecovering: boolean;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly context: ErrorContext;
  readonly metrics: ErrorMetrics | null;
}

// =================== ERROR CLASSIFICATION ENGINE ===================
class ErrorClassifier {
  private static readonly NETWORK_PATTERNS = [
    /network/i, /fetch/i, /xhr/i, /cors/i, /timeout/i, /offline/i
  ] as const;

  private static readonly CHUNK_PATTERNS = [
    /loading chunk/i, /loading css chunk/i, /chunk load/i, /import/i
  ] as const;

  private static readonly PERMISSION_PATTERNS = [
    /permission/i, /unauthorized/i, /forbidden/i, /access denied/i, /401|403/
  ] as const;

  private static readonly MEMORY_PATTERNS = [
    /out of memory/i, /maximum call stack/i, /heap/i, /memory/i
  ] as const;

  static classifyError(error: Error): { category: ErrorCategory; severity: ErrorSeverity; strategy: RecoveryStrategy } {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    const combinedText = `${message} ${stack}`;

    // Network errors
    if (this.NETWORK_PATTERNS.some(pattern => pattern.test(combinedText))) {
      return { 
        category: 'network', 
        severity: navigator.onLine ? 'medium' : 'high',
        strategy: navigator.onLine ? 'retry' : 'fallback'
      };
    }

    // Chunk loading errors
    if (this.CHUNK_PATTERNS.some(pattern => pattern.test(combinedText))) {
      return { 
        category: 'chunk', 
        severity: 'medium',
        strategy: 'reload'
      };
    }

    // Permission errors
    if (this.PERMISSION_PATTERNS.some(pattern => pattern.test(combinedText))) {
      return { 
        category: 'permission', 
        severity: 'high',
        strategy: 'redirect'
      };
    }

    // Memory errors
    if (this.MEMORY_PATTERNS.some(pattern => pattern.test(combinedText))) {
      return { 
        category: 'memory', 
        severity: 'critical',
        strategy: 'reload'
      };
    }

    // Validation errors
    if (error.name.includes('Validation') || message.includes('validation')) {
      return { 
        category: 'validation', 
        severity: 'low',
        strategy: 'retry'
      };
    }

    // Default runtime error
    return { 
      category: 'runtime', 
      severity: 'medium',
      strategy: 'retry'
    };
  }
}

// =================== PERFORMANCE MONITOR ===================
class PerformanceMonitor {
  private static memoryThreshold = 50 * 1024 * 1024; // 50MB
  private static readonly performanceEntries = new Map<string, number>();

  static getMemoryUsage(): MemoryInfo | undefined {
    const perf = performance as PerformanceWithMemory;
    return perf.memory;
  }

  static isMemoryPressure(): boolean {
    const memory = this.getMemoryUsage();
    return memory ? memory.usedJSHeapSize > this.memoryThreshold : false;
  }

  static startTiming(label: string): void {
    this.performanceEntries.set(label, performance.now());
  }

  static endTiming(label: string): number {
    const start = this.performanceEntries.get(label);
    if (start) {
      const duration = performance.now() - start;
      this.performanceEntries.delete(label);
      return duration;
    }
    return 0;
  }

  static getConnectionInfo(): string | undefined {
    interface NavigatorWithConnection extends Navigator {
      readonly connection?: {
        readonly effectiveType?: string;
      };
      readonly mozConnection?: {
        readonly effectiveType?: string;
      };
      readonly webkitConnection?: {
        readonly effectiveType?: string;
      };
    }
    
    const nav = navigator as NavigatorWithConnection;
    return nav.connection?.effectiveType || nav.mozConnection?.effectiveType || nav.webkitConnection?.effectiveType;
  }
}

// =================== ERROR STORAGE MANAGER ===================
class ErrorStorageManager {
  private static readonly STORAGE_KEY = 'csm_error_history';
  private static readonly MAX_ENTRIES = 100;

  static saveError(metrics: ErrorMetrics): void {
    try {
      const existing = this.getErrorHistory();
      const updated = [metrics, ...existing.slice(0, this.MAX_ENTRIES - 1)];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }

  static getErrorHistory(): readonly ErrorMetrics[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static clearErrorHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  static getErrorFrequency(timeWindowMs: number = 3600000): number { // 1 hour default
    const history = this.getErrorHistory();
    const cutoff = Date.now() - timeWindowMs;
    return history.filter(error => error.timestamp > cutoff).length;
  }
}

// =================== CONTEXT COLLECTOR ===================
class ContextCollector {
  private static userActionHistory: Array<{ action: string; timestamp: number }> = [];
  private static routeHistory: string[] = [];

  static recordUserAction(action: string): void {
    this.userActionHistory.unshift({ action, timestamp: Date.now() });
    if (this.userActionHistory.length > 10) {
      this.userActionHistory.pop();
    }
  }

  static recordRoute(route: string): void {
    this.routeHistory.unshift(route);
    if (this.routeHistory.length > 5) {
      this.routeHistory.pop();
    }
  }

  static getContext(): ErrorContext {
    const lastAction = this.userActionHistory[0];
    return {
      lastUserAction: lastAction?.action,
      lastUserActionTime: lastAction?.timestamp,
      routeHistory: [...this.routeHistory],
      memoryUsage: PerformanceMonitor.getMemoryUsage(),
      connectionType: PerformanceMonitor.getConnectionInfo(),
      isOnline: navigator.onLine
    };
  }

  static initialize(): void {
    // Track clicks globally
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = `click:${target.tagName}${target.id ? `#${target.id}` : ''}${target.className ? `.${target.className.split(' ')[0]}` : ''}`;
      this.recordUserAction(action);
    });

    // Track route changes
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      ContextCollector.recordRoute(args[2] as string || location.pathname);
      return originalPushState.apply(history, args);
    };
  }
}

// =================== OPTIMIZED FALLBACK COMPONENTS ===================
const ErrorIcon = React.memo<{ category: ErrorCategory; className?: string }>(({ category, className = "w-16 h-16 mx-auto" }) => {
  const iconMap = {
    network: WifiOff,
    chunk: RefreshCw,
    permission: Lock,
    memory: AlertCircle,
    validation: AlertTriangle,
    runtime: AlertTriangle,
    unknown: AlertTriangle
  } as const;

  const Icon = iconMap[category];
  return <Icon className={`${className} text-red-500`} />;
});

const ErrorMessage = React.memo<{ category: ErrorCategory; severity: ErrorSeverity; isOnline: boolean }>(({ category, severity, isOnline }) => {
  const messages = {
    network: isOnline ? 'เกิดปัญหาการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง' : 'ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้',
    chunk: 'กรุณารีโหลดหน้าเว็บเพื่อดาวน์โหลดไฟล์ใหม่',
    permission: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ กรุณาเข้าสู่ระบบใหม่',
    memory: 'หน่วยความจำเต็ม กรุณาปิดแท็บอื่นและรีโหลดหน้า',
    validation: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่',
    runtime: 'เกิดข้อผิดพลาดในระบบ',
    unknown: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
  } as const;

  return (
    <div className="text-center">
      <h1 className={`text-2xl font-bold mb-2 ${severity === 'critical' ? 'text-red-600' : 'text-gray-900'}`}>
        เกิดข้อผิดพลาด
      </h1>
      <p className="mb-4 text-gray-600">
        {messages[category]}
      </p>
    </div>
  );
});

const RetryButton = React.memo<{ 
  onRetry: () => void; 
  retryCount: number; 
  maxRetries: number; 
  isRecovering: boolean;
  strategy: RecoveryStrategy;
}>(({ onRetry, retryCount, maxRetries, isRecovering, strategy }) => {
  const canRetry = retryCount < maxRetries && ['retry', 'fallback'].includes(strategy);
  
  if (!canRetry) return null;

  return (
    <button
      onClick={onRetry}
      disabled={isRecovering}
      className={`
        px-4 py-2 rounded-lg transition-colors
        ${isRecovering 
          ? 'bg-gray-400 cursor-not-allowed' 
          : 'bg-blue-600 hover:bg-blue-700'
        } text-white
      `}
    >
      {isRecovering ? (
        <>
          <RefreshCw className="inline w-4 h-4 mr-2 animate-spin" />
          กำลังกู้คืน...
        </>
      ) : (
        `ลองอีกครั้ง (${retryCount}/${maxRetries})`
      )}
    </button>
  );
});

// =================== ENHANCED ERROR BOUNDARY ===================
const DEFAULT_CONFIG: ErrorBoundaryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  autoRecoveryTimeout: 30000,
  enableMetrics: true,
  enablePersistence: true,
  enableOfflineSupport: true,
  boundaryName: 'CSMErrorBoundary',
  isDevelopment: process.env.NODE_ENV === 'development'
} as const;

export class CSMErrorBoundary extends PureComponent<ErrorBoundaryProps, ErrorBoundaryState> {
  private readonly config: ErrorBoundaryConfig;
  private retryTimeoutId: number | null = null;
  private autoRecoveryTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.config = { ...DEFAULT_CONFIG, ...props.config };
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      lastErrorTime: 0,
      isRecovering: false,
      category: 'unknown',
      severity: 'medium',
      context: ContextCollector.getContext(),
      metrics: null
    };

    // Initialize context collector
    if (typeof window !== 'undefined') {
      ContextCollector.initialize();
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const { category, severity } = ErrorClassifier.classifyError(error);
    const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const context = ContextCollector.getContext();

    return {
      hasError: true,
      error,
      errorId,
      category,
      severity,
      context,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    PerformanceMonitor.startTiming('error-handling');
    
    const { category, severity, strategy } = ErrorClassifier.classifyError(error);
    
    const metrics: ErrorMetrics = {
      errorId: this.state.errorId!,
      timestamp: Date.now(),
      category,
      severity,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId(),
      retryCount: this.state.retryCount,
      recoveryStrategy: strategy,
      componentStack: errorInfo.componentStack || undefined,
      errorBoundary: this.config.boundaryName
    };

    // Save metrics
    if (this.config.enablePersistence) {
      ErrorStorageManager.saveError(metrics);
    }

    // Report error
    this.reportError(error, errorInfo, metrics);

    // Update state with metrics
    this.setState({ metrics });

    // Set up auto recovery
    this.setupAutoRecovery(strategy);

    PerformanceMonitor.endTiming('error-handling');
  }

  private reportError = (error: Error, errorInfo: ErrorInfo, metrics: ErrorMetrics): void => {
    const csmError = new CSMError(
      error.message,
      this.mapCategoryToCSMCode(metrics.category),
      metrics.severity,
      false,
      error
    );

    errorReporter.reportError(csmError, {
      errorInfo,
      metrics,
      context: this.state.context,
      timestamp: new Date().toISOString()
    });

    // Call user-provided error handler
    this.props.onError?.(error, errorInfo, metrics);
  };

  private mapCategoryToCSMCode = (category: ErrorCategory): keyof typeof CSMErrorCodes => {
    const mapping = {
      network: 'NETWORK_ERROR',
      chunk: 'FIRESTORE_ERROR',
      permission: 'VALIDATION_ERROR',
      memory: 'FIRESTORE_ERROR',
      validation: 'VALIDATION_ERROR',
      runtime: 'FIRESTORE_ERROR',
      unknown: 'FIRESTORE_ERROR'
    } as const;

    return mapping[category] || 'FIRESTORE_ERROR';
  };

  private getSessionId = (): string => {
    let sessionId = sessionStorage.getItem('csm-session-id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('csm-session-id', sessionId);
    }
    return sessionId;
  };

  private setupAutoRecovery = (strategy: RecoveryStrategy): void => {
    if (strategy === 'retry' && this.config.autoRecoveryTimeout > 0) {
      this.autoRecoveryTimeoutId = window.setTimeout(() => {
        if (this.state.hasError && this.state.retryCount < this.config.maxRetries) {
          this.handleRetry();
        }
      }, this.config.autoRecoveryTimeout);
    }
  };

  private calculateRetryDelay = (): number => {
    if (!this.config.exponentialBackoff) {
      return this.config.retryDelay;
    }
    return this.config.retryDelay * Math.pow(2, this.state.retryCount);
  };

  private handleRetry = (): void => {
    if (this.state.isRecovering || this.state.retryCount >= this.config.maxRetries) {
      return;
    }

    this.setState({ isRecovering: true });

    const delay = this.calculateRetryDelay();
    
    this.retryTimeoutId = window.setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1,
        isRecovering: false,
        context: ContextCollector.getContext()
      }));
    }, delay);
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReport = (feedback: string): void => {
    if (this.state.metrics) {
      errorReporter.reportError(
        new CSMError('User Feedback', CSMErrorCodes.VALIDATION_ERROR, 'low', false),
        { feedback, metrics: this.state.metrics }
      );
    }
  };

  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    if (this.autoRecoveryTimeoutId) {
      clearTimeout(this.autoRecoveryTimeoutId);
    }
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { 
      error, 
      errorInfo, 
      errorId, 
      retryCount, 
      category, 
      severity, 
      context, 
      isRecovering,
      metrics 
    } = this.state;

    // Use custom fallback component if provided
    if (this.props.fallback && error && errorInfo && errorId && metrics) {
      const FallbackComponent = this.props.fallback;
      return (
        <FallbackComponent
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          retryCount={retryCount}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          onReport={this.handleReport}
          category={category}
          severity={severity}
          context={context}
        />
      );
    }

    const { strategy } = ErrorClassifier.classifyError(error!);

    // Default fallback UI
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
          <div className="mb-6 text-center">
            <ErrorIcon category={category} />
            <ErrorMessage 
              category={category} 
              severity={severity} 
              isOnline={context.isOnline} 
            />
          </div>

          <div className="flex flex-col gap-3">
            <RetryButton
              onRetry={this.handleRetry}
              retryCount={retryCount}
              maxRetries={this.config.maxRetries}
              isRecovering={isRecovering}
              strategy={strategy}
            />
            
            {strategy === 'reload' && (
              <button
                onClick={this.handleReload}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                รีโหลดหน้า
              </button>
            )}

            {this.config.isDevelopment && error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  ข้อมูลเพิ่มเติม (Development)
                </summary>
                <pre className="p-2 mt-2 overflow-auto text-xs bg-gray-100 rounded max-h-32">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>

          {errorId && (
            <div className="pt-4 mt-6 border-t border-gray-200">
              <p className="text-xs text-center text-gray-500">
                Error ID: {errorId}
              </p>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-400">
                <span>Retry: {retryCount}/{this.config.maxRetries}</span>
                <span>•</span>
                <span>{category}</span>
                <span>•</span>
                <span className={severity === 'critical' ? 'text-red-500' : ''}>
                  {severity}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

// =================== UTILITY EXPORTS ===================
export { 
  ErrorClassifier, 
  PerformanceMonitor, 
  ErrorStorageManager, 
  ContextCollector,
  type ErrorBoundaryProps,
  type ErrorBoundaryConfig,
  type ErrorFallbackProps,
  type ErrorMetrics,
  type ErrorContext,
  type ErrorCategory,
  type ErrorSeverity,
  type RecoveryStrategy
};