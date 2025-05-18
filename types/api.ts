export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export type Sentiment = 'positive' | 'negative' | 'mixed' | 'neutral';

// Internal representation with confidence score
export interface InternalEmailSentiment {
  sentiment: Sentiment;
  score: number;  // Confidence score between 0 and 1
}

// External representation for API responses (what users see)
export interface EmailSentiment {
  sentiment: Sentiment;
}

export interface ErrorResponse {
  error: string;
  status: number;
}

export interface GmailMessage {
  id: string;
  sender: string;
  subject: string;
  date: string;
  body: string;
}

export interface SentimentBreakdown {
  positive: number;
  negative: number;
  mixed: number;
  neutral: number;
}

export interface FeedbackPoint {
  text: string;
  source?: string;
  sender?: string;
  subject?: string;
  date?: string;
  sentiment: EmailSentiment;
  priority?: number;  // Priority score between 0 and 1
  category?: string[];  // Tags/categories for the feedback
  impact?: {
    score: number;  // Impact score between 0 and 1
    reason: string;  // Explanation of the impact score
  };
}

export interface VibecheckResults {
  overallSummary: string;
  topPraise: string;
  topPain: string;
  topIntensity: string;
  topRequestedFeature: string;
  praisePoints: FeedbackPoint[];
  painPoints: FeedbackPoint[];
  requestedFeatures: FeedbackPoint[];
  sentimentBreakdown: SentimentBreakdown;
  trends?: {
    period: string;  // e.g., "last_30_days"
    topThemes: string[];
    sentimentTrend: 'improving' | 'declining' | 'stable';
    trendData: {
      date: string;
      sentiment: SentimentBreakdown;
    }[];
  };
  metadata?: {
    processedAt: string;
    messageCount: number;
    averageConfidence: number;
    modelVersion: string;
  };
}

export interface GmailData {
  gmailFeedback: VibecheckResults;
} 