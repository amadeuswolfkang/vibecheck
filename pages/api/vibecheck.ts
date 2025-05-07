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
  "overallSummary": "A concise, 5–7 sentence summary capturing the overall tone and major themes of the feedback. Include both positive and negative sentiments, highlighting general user impressions, common frustrations, and frequently requested improvements. Focus on a balanced, professional tone that reflects the broader user experience without getting lost in overly specific details (e.g. 'Users generally appreciate the intuitive design but often mention performance issues as a pain point')."
  "topPraise": "The most commonly praised aspect, ideally related to a specific feature, design choice, or user experience element (e.g. 'Users love the clean interface', 'The onboarding flow is intuitive', 'The dark mode is highly appreciated').",
  "topPain": "The most common complaint or pain point, ideally related to a specific feature, design choice, or user experience element (e.g. 'Users find the search function slow', 'The app crashes on older devices', 'Navigation is confusing').",
  "topIntensity": "The strongest or most emotional opinion, ideally related to a specific feature, design choice, or user experience element (e.g. 'Users are frustrated with slow loading times', 'Users feel strongly about the lack of customization options').",
  "topRequestedFeature": "The most commonly requested specific feature or improvement, ideally a concrete product addition (e.g. 'Add dark mode', 'Support for offline use').",
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
  ],
  "requestedFeatures": [
    {
      "text": "A specific feature request that clearly describes a desired addition or enhancement (e.g. 'Add a dark mode', 'Support for offline use', 'Customizable notifications')",
      "source": "A real quoted Reddit comment from the input that best illustrates this specific feature request."
    }
  ]
}

Instructions:
- Include 3 to 5 items for each section (or fewer if there aren't enough unique insights).
- Each text must summarize a unique insight or feedback theme. Do not repeat the same insight across multiple items.
- Focus on specific features, designs, or parts of the user experience (e.g. 'Users love the minimal design', 'Navigation is confusing', 'Users want a dark mode'). Avoid vague generalizations like 'Good quality' or 'Bad experience'.
- Requested features should be specific, actionable product additions or enhancements (e.g. 'Add dark mode', 'Support offline mode', 'Customizable notifications'). Avoid vague, general improvements like 'Better quality' or 'Fix performance'.
- Each source must be a direct, unedited quote from the input text. Do not paraphrase, truncate, reword, or synthesize.
- Do not invent or simulate quotes. Use only full, original comments.
- Do not include typographic quotation marks in the comment text.
- Return only a valid JSON object. No markdown, no code fences, no extra text, no commentary, no formatting.

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
