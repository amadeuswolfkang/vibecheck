import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import FeedbackDisplay from '../components/features/FeedbackDisplay';
import EmailCountChart from '../components/features/EmailCountChart';
import { API_ENDPOINTS } from '../constants/api';
import { useAuth } from '../hooks/useAuth';
import type { VibecheckResults, GmailMessage, EmailSentiment } from '../types/api';
import { logger } from '../utils/logging';

const LOADING_MESSAGES = [
  "Finding insights... This won't take long.",
  "Connecting the dots...",
  "Reading the room...",
  "Let's see what the audience thinks..."
] as const;

type LoadingMessage = typeof LOADING_MESSAGES[number];

export default function Home() {
  const { isAuthenticated, user, signInWithGoogle, signOutUser } = useAuth();
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailResults, setGmailResults] = useState<VibecheckResults | null>(null);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [sentiments, setSentiments] = useState<EmailSentiment[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<LoadingMessage>(LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);

  async function handleGmailOnlyCheck() {
    setIsAnalyzing(true);
    setGmailLoading(true);
    setError(null);

    const randomMessage = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
    setLoadingMessage(randomMessage);

    try {
      // The server identifies the caller from the NextAuth session cookie
      const res = await fetch(API_ENDPOINTS.GMAIL, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setGmailResults(data.gmailFeedback);
        setMessages(data.messages);
        setSentiments(data.sentiments);

        // Log only non-sensitive metrics
        logger.info('Analysis completed', {
          total_messages: data.messages.length,
          total_insights: {
            praise: data.gmailFeedback.praisePoints.length,
            pain: data.gmailFeedback.painPoints.length,
            features: data.gmailFeedback.requestedFeatures.length
          },
          sentiment_counts: data.gmailFeedback.sentimentBreakdown
        });
      } else {
        // Existing results are left untouched, so the last good analysis stays visible
        logger.error('Analysis failed');
        setError(data?.message || 'Failed to analyze Gmail data');
      }
    } catch (error) {
      logger.error('Analysis failed');
      setError('An error occurred during analysis');
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
            className="text-gray-600 dark:text-gray-400 mb-6 mt-2 min-h-[24px]"
          >
            {gmailLoading ? loadingMessage : "Ready to cut through the noise?"}
          </motion.div>
        </AnimatePresence>
        <button
          onClick={handleGmailOnlyCheck}
          className="text-base bg-emerald-700 text-white px-6 sm:px-8 h-10 rounded-full hover:bg-emerald-800 transition font-medium inline-flex items-center justify-center"
          disabled={!isAuthenticated || gmailLoading}
        >
          <div className="w-[60px] flex items-center justify-center">
            {gmailLoading ? <LoadingSpinner className="h-5 w-5" /> : 'Analyze'}
          </div>
        </button>
        {error && !gmailLoading && (
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-400 mt-4 max-w-md text-center">
            {error}
          </p>
        )}
      </div>

      <AnimatePresence>
        {gmailResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="space-y-8 mt-8"
          >
            <EmailCountChart
              results={gmailResults}
              messages={messages}
              sentiments={sentiments}
              isAnalyzing={isAnalyzing}
            />
            <FeedbackDisplay
              data={gmailResults}
              isAnalyzing={isAnalyzing}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
