// ============= PERFORMANCE OPTIMIZATIONS - FILE CHANGES =============

// 📁 src/services/cacheService.ts 
export class CacheService {
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  
  set(key: string, data: unknown, ttlMinutes: number = 5): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }
  
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }
  
  clear(): void {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();