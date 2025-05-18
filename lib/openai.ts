import OpenAI from 'openai';
import type { 
  EmailSentiment, 
  InternalEmailSentiment,
  Sentiment, 
  GmailMessage, 
  VibeloopResults,
  SentimentBreakdown 
} from '../types/api';
import { logger, tokenTracker } from '../utils/logging';
import { SYSTEM_PROMPTS, FEEDBACK_RESPONSE_FORMAT } from '../constants/prompts';
import { env } from '../lib/env';

// OpenAI client configuration
const OPENAI_CONFIG = {
  MAX_RETRIES: 3,
  TIMEOUT_MS: 30000, // 30 seconds
  RETRY_DELAY_MS: 1000, // 1 second
};

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: OPENAI_CONFIG.TIMEOUT_MS,
  maxRetries: OPENAI_CONFIG.MAX_RETRIES,
});

// Retry wrapper for OpenAI API calls
async function withOpenAIRetry<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= OPENAI_CONFIG.MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Log the retry attempt
      logger.warn(`OpenAI API ${context} failed, attempt ${attempt}/${OPENAI_CONFIG.MAX_RETRIES}`, {
        error: {
          name: lastError.name,
          message: lastError.message
        },
        attempt,
        maxRetries: OPENAI_CONFIG.MAX_RETRIES
      });

      // Don't wait on the last attempt
      if (attempt < OPENAI_CONFIG.MAX_RETRIES) {
        await new Promise(resolve => 
          setTimeout(resolve, OPENAI_CONFIG.RETRY_DELAY_MS * attempt)
        );
      }
    }
  }

  // If we get here, all retries failed
  throw new Error(`OpenAI API ${context} failed after ${OPENAI_CONFIG.MAX_RETRIES} attempts: ${lastError?.message}`);
}

// Increase batch size for processing more messages efficiently
const BATCH_SIZE = 20;

// Make EmbeddingWithMetadata available for the cache
export interface EmbeddingWithMetadata {
  embedding: number[];
  messageIndex: number;
}

// Sentiment anchor embeddings (normalized vectors)
const SENTIMENT_ANCHORS = {
  POSITIVE: new Float32Array(Array(1536).fill(0).map((_, i) => 
    i < 100 ? 0.1 : (i < 200 ? 0.05 : (i < 300 ? 0.02 : 0))
  )),
  NEGATIVE: new Float32Array(Array(1536).fill(0).map((_, i) => 
    i < 100 ? -0.1 : (i < 200 ? -0.05 : (i < 300 ? -0.02 : 0))
  )),
  NEUTRAL: new Float32Array(Array(1536).fill(0).map((_, i) => 
    i < 100 ? 0.01 : (i < 200 ? -0.01 : 0)
  ))
};

// Sentiment classification thresholds
const SENTIMENT_THRESHOLDS = {
  POSITIVE: 0.02,
  NEGATIVE: -0.02,
  MIXED: 0.01,
  NEUTRAL: -0.01,
};

export async function getEmailEmbeddings(messages: GmailMessage[]): Promise<EmbeddingWithMetadata[]> {
  const embeddings: EmbeddingWithMetadata[] = [];
  
  // Process messages in batches
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const texts = batch.map(msg => 
      `Subject: ${msg.subject}\n\nBody: ${msg.body}`
    );
    
    try {
      const response = await withOpenAIRetry(
        () => openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: texts,
        }),
        'embeddings generation'
      );

      // Log token usage for embeddings
      tokenTracker.trackUsage('text-embedding-ada-002', {
        prompt: 0.0001,
        completion: 0.0001
      }, {
        prompt_tokens: response.usage.total_tokens,
        completion_tokens: 0,
        total_tokens: response.usage.total_tokens
      });
      
      response.data.forEach((item, batchIndex) => {
        embeddings.push({
          embedding: item.embedding,
          messageIndex: i + batchIndex,
        });
      });
    } catch (err) {
      logger.error(
        'Failed to get embeddings for batch',
        err instanceof Error ? err : new Error(String(err)),
        { batchStart: i, batchSize: batch.length }
      );
      // Continue with next batch instead of failing completely
      continue;
    }
  }
  
  return embeddings;
}

export async function classifyEmailSentiments(
  messages: GmailMessage[],
  embeddings: EmbeddingWithMetadata[]
): Promise<EmailSentiment[]> {
  // Initialize sentiments array with neutral sentiment as fallback
  const defaultSentiment: InternalEmailSentiment = { sentiment: 'neutral', score: 0.5 };
  const internalSentiments: InternalEmailSentiment[] = new Array(messages.length).fill(defaultSentiment);
  
  // Validate input arrays
  if (messages.length === 0 || embeddings.length === 0) {
    logger.warn('Empty input for sentiment classification', {
      messageCount: messages.length,
      embeddingCount: embeddings.length
    });
    return internalSentiments.map(({ sentiment }) => ({ sentiment }));
  }

  // Process each embedding
  for (const { embedding, messageIndex } of embeddings) {
    try {
      if (messageIndex < 0 || messageIndex >= messages.length) {
        logger.warn('Invalid message index in embedding', { messageIndex, maxIndex: messages.length - 1 });
        continue;
      }

      // Calculate sentiment score using embedding values
      const sentimentScore = calculateSentimentScore(embedding);
      
      // Determine sentiment category and confidence
      const { sentiment, confidence } = determineSentiment(sentimentScore);
      
      internalSentiments[messageIndex] = {
        sentiment,
        score: confidence,
      };
    } catch (err) {
      logger.error(
        'Failed to classify sentiment for message',
        err instanceof Error ? err : new Error(String(err)),
        { messageIndex }
      );
      // Keep default neutral sentiment for this message
    }
  }
  
  // Convert internal sentiments to external format
  return internalSentiments.map(({ sentiment }) => ({ sentiment }));
}

