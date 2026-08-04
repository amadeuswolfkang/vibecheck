import OpenAI from 'openai';
import type {
  EmailSentiment,
  Sentiment,
  GmailMessage,
  VibecheckResults,
  SentimentBreakdown,
  ProcessedMessage,
  MessageInsight
} from '../types/api';
import { logger, tokenTracker } from '../utils/logging';
import { SYSTEM_PROMPTS, CHAR_LIMITS } from '../constants/prompts';
import { MODEL_PRICING } from '../config/model-pricing';
import { embeddingCache, insightCache, type CachedInsight } from './cache';
import { env } from '../lib/env';

// OpenAI client configuration; the SDK retries failed requests with backoff
const OPENAI_CONFIG = {
  MAX_RETRIES: 3,
  TIMEOUT_MS: 30000, // 30 seconds
};

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: OPENAI_CONFIG.TIMEOUT_MS,
  maxRetries: OPENAI_CONFIG.MAX_RETRIES,
});

// Thrown when the AI service failed outright (quota, outage), as opposed to
// legitimately finding nothing — lets the API route return a real error instead
// of a plausible-looking empty result
export class AnalysisUnavailableError extends Error {
  constructor(message = 'AI analysis is unavailable') {
    super(message);
    this.name = 'AnalysisUnavailableError';
  }
}

// Increase batch size for processing more messages efficiently
const BATCH_SIZE = 20;

// Product feedback text samples for generating semantic anchors
const PRODUCT_FEEDBACK_TEXTS = {
  POSITIVE: `love this feature works great easy to use helpful solves my problem 
             exactly what I needed perfect functionality smooth experience 
             intuitive design user friendly saves time efficient workflow 
             excellent product quality impressed with performance reliable 
             stable fast responsive well designed thoughtful implementation 
             great improvement valuable addition highly useful recommended 
             satisfied with results exceeded expectations brilliant solution 
             innovative feature appreciate the update fantastic job well done`,
             
  NEGATIVE: `doesn't work broken feature confusing interface hard to use
             frustrated with bugs crashes frequently slow performance
             poor user experience difficult to navigate unintuitive design
             missing functionality limited options inadequate solution
             not working as expected disappointed with quality unreliable
             constant issues technical problems error messages frequent
             crashes waste of time complicated setup poor documentation
             regression from previous version needs major improvements`
};

