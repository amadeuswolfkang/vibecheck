import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { fetchGmailMessages } from '../../lib/gmail';
import { getEmailEmbeddings, classifyEmailSentiments, generateDetailedAnalysis } from '../../lib/openai';
import { SYSTEM_PROMPTS, FEEDBACK_RESPONSE_FORMAT } from '../../constants/prompts';
import { parseOpenAIResponse } from '../../utils/openai';
import type { VibeloopResults, Sentiment } from '../../types/api';
import { logger, format } from '../../utils/logging';
import { withRateLimit } from '../../lib/rate-limit';

// Request validation schema
const requestSchema = z.object({
  gmailAccessToken: z.string()
    .min(1, 'Access token is required')
    .regex(/^[a-zA-Z0-9-._~+/]+=*$/, 'Invalid access token format'),
});

type RequestBody = z.infer<typeof requestSchema>;

const EMPTY_RESULTS: VibeloopResults = {
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

// Apply standard rate limiting
const handler = withRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30 // 30 requests per minute (1 request every 2 seconds)
})(async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {
    // Validate request body
    const validatedBody = requestSchema.parse(req.body);
    const startTime = Date.now();
    
    // Add request tracking
    const requestId = crypto.randomUUID();
    logger.info('Starting analysis', { 
      requestId,
      method: req.method,
      url: req.url
    });

    // Fetch Gmail messages
    const gmailMessages = await fetchGmailMessages(validatedBody.gmailAccessToken);
    
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
    // Handle validation errors
    if (error instanceof z.ZodError) {
      logger.warn('Validation error', {
        issues: error.issues.map(issue => ({
          path: issue.path,
          message: issue.message
        }))
      });
      return res.status(400).json({ 
        error: 'Validation Error',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
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
