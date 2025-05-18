import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchEmailCountLast30Days } from '../../lib/gmail';
import { logger } from '../../utils/logging';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { gmailAccessToken } = req.body;
  if (!gmailAccessToken) {
    return res.status(400).json({ error: 'Missing Gmail access token' });
  }

  try {
    const emailCounts = await fetchEmailCountLast30Days(gmailAccessToken);
    return res.status(200).json({ emailCounts });
  } catch (err) {
    logger.error('Gmail Counts API error', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ error: 'Failed to fetch Gmail counts' });
  }
} 