// Generate semantic sentiment anchors from real text
async function generateProductFeedbackAnchors(): Promise<{[key: string]: Float32Array}> {
  const anchors: {[key: string]: Float32Array} = {};
  
  for (const [category, text] of Object.entries(PRODUCT_FEEDBACK_TEXTS)) {
    try {
      const cleanText = text.replace(/\s+/g, ' ').trim();

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: cleanText,
      });

      // Track token usage for anchor generation
      tokenTracker.trackUsage('text-embedding-3-small', MODEL_PRICING['text-embedding-3-small'], {
        prompt_tokens: response.usage.total_tokens,
        completion_tokens: 0,
        total_tokens: response.usage.total_tokens
      });

      anchors[category] = new Float32Array(response.data[0].embedding);
      
    } catch (error) {
      logger.error(`Failed to generate ${category} sentiment anchor`, error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to generate sentiment anchors: ${error}`);
    }
  }
  
  return anchors;
}



// Helper function for calculating sentiment with provided anchors
function calculateSentimentScoreWithAnchors(embedding: number[], anchors: {[key: string]: Float32Array}): number {
  // Normalize the input embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  const normalized = embedding.map(val => val / magnitude);

  // Calculate cosine similarity with sentiment anchors
  const positiveSim = cosineSimilarity(normalized, anchors.POSITIVE);
  const negativeSim = cosineSimilarity(normalized, anchors.NEGATIVE);

  // Calculate sentiment score based on similarities
  return positiveSim - negativeSim;
}

// Initialize sentiment anchors (will be populated on first use)
let SENTIMENT_ANCHORS: {[key: string]: Float32Array} | null = null;

// Get or generate sentiment anchors
async function getSentimentAnchors(): Promise<{[key: string]: Float32Array}> {
  if (SENTIMENT_ANCHORS === null) {
    SENTIMENT_ANCHORS = await generateProductFeedbackAnchors();
  }
  return SENTIMENT_ANCHORS;
}

// Sentiment classification thresholds
const SENTIMENT_THRESHOLDS = {
  POSITIVE: 0.02,
  NEGATIVE: -0.02,
  MIXED: 0.01,
  NEUTRAL: -0.01,
};

// Returns embeddings keyed by Gmail message ID, serving repeat messages from cache
export async function getEmailEmbeddings(messages: GmailMessage[]): Promise<Map<string, number[]>> {
  const embeddingsById = new Map<string, number[]>();
  const uncached: GmailMessage[] = [];

  for (const msg of messages) {
    const cached = embeddingCache.get(msg.id);
    if (cached) {
      embeddingsById.set(msg.id, cached);
    } else {
      uncached.push(msg);
    }
  }

  if (uncached.length < messages.length) {
    logger.info('Embedding cache hits', {
      cached: messages.length - uncached.length,
      toEmbed: uncached.length
    });
  }

  // Process uncached messages in batches
  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE);
    const texts = batch.map(msg =>
      `Subject: ${msg.subject}\n\nBody: ${msg.body}`
    );

    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });

      // Log token usage for embeddings
      tokenTracker.trackUsage('text-embedding-3-small', MODEL_PRICING['text-embedding-3-small'], {
        prompt_tokens: response.usage.total_tokens,
        completion_tokens: 0,
        total_tokens: response.usage.total_tokens
      });

      for (const item of response.data) {
        // item.index is the position within this batch's input array
        const msg = batch[item.index];
        if (!msg) continue;
        embeddingsById.set(msg.id, item.embedding);
        embeddingCache.set(msg.id, item.embedding);
      }
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

  return embeddingsById;
}

// Returns one sentiment per message, aligned with the input array; messages
// without an embedding (failed batch) fall back to neutral
export async function classifyEmailSentiments(
  messages: GmailMessage[],
  embeddingsById: Map<string, number[]>
): Promise<EmailSentiment[]> {
  if (messages.length === 0 || embeddingsById.size === 0) {
    logger.warn('Empty input for sentiment classification', {
      messageCount: messages.length,
      embeddingCount: embeddingsById.size
    });
    return messages.map(() => ({ sentiment: 'neutral' }));
  }

  const sentiments: EmailSentiment[] = [];

  for (const msg of messages) {
    const embedding = embeddingsById.get(msg.id);
    if (!embedding) {
      sentiments.push({ sentiment: 'neutral' });
      continue;
    }

    try {
      const sentimentScore = await calculateSentimentScore(embedding);
      sentiments.push({ sentiment: determineSentiment(sentimentScore).sentiment });
    } catch (err) {
      logger.error(
        'Failed to classify sentiment for message',
        err instanceof Error ? err : new Error(String(err)),
        { }
      );
      sentiments.push({ sentiment: 'neutral' });
    }
  }

  return sentiments;
}

async function calculateSentimentScore(embedding: number[]): Promise<number> {
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

    // Get semantic sentiment anchors
    const anchors = await getSentimentAnchors();

    // Use the helper function with the loaded anchors
    return calculateSentimentScoreWithAnchors(embedding, anchors);
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

const DEFAULT_RESULTS: VibecheckResults = {
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

export async function generateDetailedAnalysis(
  messages: GmailMessage[],
  sentiments: EmailSentiment[]
): Promise<VibecheckResults> {
  if (messages.length === 0 || sentiments.length === 0) {
    logger.warn('Empty input for analysis', {
      messageCount: messages.length,
      sentimentCount: sentiments.length
    });
    return DEFAULT_RESULTS;
  }

  // Step 1: Create processed messages with their sentiments
  const processedMessages: ProcessedMessage[] = messages.map((msg, index) => ({
    message: msg,
    sentiment: sentiments[index]
  }));

  // Step 2: Serve previously analyzed messages from cache; a cached null means
  // GPT already looked at the message and extracted no insight
  const insightById = new Map<string, CachedInsight>();
  const uncached: ProcessedMessage[] = [];

  for (const pm of processedMessages) {
    const cached = insightCache.get(pm.message.id);
    if (cached === undefined) {
      uncached.push(pm);
    } else if (cached !== null) {
      insightById.set(pm.message.id, cached);
    }
  }

  if (uncached.length < processedMessages.length) {
    logger.info('Insight cache hits', {
      cached: processedMessages.length - uncached.length,
      toAnalyze: uncached.length
    });
  }

  // Step 3: Let AI analyze uncached messages, in smaller chunks for token limits
  const CHUNK_SIZE = 25;

  for (let i = 0; i < uncached.length; i += CHUNK_SIZE) {
    const chunk = uncached.slice(i, i + CHUNK_SIZE);

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.GMAIL_FEEDBACK,
          },
          {
            role: 'user',
            content: SYSTEM_PROMPTS.MESSAGE_ANALYSIS + `\n\nMessages to analyze: ${JSON.stringify(chunk.map((pm, index) => ({
  index,
  content: pm.message.body,
  subject: pm.message.subject,
  sentiment: pm.sentiment
})))}`
          },
        ],
      });

      if (completion.usage) {
        tokenTracker.trackUsage('gpt-4o-mini', MODEL_PRICING['gpt-4o-mini'], completion.usage);
      }

      const rawResult = completion.choices[0]?.message?.content;
      if (!rawResult) continue;

      const aiAnalysis = JSON.parse(rawResult);
      if (!Array.isArray(aiAnalysis.messageInsights)) {
        logger.warn('AI response missing messageInsights, skipping chunk');
        continue;
      }

      // Map AI insights back to messages by their index within this chunk
      const insightsByChunkIndex = new Map<number, CachedInsight>();
      for (const insight of aiAnalysis.messageInsights) {
        if (!chunk[insight.messageIndex]) {
          logger.warn('Invalid message index in AI response', { insight });
          continue;
        }
        insightsByChunkIndex.set(insight.messageIndex, {
          insight: insight.insight,
          quote: insight.quote,
          category: insight.category
        });
      }

      // Cache every message in the chunk — null for those GPT had nothing on
      chunk.forEach((pm, index) => {
        const extracted = insightsByChunkIndex.get(index) ?? null;
        insightCache.set(pm.message.id, extracted);
        if (extracted) insightById.set(pm.message.id, extracted);
      });
    } catch (err) {
      logger.error('Failed to analyze chunk', err instanceof Error ? err : new Error(String(err)));
      continue;
    }
  }

  // Step 4: Assemble insights in message order, attaching per-message context
  const allInsights: MessageInsight[] = [];
  for (const pm of processedMessages) {
    const extracted = insightById.get(pm.message.id);
    if (!extracted) continue;

    allInsights.push({
      messageId: pm.message.id,
      rfc822MessageId: pm.message.messageId,
      insight: extracted.insight,
      quote: extracted.quote,
      sender: pm.message.sender,
      subject: pm.message.subject,
      date: pm.message.date,
      sentiment: pm.sentiment,
      category: extracted.category
    });
  }

  // Step 5: Generate summaries using OpenAI
  try {
    const summaryCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: "json_object" },
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPTS.GMAIL_FEEDBACK
        },
        {
          role: 'user',
          content: SYSTEM_PROMPTS.SUMMARY_GENERATION + `\n\nInsights to analyze: ${JSON.stringify({
  insights: allInsights,
  sentimentBreakdown: calculateSentimentBreakdown(processedMessages),
  messageCount: processedMessages.length
})}`
        }
      ]
    });

    if (summaryCompletion.usage) {
      tokenTracker.trackUsage('gpt-4o-mini', MODEL_PRICING['gpt-4o-mini'], summaryCompletion.usage);
    }

    const summaryResult = JSON.parse(summaryCompletion.choices[0]?.message?.content || '{}');

    // Enforce character limits on the results
    const results: VibecheckResults = {
      overallSummary: (summaryResult.overallSummary || summarizeFallback(allInsights)).slice(0, CHAR_LIMITS.OVERALL_SUMMARY),
      topPraise: (summaryResult.topPraise || selectTopInsight(allInsights.filter(i => i.category === 'praise'))).slice(0, CHAR_LIMITS.TOP_POINT),
      topPain: (summaryResult.topPain || selectTopInsight(allInsights.filter(i => i.category === 'pain'))).slice(0, CHAR_LIMITS.TOP_POINT),
      topIntensity: (summaryResult.topIntensity || selectMostIntenseInsight(allInsights)).slice(0, CHAR_LIMITS.TOP_POINT),
      topRequestedFeature: (summaryResult.topRequestedFeature || selectTopInsight(allInsights.filter(i => i.category === 'feature'))).slice(0, CHAR_LIMITS.TOP_POINT),
      praisePoints: allInsights.filter(i => i.category === 'praise'),
      painPoints: allInsights.filter(i => i.category === 'pain'),
      requestedFeatures: allInsights.filter(i => i.category === 'feature'),
      sentimentBreakdown: calculateSentimentBreakdown(processedMessages)
    };

    return results;
  } catch (err) {
    logger.error('Failed to generate summaries', err instanceof Error ? err : new Error(String(err)));

    // If insight extraction also produced nothing, every chat call failed —
    // the service is down, not merely quiet
    if (allInsights.length === 0) {
      throw new AnalysisUnavailableError('Summary generation failed and no insights were extracted');
    }

    // Fallback to basic summaries if OpenAI call fails
    return {
      overallSummary: summarizeFallback(allInsights),
      topPraise: selectTopInsight(allInsights.filter(i => i.category === 'praise')),
      topPain: selectTopInsight(allInsights.filter(i => i.category === 'pain')),
      topIntensity: selectMostIntenseInsight(allInsights),
      topRequestedFeature: selectTopInsight(allInsights.filter(i => i.category === 'feature')),
      praisePoints: allInsights.filter(i => i.category === 'praise'),
      painPoints: allInsights.filter(i => i.category === 'pain'),
      requestedFeatures: allInsights.filter(i => i.category === 'feature'),
      sentimentBreakdown: calculateSentimentBreakdown(processedMessages)
    };
  }
}

function summarizeFallback(insights: MessageInsight[]): string {
  const categories = {
    praise: insights.filter(i => i.category === 'praise').length,
    pain: insights.filter(i => i.category === 'pain').length,
    feature: insights.filter(i => i.category === 'feature').length
  };

  return `Analysis of ${insights.length} feedback points found ${categories.praise} praise points, ${categories.pain} pain points, and ${categories.feature} feature requests.`;
}

function selectTopInsight(insights: MessageInsight[]): string {
  if (insights.length === 0) return "";
  return insights[0].insight;
}

function selectMostIntenseInsight(insights: MessageInsight[]): string {
  if (insights.length === 0) return "";
  // For now, just return the first insight as we don't have intensity scoring yet
  return insights[0].insight;
}

function calculateSentimentBreakdown(messages: ProcessedMessage[]): SentimentBreakdown {
  return messages.reduce((acc, { sentiment }) => {
    acc[sentiment.sentiment]++;
    return acc;
  }, { positive: 0, negative: 0, mixed: 0, neutral: 0 });
} 