import type { VibeloopResults } from '../types/api';
import { logger } from './logging';

const DEFAULT_RESULTS: VibeloopResults = {
  overallSummary: "No messages to analyze.",
  topPraise: "No praise points found.",
  topPain: "No pain points found.",
  topIntensity: "No intense feedback found.",
  topRequestedFeature: "No feature requests found.",
  praisePoints: [],
  painPoints: [],
  requestedFeatures: [],
  sentimentBreakdown: { positive: 0, negative: 0, mixed: 0, neutral: 0 }
};

function isVibeloopResults(value: unknown): value is VibeloopResults {
  return (
    typeof value === 'object' &&
    value !== null &&
    'overallSummary' in value &&
    'praisePoints' in value &&
    'painPoints' in value &&
    'requestedFeatures' in value &&
    'sentimentBreakdown' in value
  );
}

/**
 * Parses an OpenAI response that's expected to be JSON
 * @param raw The raw response string from OpenAI
 * @returns Parsed JSON object
 * @throws Error if parsing fails
 */
export function parseOpenAIResponse<T>(raw: string): T | null {
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      logger.error('Failed to parse OpenAI response', err instanceof Error ? err : new Error(String(err)), { raw });
      return null;
    }

    if (parsed && typeof parsed === 'object') {
      // Type guard for VibeloopResults
      if (isVibeloopResults(parsed)) {
        return parsed as T;
      }

      logger.error('Invalid OpenAI response format', new Error('Invalid response structure'), { keys: Object.keys(parsed as object) });
      return null;
    }

    logger.error('Invalid OpenAI response', new Error('Response is not an object'));
    return null;
  } catch (err) {
    logger.error('Error parsing OpenAI response', err instanceof Error ? err : new Error(String(err)));
    return null;
  }
} 