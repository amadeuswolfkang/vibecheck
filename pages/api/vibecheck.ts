import type { NextApiRequest, NextApiResponse } from 'next';
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

  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing query' });
  }

  try {
    const comments = await fetchRedditComments(query);
    const input = comments.slice(0, 50).join('\n\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a senior product designer analyzing raw user feedback.',
        },
        {
          role: 'user',
          content: `You're given a list of Reddit comments about "${query}". Your job is to extract real product feedback and summarize it into insights.

Return only valid JSON in the following format:
{
  "overallSummary": "A 5–7 sentence summary of overall sentiment and themes.",
  "topPraise": "The most commonly praised aspect or feature.",
  "topPain": "The most common complaint or pain point.",
  "topIntensity": "The strongest or most emotional opinion.",
  "praisePoints": [
    {
      "text": "Summarized insight (e.g. 'Users love the minimal design')",
      "source": "A real quoted Reddit comment from the input that best illustrates this praise."
    }
  ],
  "painPoints": [
    {
      "text": "Summarized issue (e.g. 'Shipping delays are a common frustration')",
      "source": "A real quoted Reddit comment from the input that best illustrates this pain point."
    }
  ]
}

Instructions:
- Include 3 to 5 items in both praisePoints and painPoints (or fewer if there aren't enough unique insights).
- Each "text" should summarize the insight or feedback theme.
- Each "source" must be a direct, unedited quote from one of the actual Reddit comments provided. Do not paraphrase, truncate, reword, or synthesize.
- Do not invent or simulate quotes. Do not generate placeholder users or dialogue.
- Only select full and original comments from the provided input text.
- Do not include typographic quotation marks in the comment.
- If no appropriate quote exists for a point, omit that point entirely.

Return a valid JSON object only. No markdown, no commentary, no code fences.

Comments:
${input}`,
        },
      ],
    });

    let raw = completion.choices[0].message.content || '';
    raw = raw
      .trim()
      .replace(/^```json|```$/g, '')
      .trim();

    const parsed = JSON.parse(raw);
    res.status(200).json(parsed);
  } catch (err: any) {
    console.error('Vibecheck API error:', err.message || err);
    res.status(500).json({ error: 'AI summarization failed' });
  }
}
