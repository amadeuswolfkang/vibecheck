// lib/apiClient.ts

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
  
  export async function fetchVibecheckData(
    endpoint: string,
    body: Record<string, any>,
    accessToken?: string
  ): Promise<VibecheckResults | null> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
  
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
  
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
  
      if (!response.ok) {
        console.error(`Failed to fetch ${endpoint}: ${response.statusText}`);
        return null;
      }
  
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      return null;
    }
  }
  
  export async function fetchRedditFeedback(query: string): Promise<VibecheckResults | null> {
    return fetchVibecheckData('/api/reddit', { query });
  }
  
  export async function fetchGmailFeedback(accessToken: string | null): Promise<VibecheckResults | null> {
    return fetchVibecheckData('/api/gmail', { gmailAccessToken: accessToken });
  }
  