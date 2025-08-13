// 📁 src/services/cacheService.ts - Updated Cache Service Interface
export interface CacheService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlMinutes?: number): void;
  delete(key: string): void; // Add delete method
  remove(key: string): void; // Alternative method name
  clear(): void;
  has(key: string): boolean;
}

// Simple in-memory cache implementation
class InMemoryCacheService implements CacheService {
  private cache = new Map<string, { value: unknown; expiry: number }>();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }

  set<T>(key: string, value: T, ttlMinutes: number = 30): void {
    const expiry = Date.now() + (ttlMinutes * 60 * 1000);
    this.cache.set(key, { value, expiry });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  remove(key: string): void {
    this.delete(key); // Alias for delete
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // Additional utility methods
  size(): number {
    this.cleanup(); // Remove expired items before counting
    return this.cache.size;
  }

  keys(): string[] {
    this.cleanup();
    return Array.from(this.cache.keys());
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
  }
}

// Export singleton instance
export const cacheService: CacheService = new InMemoryCacheService();

export default cacheService;