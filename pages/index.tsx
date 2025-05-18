import { useState } from 'react';
import { getSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import FeedbackDisplay from '../components/features/FeedbackDisplay';
import EmailCountChart from '../components/features/EmailCountChart';
import { API_ENDPOINTS } from '../constants/api';
import { useAuth } from '../hooks/useAuth';
import type { VibecheckResults, GmailMessage, EmailSentiment } from '../types/api';
import { logger, format } from '../utils/logging';

const LOADING_MESSAGES = [
  "Finding insights... This won't take long.",
  "Connecting the dots...",
  "Reading the room...",
  "Let's see what the audience thinks..."
] as const;

type LoadingMessage = typeof LOADING_MESSAGES[number];

const EMPTY_RESULTS: VibecheckResults = {
  overallSummary: "No feedback available to analyze.",
  topPraise: "No praise points found.",
  topPain: "No pain points found.",
  topIntensity: "No intense feedback found.",
  topRequestedFeature: "No feature requests found.",
  praisePoints: [],
  painPoints: [],
  requestedFeatures: [],
  sentimentBreakdown: {
    positive: 0,
    negative: 0,
    mixed: 0,
    neutral: 0
  }
};

export default function Home() {
  const { isAuthenticated, user, signInWithGoogle, signOutUser } = useAuth();
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailResults, setGmailResults] = useState<VibecheckResults | null>(null);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [sentiments, setSentiments] = useState<EmailSentiment[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<LoadingMessage>(LOADING_MESSAGES[0]);
  const [previousResults, setPreviousResults] = useState<VibecheckResults | null>(null);
  const [previousMessages, setPreviousMessages] = useState<GmailMessage[]>([]);
  const [previousSentiments, setPreviousSentiments] = useState<EmailSentiment[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleGmailOnlyCheck() {
    setIsAnalyzing(true);
    setGmailLoading(true);

    // Store current results before starting new analysis
    if (gmailResults) {
      setPreviousResults(gmailResults);
      setPreviousMessages(messages);
      setPreviousSentiments(sentiments);
    }

    const randomMessage = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
    setLoadingMessage(randomMessage);

    try {
      const session = await getSession();

      if (!session?.accessToken) {
        logger.error('No active session or missing access token');
        setError('Please sign in to continue');
        setGmailLoading(false);
        setIsAnalyzing(false);
        return;
      }

      const body = {
        gmailAccessToken: session.accessToken,
      };

      const res = await fetch(API_ENDPOINTS.GMAIL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        // Clear previous results before setting new ones
        setPreviousResults(null);
        setPreviousMessages([]);
        setPreviousSentiments([]);
        
        // Update state with new results
        setGmailResults(data.gmailFeedback);
        setMessages(data.messages);
        setSentiments(data.sentiments);

        // Log analysis completion with metrics
        logger.info('Analysis completed successfully', {
          message: format.successBlock('Analysis completed successfully', {
            type: 'gmail_analysis',
            metrics: {
              messages: data.messages.length,
              sentiments: data.sentiments.length,
              insights: {
                praise: data.gmailFeedback.praisePoints.length,
                pain: data.gmailFeedback.painPoints.length,
                features: data.gmailFeedback.requestedFeatures.length
              },
              sentiment_breakdown: data.gmailFeedback.sentimentBreakdown
            }
          })
        });
      } else {
        logger.error('Error fetching Gmail data', new Error('API request failed'), { response: data });
        setError('Failed to fetch Gmail data');
        // Restore previous results on error
        setGmailResults(previousResults);
        setMessages(previousMessages);
        setSentiments(previousSentiments);
      }
    } catch (error) {
      logger.error('Error in Gmail API call', error instanceof Error ? error : new Error(String(error)));
      setError('An error occurred while fetching your Gmail data');
      // Restore previous results on error
      setGmailResults(previousResults);
      setMessages(previousMessages);
      setSentiments(previousSentiments);
    } finally {
      setGmailLoading(false);
      setIsAnalyzing(false);
    }
  }

  return (
    <Layout
      isAuthenticated={isAuthenticated}
      userEmail={user?.email}
      onSignIn={signInWithGoogle}
      onSignOut={signOutUser}
    >
      <div className="flex flex-col items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={gmailLoading ? loadingMessage : "ready"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="text-gray-500 dark:text-gray-400 mb-6 mt-2 min-h-[24px]"
          >
            {gmailLoading ? loadingMessage : "Ready to cut through the noise?"}
          </motion.div>
        </AnimatePresence>
        <button
          onClick={handleGmailOnlyCheck}
          className="text-base bg-emerald-500 text-white px-6 sm:px-8 h-10 rounded-full hover:bg-emerald-600 transition font-medium inline-flex items-center justify-center"
          disabled={!isAuthenticated || gmailLoading}
        >
          <div className="w-[60px] flex items-center justify-center">
            {gmailLoading ? <LoadingSpinner className="h-5 w-5" /> : 'Analyze'}
          </div>
        </button>
      </div>

      <AnimatePresence>
        {(gmailResults || previousResults) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="space-y-8 mt-8"
          >
            <EmailCountChart 
              results={gmailResults || previousResults || EMPTY_RESULTS} 
              messages={messages.length > 0 ? messages : previousMessages}
              sentiments={sentiments.length > 0 ? sentiments : previousSentiments}
              isAnalyzing={isAnalyzing}
            />
            <FeedbackDisplay 
              data={gmailResults || previousResults || EMPTY_RESULTS}
              isAnalyzing={isAnalyzing}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
