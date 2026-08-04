/**
 * Language Model Pricing Configuration
 * All prices are in USD per 1,000 tokens.
 *
 * Current as of August 2026
 * Source: https://platform.openai.com/docs/pricing
 */

interface ModelPricing {
  prompt: number;     // Cost per 1K input tokens
  completion: number; // Cost per 1K output tokens
}

// GPT-4o mini pricing ($0.15 / $0.60 per 1M tokens)
const GPT4O_MINI_PRICES: ModelPricing = {
  prompt: 0.00015,
  completion: 0.0006
} as const;

// text-embedding-3-small pricing ($0.02 per 1M tokens)
const EMBEDDING_PRICES: ModelPricing = {
  prompt: 0.00002,
  completion: 0       // Embeddings don't have completion tokens
} as const;

// To add a model: define its ModelPricing above and register it here
export const MODEL_PRICING = {
  // Chat models
  'gpt-4o-mini': GPT4O_MINI_PRICES,

  // Embedding models
  'text-embedding-3-small': EMBEDDING_PRICES,
} as const;
