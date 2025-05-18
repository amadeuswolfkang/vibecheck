// lib/apiClient.ts

import { logger } from '../utils/logging';

export interface VibeloopResults {
    overallSummary: string;
    topPraise: string;
    topPain: string;
    topIntensity: string;
    topRequestedFeature: string;
    praisePoints: FeedbackPoint[];
    painPoints: FeedbackPoint[];
    requestedFeatures: FeedbackPoint[];
    sentimentBreakdown: SentimentBreakdown;
}

async function fetchVibeloopData(endpoint: string, body: any): Promise<VibeloopResults | null> {
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            throw new Error(`API request failed: ${res.status}`);
        }

        const data = await res.json();
        return data;
    } catch (error) {
        logger.error('API request failed', error instanceof Error ? error : new Error(String(error)));
        return null;
    }
}

export async function fetchGmailFeedback(accessToken: string | null): Promise<VibeloopResults | null> {
    return fetchVibeloopData('/api/gmail', { gmailAccessToken: accessToken });
}
  