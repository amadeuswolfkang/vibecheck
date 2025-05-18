import OpenAI from 'openai';
import type { 
  EmailSentiment, 
  InternalEmailSentiment,
  Sentiment, 
  GmailMessage, 
  VibeloopResults,
  SentimentBreakdown,
  ProcessedMessage,
  MessageInsight
} from '../types/api';
import { logger, tokenTracker } from '../utils/logging';
import { SYSTEM_PROMPTS, FEEDBACK_RESPONSE_FORMAT, CHAR_LIMITS } from '../constants/prompts';
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

  // Step 2: Process in smaller chunks for token limits
  const CHUNK_SIZE = 25;
  const allInsights: MessageInsight[] = [];

  for (let i = 0; i < processedMessages.length; i += CHUNK_SIZE) {
    const chunk = processedMessages.slice(i, i + CHUNK_SIZE);
    
    try {
      // Step 3: Let AI analyze each message in the chunk
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
            content: SYSTEM_PROMPTS.MESSAGE_ANALYSIS + `\n\nMessages to analyze: ${JSON.stringify(chunk.map((pm, index) => ({
  index,
  content: pm.message.body,
  subject: pm.message.subject,
  sentiment: pm.sentiment
})))}`
          },
        ],
      });

      const rawResult = completion.choices[0]?.message?.content;
      if (!rawResult) continue;

      // Step 4: Parse AI response and reconstruct with preserved message data
      const aiAnalysis = JSON.parse(rawResult);
      
      // Step 5: Map AI insights back to original messages
      const chunkInsights = aiAnalysis.messageInsights
        .map((insight: any) => {
          const processedMessage = chunk[insight.messageIndex];
          if (!processedMessage) {
            logger.warn('Invalid message index in AI response', { insight });
            return null;
          }

          return {
            messageId: processedMessage.message.id,
            rfc822MessageId: processedMessage.message.messageId,
            insight: insight.insight,
            quote: insight.quote,
            sender: processedMessage.message.sender,
            subject: processedMessage.message.subject,
            date: processedMessage.message.date,
            sentiment: processedMessage.sentiment,
            category: insight.category
          } as MessageInsight;
        })
        .filter(Boolean);

      allInsights.push(...chunkInsights);
    } catch (err) {
      logger.error('Failed to analyze chunk', err instanceof Error ? err : new Error(String(err)));
      continue;
    }
  }

  // Step 6: Generate summaries using OpenAI
  try {
    const summaryCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
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

    const summaryResult = JSON.parse(summaryCompletion.choices[0]?.message?.content || '{}');

    // Enforce character limits on the results
    const results: VibeloopResults = {
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