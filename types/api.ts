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
  id: string;  // Gmail's internal ID
  messageId: string;  // RFC 2822 Message-ID header
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
  messageId?: string;  // RFC 2822 Message-ID header
  id?: string;  // Gmail's internal ID
  sentiment: EmailSentiment;
  priority?: number;  // Priority score between 0 and 1
  category?: string[];  // Tags/categories for the feedback
  impact?: {
    score: number;  // Impact score between 0 and 1
    reason: string;  // Explanation of the impact score
  };
}

// Message with its sentiment analysis
export interface ProcessedMessage {
  message: GmailMessage;
  sentiment: EmailSentiment;
  embedding?: number[];  // Optional as we might not always need to store this
}

// An insight extracted from a specific message
export interface MessageInsight {
  messageId: string;  // Gmail's internal ID
  rfc822MessageId: string;  // RFC 2822 Message-ID
  insight: string;  // The analysis text
  quote: string;    // The exact quote from the message
  sender: string;   // The sender of the message
  subject: string;  // The subject of the message
  date: string;     // The date of the message
  sentiment: EmailSentiment;
  category: 'praise' | 'pain' | 'feature';  // The type of insight
}

// The final analysis result
export interface VibeloopResults {
  overallSummary: string;
  topPraise: string;
  topPain: string;
  topIntensity: string;
  topRequestedFeature: string;
  praisePoints: MessageInsight[];
  painPoints: MessageInsight[];
  requestedFeatures: MessageInsight[];
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
  gmailFeedback: VibeloopResults;
} 