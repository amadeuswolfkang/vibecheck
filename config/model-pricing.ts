/**
 * Language Model Pricing Configuration
 * All prices are in USD per 1,000 tokens.
 * 
 * Current as of March 2024
 * Source: https://platform.openai.com/docs/pricing
 */

interface ModelPricing {
  prompt: number;     // Cost per 1K input tokens
  completion: number; // Cost per 1K output tokens
}

// GPT-3.5 Turbo pricing
const GPT35_PRICES: ModelPricing = {
  prompt: 0.0005,     // $0.0005 per 1K input tokens
  completion: 0.0015  // $0.0015 per 1K output tokens
} as const;

// Ada-002 Embeddings pricing
const EMBEDDING_PRICES: ModelPricing = {
  prompt: 0.0001,     // $0.0001 per 1K tokens
  completion: 0       // Embeddings don't have completion tokens
} as const;

// Export all model prices
export const MODEL_PRICING = {
  // Chat models
  'gpt-3.5-turbo': GPT35_PRICES,
  'gpt-3.5-turbo-16k': GPT35_PRICES,
  
  // Embedding models
  'text-embedding-ada-002': EMBEDDING_PRICES,
} as const;

/**
 * How to add a new model:
 * 
 * 1. Define its pricing constants above
 * 2. Add it to the MODEL_PRICING object
 * 3. Update the version comment at the top
 * 
 * Example:
 * const NEW_MODEL_PRICES = {
 *   prompt: 0.XXXX,    // $0.XXXX per 1K input tokens
 *   completion: 0.XXXX // $0.XXXX per 1K output tokens
 * } as const;
 * 
 * Then add to MODEL_PRICING:
 * 'new-model-name': NEW_MODEL_PRICES,
 */ 