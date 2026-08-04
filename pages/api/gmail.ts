import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { fetchGmailMessages } from '../../lib/gmail';
import { getEmailEmbeddings, classifyEmailSentiments, generateDetailedAnalysis, AnalysisUnavailableError } from '../../lib/openai';
import { withRateLimit } from '../../lib/rate-limit';
import type { VibecheckResults } from '../../types/api';
import { logger } from '../../utils/logging';

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

// Each request triggers a full Gmail fetch plus OpenAI analysis, so keep the limit tight
const handler = withRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10
})(async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {
    // Identify the caller from their NextAuth session — tokens are never accepted
    // from the request body
    const session = await getServerSession(req, res, authOptions);
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Sign in with Google to analyze your inbox.'
      });
    }

    const startTime = Date.now();

    // Add request tracking
    const requestId = crypto.randomUUID();
    logger.info('Starting analysis', {
      requestId,
      method: req.method,
      url: req.url
    });

    // Fetch Gmail messages
    const gmailMessages = await fetchGmailMessages(session.accessToken);
    
    // Log progress without sensitive data
    logger.info(`Processing messages`, { 
      requestId,
      messageCount: gmailMessages.length 
    });
    
    if (gmailMessages.length === 0) {
      logger.info('No messages found', { requestId });
      return res.status(200).json({ 
        requestId,
        gmailFeedback: EMPTY_RESULTS,
        messages: [],
        sentiments: []
      });
    }

    // Step 1: Get embeddings for all messages
    const embeddings = await getEmailEmbeddings(gmailMessages);

    // Messages exist but nothing could be embedded: the AI service is failing
    // (quota, outage, bad key) — surface it instead of returning all-neutral results
    if (embeddings.size === 0) {
      logger.error('No embeddings produced for any message — AI service unavailable', undefined, { requestId });
      return res.status(502).json({
        error: 'AI Analysis Unavailable',
        message: 'The AI service could not analyze your messages — it may be unavailable or out of credits. Check the server logs for details.'
      });
    }

    logger.info(`Embeddings completed`, { requestId });

    // Step 2: Classify sentiments using embeddings
    const sentiments = await classifyEmailSentiments(gmailMessages, embeddings);
    
    // Calculate sentiment breakdown
    const sentimentBreakdown = sentiments.reduce((acc, { sentiment }) => {
      acc[sentiment]++;
      return acc;
    }, { positive: 0, negative: 0, mixed: 0, neutral: 0 });
    
    logger.info('Analysis progress', { 
      requestId,
      messageCount: gmailMessages.length,
      sentimentBreakdown
    });

    // Step 3: Generate detailed analysis
    const analysis = await generateDetailedAnalysis(gmailMessages, sentiments);

    const duration = Date.now() - startTime;
    logger.info('Analysis completed', { 
      requestId,
      duration_ms: duration,
      messageCount: gmailMessages.length,
      sentimentBreakdown
    });

    return res.status(200).json({
      requestId,
      gmailFeedback: analysis,
      messages: gmailMessages,
      sentiments: sentiments
    });
  } catch (error) {
    // Total AI failure detected downstream of embeddings (chat calls all failed)
    if (error instanceof AnalysisUnavailableError) {
      logger.error('Analysis unavailable', error);
      return res.status(502).json({
        error: 'AI Analysis Unavailable',
        message: 'The AI service could not analyze your messages — it may be unavailable or out of credits. Check the server logs for details.'
      });
    }

    // Handle other errors
    const errorId = crypto.randomUUID();
    if (error instanceof Error) {
      logger.error('Analysis failed', error);
    } else {
      logger.error('Analysis failed: Unknown error');
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      errorId,
      message: 'Failed to analyze Gmail data'
    });
  }
});

export default handler;
