import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { fetchEmailCountLast30Days } from '../../lib/gmail';
import { logger } from '../../utils/logging';
import { withRateLimit } from '../../lib/rate-limit';

// Request validation schema
const requestSchema = z.object({
  gmailAccessToken: z.string()
    .min(1, 'Access token is required')
    .regex(/^[a-zA-Z0-9-._~+/]+=*$/, 'Invalid access token format'),
});

type RequestBody = z.infer<typeof requestSchema>;

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
    
    // Add request tracking
    const requestId = crypto.randomUUID();
    logger.info('Fetching email counts', { 
      requestId,
      method: req.method,
      url: req.url
    });

    const emailCounts = await fetchEmailCountLast30Days(validatedBody.gmailAccessToken);
    
    logger.info('Email counts fetched successfully', {
      requestId,
      dayCount: emailCounts.length
    });

    return res.status(200).json({ 
      requestId,
      emailCounts 
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
      logger.error('Failed to fetch Gmail counts', error);
    } else {
      logger.error('Failed to fetch Gmail counts: Unknown error');
    }

    return res.status(500).json({ 
      error: 'Internal Server Error',
      errorId,
      message: 'Failed to fetch Gmail counts'
    });
  }
});

export default handler; 