function calculateSentimentScore(embedding: number[]): number {
  try {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      logger.warn('Invalid embedding received', { 
        isArray: Array.isArray(embedding),
        length: Array.isArray(embedding) ? embedding.length : 0 
      });
      return 0;
    }

    // Check for invalid numbers in the embedding
    const hasInvalidNumbers = embedding.some(val => 
      typeof val !== 'number' || isNaN(val) || !isFinite(val)
    );
    
    if (hasInvalidNumbers) {
      logger.warn('Embedding contains invalid numbers');
      return 0;
    }

    // Normalize the input embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalized = embedding.map(val => val / magnitude);

    // Calculate cosine similarity with sentiment anchors
    const positiveSim = cosineSimilarity(normalized, SENTIMENT_ANCHORS.POSITIVE);
    const negativeSim = cosineSimilarity(normalized, SENTIMENT_ANCHORS.NEGATIVE);
    const neutralSim = cosineSimilarity(normalized, SENTIMENT_ANCHORS.NEUTRAL);

    // Calculate sentiment score based on similarities
    return positiveSim - negativeSim;
  } catch (err) {
    logger.error(
      'Failed to calculate sentiment score',
      err instanceof Error ? err : new Error(String(err))
    );
    return 0;
  }
}

function cosineSimilarity(a: number[] | Float32Array, b: Float32Array): number {
  return (a as number[]).reduce((sum: number, val: number, i: number): number => sum + val * b[i], 0);
}

function determineSentiment(score: number): { sentiment: Sentiment; confidence: number } {
  const absScore = Math.abs(score);
  
  if (score >= SENTIMENT_THRESHOLDS.POSITIVE) {
    return { sentiment: 'positive', confidence: absScore };
  } else if (score <= SENTIMENT_THRESHOLDS.NEGATIVE) {
    return { sentiment: 'negative', confidence: absScore };
  } else if (
    score > SENTIMENT_THRESHOLDS.MIXED ||
    score < SENTIMENT_THRESHOLDS.NEUTRAL
  ) {
    return { sentiment: 'mixed', confidence: absScore };
  } else {
    return { sentiment: 'neutral', confidence: 1 - absScore };
  }
}

const DEFAULT_RESULTS: VibeloopResults = {
  overallSummary: '',
  topPraise: '',
  topPain: '',
  topIntensity: '',
  topRequestedFeature: '',
  praisePoints: [],
  painPoints: [],
  requestedFeatures: [],
  sentimentBreakdown: {
    positive: 0,
    negative: 0,
    mixed: 0,
    neutral: 0
  }
};

function isVibeloopResults(value: unknown): value is VibeloopResults {
  if (!value || typeof value !== 'object') return false;
  
  const result = value as VibeloopResults;
  return (
    typeof result.overallSummary === 'string' &&
    typeof result.topPraise === 'string' &&
    typeof result.topPain === 'string' &&
    typeof result.topIntensity === 'string' &&
    typeof result.topRequestedFeature === 'string' &&
    Array.isArray(result.praisePoints) &&
    Array.isArray(result.painPoints) &&
    Array.isArray(result.requestedFeatures)
  );
}

