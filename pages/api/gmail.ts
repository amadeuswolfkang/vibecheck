import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchGmailMessages } from '../../lib/gmail';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { gmailAccessToken } = req.body;
  if (!gmailAccessToken) {
    return res.status(400).json({ error: 'Missing Gmail access token' });
  }

  try {
    // Fetch Gmail messages
    const gmailMessages = await fetchGmailMessages(gmailAccessToken);
    if (gmailMessages.length === 0) {
      return res.status(200).json({ gmailFeedback: [] });
    }

    // Prepare the input for the OpenAI model
    const gmailInput = gmailMessages
      .slice(0, 50)
      .map(
        (msg) =>
          `From: ${msg.sender}\nSubject: ${msg.subject}\nDate: ${msg.date}\n\n${msg.body}`
      )
      .join('\n\n');

    // Generate feedback summary
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a highly responsive, context-aware feedback analyzer and aggregator designed for solo founders, indie developers, and small businesses. Your role is to extract, summarize, and categorize user feedback from Gmail messages, providing concise, actionable insights to improve products.',
        },
        {
          role: 'user',
          content: `You're given a list of Gmail messages. Extract real product feedback and summarize it into insights.
          
          Return only valid JSON in the following format:
          {
            "overallSummary": "A concise, 5–7 sentence overview capturing the most common themes from the feedback, including specific feature praise, pain points, intense reactions, and commonly requested improvements.",
            "topPraise": "The most commonly praised aspect or feature.",
            "topPain": "The most common complaint or pain point.",
            "topIntensity": "The most commonly emotional opinion on an aspect or feature.",
            "topRequestedFeature": "The most commonly requested specific feature or improvement.",
            "praisePoints": [
              {
                "text": "Summarized insight in 1-2 sentences (e.g. 'Users love the minimal design. It's clean and easy to navigate.')",
                "source": "A real, exact quoted Gmail message that best illustrates this praise, limited to 80 words. If the quote is longer than 80 words, truncate with an ellipsis and follow it with [truncated].",
                "sender": "The sender of the email (e.g. 'John Doe <john@example.com>').",
                "subject": "The subject of the email.",
                "date": "The date the email was sent."
              }
            ],
            "painPoints": [
              {
                "text": "Summarized issue in 1-2 sentences (e.g. 'Shipping delays are a common frustration')",
                "source": "A real, exact quoted Gmail message that best illustrates this praise, limited to 80 words. If the quote is longer than 80 words, truncate with an ellipsis and follow it with [truncated].",
                "sender": "The sender of the email (e.g. 'John Doe <john@example.com>').",
                "subject": "The subject of the email.",
                "date": "The date the email was sent."
              }
            ],
            "requestedFeatures": [
              {
                "text": "A specific feature request that clearly describes a desired addition or enhancement (e.g. 'Add a dark mode', 'Support for offline use', 'Customizable notifications')",
                "source": "A real quoted Gmail message that best illustrates this specific feature request.",
                "sender": "The sender of the email.",
                "subject": "The subject of the email.",
                "date": "The date the email was sent."
              }
            ]
          }
          
          Comments:
          ${gmailInput}`,
        },
      ],
    });

    let raw = completion.choices[0]?.message?.content?.trim() || '';
    raw = raw.replace(/^```json|```$/g, '').trim();

    try {
      const parsed = JSON.parse(raw);
      res.status(200).json({ gmailFeedback: parsed });
    } catch (jsonErr) {
      console.error('Gmail Vibecheck JSON parse error:', jsonErr);
      console.error('Raw response was:', raw);
      res.status(500).json({ error: 'Failed to parse AI response', raw });
    }
  } catch (err: any) {
    console.error('Gmail Vibecheck API error:', err.message || err);
    res.status(500).json({ error: 'AI summarization failed' });
  }
}
