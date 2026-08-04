export type Sentiment = 'positive' | 'negative' | 'mixed' | 'neutral';

// External representation for API responses (what users see)
export interface EmailSentiment {
  sentiment: Sentiment;
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
export interface VibecheckResults {
  overallSummary: string;
  topPraise: string;
  topPain: string;
  topIntensity: string;
  topRequestedFeature: string;
  praisePoints: MessageInsight[];
  painPoints: MessageInsight[];
  requestedFeatures: MessageInsight[];
  sentimentBreakdown: SentimentBreakdown;
} 