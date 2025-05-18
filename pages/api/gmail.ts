import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchGmailMessages } from '../../lib/gmail';
import { getEmailEmbeddings, classifyEmailSentiments, generateDetailedAnalysis } from '../../lib/openai';
import { SYSTEM_PROMPTS, FEEDBACK_RESPONSE_FORMAT } from '../../constants/prompts';
import { parseOpenAIResponse } from '../../utils/openai';
import type { VibecheckResults, Sentiment } from '../../types/api';
import { logger, format } from '../../utils/logging';

const EMPTY_RESULTS: VibecheckResults = {
  overallSummary: "No feedback available to analyze.",
  topPraise: "No praise points found.",
  topPain: "No pain points found.",
  topIntensity: "No intense feedback found.",
  topRequestedFeature: "No feature requests found.",
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { gmailAccessToken } = req.body;
  if (!gmailAccessToken) {
    logger.warn('Missing Gmail access token in request');
    return res.status(400).json({ error: 'Missing Gmail access token' });
  }

  try {
    const startTime = Date.now();
    // Log start of analysis
    logger.info('Starting Gmail feedback analysis process');

    // Fetch Gmail messages
    const gmailMessages = await fetchGmailMessages(gmailAccessToken);
    logger.info('Gmail messages fetched', { message: format.metric('count', gmailMessages.length) });
    
    if (gmailMessages.length === 0) {
      logger.info('No messages found, returning empty results');
      return res.status(200).json({ 
        gmailFeedback: EMPTY_RESULTS,
        messages: [],
        sentiments: []
      });
    }

    // Step 1: Get embeddings for all messages
    logger.debug('Getting embeddings for messages', { message: format.metric('count', gmailMessages.length) });
    const embeddings = await getEmailEmbeddings(gmailMessages);
    logger.info('Embeddings generated', { message: format.metric('count', embeddings.length) });

    // Step 2: Classify sentiments using embeddings
    logger.debug('Classifying sentiments');
    const sentiments = await classifyEmailSentiments(gmailMessages, embeddings);
    
    // Calculate sentiment breakdown from embeddings
    const sentimentBreakdown = sentiments.reduce((acc, { sentiment }) => {
      acc[sentiment]++;
      return acc;
    }, { positive: 0, negative: 0, mixed: 0, neutral: 0 });
    
    logger.info('Sentiments classified', { message: format.breakdown(sentimentBreakdown) });

    // Step 3: Generate detailed analysis using GPT-3.5-turbo
    logger.debug('Generating detailed analysis');
    const analysis = await generateDetailedAnalysis(gmailMessages, sentiments);

    // Parse and validate the response
    logger.debug('Parsing and validating response');
    const parsed = parseOpenAIResponse<VibecheckResults>(JSON.stringify(analysis));
    
    // Use our embedding-based sentiment classifications
    const results: VibecheckResults = parsed ? {
      ...parsed,
      sentimentBreakdown
    } : EMPTY_RESULTS;

    logger.info('Successfully processed feedback', {
      message: format.successBlock('Successfully processed feedback', {
        messageCount: gmailMessages.length,
        insights: {
          praisePoints: results.praisePoints.length,
          painPoints: results.painPoints.length,
          featureRequests: results.requestedFeatures.length
        },
        sentimentBreakdown
      })
    });
    
    return res.status(200).json({ 
      gmailFeedback: results,
      messages: gmailMessages,
      sentiments: sentiments
    });
  } catch (err: unknown) {
    logger.error(
      'Failed to process feedback',
      err instanceof Error ? err : new Error(String(err)),
      { method: req.method, path: req.url }
    );
    return res.status(500).json({ error: 'Failed to process feedback' });
  }
}
