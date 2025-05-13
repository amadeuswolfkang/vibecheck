import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchGmailMessages } from '../../lib/gmail';
import snoowrap from 'snoowrap';
import OpenAI from 'openai';

const reddit = new snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT!,
  clientId: process.env.REDDIT_CLIENT_ID!,
  clientSecret: process.env.REDDIT_CLIENT_SECRET!,
  username: process.env.REDDIT_USERNAME!,
  password: process.env.REDDIT_PASSWORD!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

async function fetchRedditComments(keyword: string): Promise<string[]> {
  const results = await reddit.search({
    query: keyword,
    sort: 'relevance',
    time: 'week',
    limit: 10,
  });

  const comments: string[] = [];

  for (const post of results) {
    try {
      const fullPost = await (post as any).expandReplies({ limit: 5, depth: 1 });

      fullPost.comments?.forEach((c: any) => {
        if (
          c.body &&
          (c.score > 10 ||
            c.upvote_ratio > 0.8 ||
            (c.all_awardings?.length || 0) > 0)
        ) {
          comments.push(c.body);
        }
      });
    } catch (err) {
      console.warn('Failed to load comments for post:', post.id);
    }
  }

  return comments;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end();

  const { query, gmailAccessToken } = req.body;

  // Handle Reddit-only Vibecheck
  if (query && !gmailAccessToken) {
    try {
      const comments = await fetchRedditComments(query);
      const input = comments.slice(0, 50).join('\n\n');

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a senior product designer analyzing raw user feedback from Reddit.',
          },
          {
            role: 'user',
            content: `You're given a list of Reddit comments about "${query}". Your job is to extract real product feedback and summarize it into insights.

Comments:
${input}`,
          },
        ],
      });

      let raw = completion.choices[0].message.content || '';
      raw = raw.trim().replace(/^```json|```$/g, '').trim();

      const parsed = JSON.parse(raw);
      res.status(200).json({ redditFeedback: parsed });
    } catch (err: any) {
      console.error('Reddit Vibecheck API error:', err.message || err);
      res.status(500).json({ error: 'AI summarization failed' });
    }
    return;
  }

  // Handle Mixed Gmail + Reddit Vibecheck
  if (query && gmailAccessToken) {
    try {
      const comments = await fetchRedditComments(query);
      const gmailMessages = await fetchGmailMessages(gmailAccessToken);
      const input = [...gmailMessages, ...comments].slice(0, 50).join('\n\n');

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a senior product designer analyzing raw user feedback from multiple sources.',
          },
          {
            role: 'user',
            content: `You're given a mix of Gmail messages and Reddit comments. Extract real product feedback and summarize it into insights.

Comments:
${input}`,
          },
        ],
      });

      let raw = completion.choices[0].message.content || '';
      raw = raw.trim().replace(/^```json|```$/g, '').trim();

      const parsed = JSON.parse(raw);
      res.status(200).json({ mixedFeedback: parsed });
    } catch (err: any) {
      console.error('Mixed Vibecheck API error:', err.message || err);
      res.status(500).json({ error: 'AI summarization failed' });
    }
    return;
  }

  // If neither query nor Gmail token provided
  res.status(400).json({ error: 'Missing query or Gmail access token' });
}
