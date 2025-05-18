// lib/apiClient.ts

import { logger } from '../utils/logging';

export interface VibecheckResults {
    overallSummary: string;
    topPraise: string;
    topPain: string;
    topIntensity: string;
    topRequestedFeature: string;
    praisePoints: { text: string; source?: string; sender?: string; date?: string }[];
    painPoints: { text: string; source?: string; sender?: string; date?: string }[];
    requestedFeatures: { text: string; source?: string; sender?: string; date?: string }[];
  }
  
  async function fetchVibecheckData(endpoint: string, body: any): Promise<VibecheckResults | null> {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
  
      if (!res.ok) {
        throw new Error(`API request failed: ${res.statusText}`);
      }
  
      const data = await res.json();
      return data.gmailFeedback || null;
    } catch (error) {
      logger.error('Error fetching data', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }
  
  export async function fetchGmailFeedback(accessToken: string | null): Promise<VibecheckResults | null> {
    return fetchVibecheckData('/api/gmail', { gmailAccessToken: accessToken });
  }
  