export async function generateDetailedAnalysis(
  messages: GmailMessage[],
  sentiments: EmailSentiment[]
): Promise<VibeloopResults> {
  // Process messages in chunks to avoid token limits
  const ANALYSIS_CHUNK_SIZE = 25;
  const chunks: VibeloopResults[] = [];
  
  // Validate input arrays
  if (messages.length === 0 || sentiments.length === 0) {
    logger.warn('Empty input for analysis', {
      messageCount: messages.length,
      sentimentCount: sentiments.length
    });
    return DEFAULT_RESULTS;
  }

  if (messages.length !== sentiments.length) {
    const error = new Error('Mismatched messages and sentiments arrays');
    Object.assign(error, {
      messageCount: messages.length,
      sentimentCount: sentiments.length
    });
    logger.error('Mismatched messages and sentiments arrays', error, {
      messageCount: messages.length,
      sentimentCount: sentiments.length
    });
    throw error;
  }

  for (let i = 0; i < messages.length; i += ANALYSIS_CHUNK_SIZE) {
    const chunk = messages.slice(i, i + ANALYSIS_CHUNK_SIZE);
    const chunkSentiments = sentiments.slice(i, i + ANALYSIS_CHUNK_SIZE);
    
    // Prepare the input for this chunk
    const analysisInput = chunk.map((msg, index) => ({
      content: msg.body,
      subject: msg.subject,
      sentiment: chunkSentiments[index],
      sender: msg.sender,
      date: msg.date,
      messageId: msg.messageId,
      id: msg.id
    }));
    
    try {
      // Call GPT-3.5-turbo for detailed analysis of this chunk
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.GMAIL_FEEDBACK,
          },
          {
            role: 'user',
            content: `Analyze these messages and provide insights. Format your response according to this schema: ${FEEDBACK_RESPONSE_FORMAT}\n\nMessages to analyze: ${JSON.stringify(analysisInput)}`,
          },
        ],
      });

      // Log token usage for GPT-3.5
      if (completion.usage) {
        tokenTracker.trackUsage('gpt-3.5-turbo', {
          prompt: 0.0015,
          completion: 0.002
        }, {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens
        });
      }
      
      const rawResult = completion.choices[0]?.message?.content;
      if (!rawResult) {
        logger.warn('Empty response from OpenAI', { chunkStart: i, chunkSize: chunk.length });
        continue;
      }

      try {
        const chunkResult = JSON.parse(rawResult) as VibeloopResults;
        validateChunkResult(chunkResult);
        chunks.push(chunkResult);
      } catch (parseErr) {
        logger.error(
          'Failed to parse chunk result',
          parseErr instanceof Error ? parseErr : new Error(String(parseErr)),
          { chunkStart: i, chunkSize: chunk.length, rawResult }
        );
        continue;
      }
    } catch (err) {
      logger.error(
        'Failed to analyze chunk',
        err instanceof Error ? err : new Error(String(err)),
        { chunkStart: i, chunkSize: chunk.length }
      );
      continue;
    }
  }
  
  return mergeAnalysisChunks(chunks);
}

function validateChunkResult(result: any): asserts result is VibeloopResults {
  const requiredFields = [
    'overallSummary',
    'topPraise',
    'topPain',
    'topIntensity',
    'topRequestedFeature',
    'praisePoints',
    'painPoints',
    'requestedFeatures',
    'sentimentBreakdown'
  ];

  for (const field of requiredFields) {
    if (!(field in result)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate arrays
  if (!Array.isArray(result.praisePoints)) throw new Error('praisePoints must be an array');
  if (!Array.isArray(result.painPoints)) throw new Error('painPoints must be an array');
  if (!Array.isArray(result.requestedFeatures)) throw new Error('requestedFeatures must be an array');

  // Validate sentiment breakdown
  const breakdown = result.sentimentBreakdown;
  if (typeof breakdown !== 'object' || breakdown === null) {
    throw new Error('sentimentBreakdown must be an object');
  }

  const requiredCounts = ['positive', 'negative', 'mixed', 'neutral'];
  for (const count of requiredCounts) {
    if (typeof breakdown[count] !== 'number') {
      throw new Error(`sentimentBreakdown.${count} must be a number`);
    }
  }
}

function mergeAnalysisChunks(chunks: VibeloopResults[]): VibeloopResults {
  if (chunks.length === 0) {
    return DEFAULT_RESULTS;
  }

  if (chunks.length === 1) return chunks[0];
  
  // Merge all chunks into one result
  return chunks.reduce((merged, chunk) => ({
    overallSummary: [merged.overallSummary, chunk.overallSummary]
      .filter(Boolean)
      .join('\n'),
    topPraise: selectTopInsight([merged.topPraise, chunk.topPraise]),
    topPain: selectTopInsight([merged.topPain, chunk.topPain]),
    topIntensity: selectTopInsight([merged.topIntensity, chunk.topIntensity]),
    topRequestedFeature: selectTopInsight([merged.topRequestedFeature, chunk.topRequestedFeature]),
    praisePoints: [...merged.praisePoints, ...chunk.praisePoints],
    painPoints: [...merged.painPoints, ...chunk.painPoints],
    requestedFeatures: [...merged.requestedFeatures, ...chunk.requestedFeatures],
    sentimentBreakdown: mergeSentimentBreakdowns(merged.sentimentBreakdown, chunk.sentimentBreakdown),
  }));
}

function selectTopInsight(insights: (string | undefined)[]): string {
  return insights
    .filter((insight): insight is string => typeof insight === 'string' && insight.length > 0)
    .reduce((best, current) => 
      current.length > best.length ? current : best
    , '');
}

function mergeSentimentBreakdowns(
  a: SentimentBreakdown | null | undefined, 
  b: SentimentBreakdown | null | undefined
): SentimentBreakdown {
  const defaultBreakdown: SentimentBreakdown = { 
    positive: 0, 
    negative: 0, 
    mixed: 0, 
    neutral: 0 
  };
  
  if (!a && !b) return defaultBreakdown;
  if (!a) return b || defaultBreakdown;
  if (!b) return a;
  
  return {
    positive: (a.positive || 0) + (b.positive || 0),
    negative: (a.negative || 0) + (b.negative || 0),
    mixed: (a.mixed || 0) + (b.mixed || 0),
    neutral: (a.neutral || 0) + (b.neutral || 0),
  };
} 