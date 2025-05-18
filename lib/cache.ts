import type { EmbeddingWithMetadata } from './openai';

interface CacheEntry {
  embeddings: EmbeddingWithMetadata[];
  timestamp: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

class EmbeddingsCache {
  private cache: Map<string, CacheEntry>;
  
  constructor() {
    this.cache = new Map();
  }
  
  generateKey(messageId: string, content: string): string {
    return `${messageId}:${content.length}`; // Simple key based on message ID and content length
  }
  
  get(messageId: string, content: string): EmbeddingWithMetadata[] | null {
    const key = this.generateKey(messageId, content);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.embeddings;
  }
  
  set(messageId: string, content: string, embeddings: EmbeddingWithMetadata[]): void {
    const key = this.generateKey(messageId, content);
    this.cache.set(key, {
      embeddings,
      timestamp: Date.now(),
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
}

// Export a singleton instance
export const embeddingsCache = new EmbeddingsCache(); 