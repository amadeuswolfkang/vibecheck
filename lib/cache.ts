// In-memory caches keyed by Gmail message ID. Emails are immutable, so entries
// never need invalidation; the TTL just bounds staleness and the entry cap bounds
// memory. State is per server process — fine for a single-instance deployment.

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ENTRIES = 5000;

class TtlCache<V> {
  private store = new Map<string, { value: V; timestamp: number }>();

  // Returns undefined on miss; a cached value may itself be null (see insightCache).
  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: V): void {
    // Map iterates in insertion order, so the first key is the oldest entry
    if (this.store.size >= MAX_ENTRIES && !this.store.has(key)) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }

    this.store.set(key, { value, timestamp: Date.now() });
  }
}

// The raw fields GPT extracts for a message. null means GPT analyzed the message
// and produced no insight, cached so we don't pay to re-ask.
export interface CachedInsight {
  insight: string;
  quote: string;
  category: 'praise' | 'pain' | 'feature';
}

export const embeddingCache = new TtlCache<number[]>();
export const insightCache = new TtlCache<CachedInsight | null>();
