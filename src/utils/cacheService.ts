// ================================
// Enhanced Cache Service
// ไฟล์: src/utils/cacheService.ts
// ================================

interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: number;
  readonly ttl: number;
  readonly accessCount: number;
  readonly lastAccessed: number;
}

interface CacheStats {
  readonly totalEntries: number;
  readonly hitRate: number;
  readonly missCount: number;
  readonly hitCount: number;
  readonly memoryUsage: number;
}

export class CacheService {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxSize: number;
  private hitCount = 0;
  private missCount = 0;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttlMinutes: number = 15): void {
    // LRU eviction when cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: ttlMinutes * 60 * 1000,
      accessCount: 0,
      lastAccessed: now
    });
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.missCount++;
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Update access statistics
    this.cache.set(key, {
      ...cached,
      accessCount: cached.accessCount + 1,
      lastAccessed: now
    });

    this.hitCount++;
    return cached.data as T;
  }

  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  // Bulk operations
  setMany<T>(entries: readonly { readonly key: string; readonly data: T; readonly ttl?: number }[]): void {
    entries.forEach(({ key, data, ttl = 15 }) => {
      this.set(key, data, ttl);
    });
  }

  getMany<T>(keys: readonly string[]): readonly { readonly key: string; readonly data: T | null }[] {
    return keys.map(key => ({ key, data: this.get<T>(key) }));
  }

  // Cache management
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Statistics and monitoring
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
    
    // Estimate memory usage (rough calculation)
    const memoryUsage = this.cache.size * 1024; // Approximate 1KB per entry

    return {
      totalEntries: this.cache.size,
      hitRate,
      missCount: this.missCount,
      hitCount: this.hitCount,
      memoryUsage
    };
  }

  // Cleanup expired entries
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  // Get keys matching pattern
  getKeysMatching(pattern: RegExp): readonly string[] {
    const matchingKeys: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        matchingKeys.push(key);
      }
    }

    return matchingKeys;
  }

  // Delete keys matching pattern
  deleteKeysMatching(pattern: RegExp): number {
    const keysToDelete = this.getKeysMatching(pattern);
    let deletedCount = 0;

    keysToDelete.forEach(key => {
      if (this.cache.delete(key)) {
        deletedCount++;
      }
    });

    return deletedCount;
  }

  // Auto cleanup timer
  startAutoCleanup(intervalMinutes: number = 30): () => void {
    const interval = setInterval(() => {
      const removed = this.cleanup();
      if (removed > 0) {
        console.log(`Cache cleanup: removed ${removed} expired entries`);
      }
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }
}

// Default cache instance
export const cacheService = new CacheService(100);

// Specialized cache instances
export const shortTermCache = new CacheService(50);  // For frequently changing data
export const longTermCache = new CacheService(200);  // For stable data

export default cacheService;