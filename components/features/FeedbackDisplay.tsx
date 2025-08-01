import FeedbackSection from './FeedbackSection';
import Card from '../common/Card';
import Badge from '../common/Badge';
import SenderBadge from '../common/SenderBadge';
import type { MessageInsight, VibeloopResults } from '../../types/api';
import { formatDate } from '../../utils/date';
import { useState, useEffect } from 'react';

const FEEDBACK_SECTIONS = [
  { label: 'Most Praised', key: 'topPraise', variant: 'success' },
  { label: 'Most Painful', key: 'topPain', variant: 'error' },
  { label: 'Most Intense', key: 'topIntensity', variant: 'warning' },
  { label: 'Most Requested', key: 'topRequestedFeature', variant: 'info' },
] as const;

const COLORS = {
  success: {
    border: 'border-emerald-200',
    bullet: 'bg-emerald-300',
  },
  error: {
    border: 'border-rose-200',
    bullet: 'bg-rose-300',
  },
  warning: {
    border: 'border-amber-200',
    bullet: 'bg-amber-300',
  },
  info: {
    border: 'border-blue-200',
    bullet: 'bg-blue-300',
  },
} as const;

interface FeedbackDisplayProps {
  data: VibeloopResults;
  isAnalyzing?: boolean;
}

export default function FeedbackDisplay({ data, isAnalyzing = false }: FeedbackDisplayProps) {
  const [shouldFadeOut, setShouldFadeOut] = useState(false);

  useEffect(() => {
    if (isAnalyzing) {
      setShouldFadeOut(true);
    } else {
      setShouldFadeOut(false);
    }
  }, [isAnalyzing]);

  if (!data) return <p className="text-gray-500 dark:text-gray-400 text-base">No feedback available.</p>;

  const renderPoint = (point: MessageInsight, variant: keyof typeof COLORS) => (
    <div className="mb-8 last:mb-0 w-full">
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${COLORS[variant].bullet}`} />
        <div className="flex-1 min-w-0">
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-normal break-words mb-4">
            {point.insight}
          </p>
          {point.quote && (
            <blockquote className={`border-l-2 ${COLORS[variant].border} pl-3 py-2 text-gray-500 dark:text-gray-400 text-sm leading-relaxed italic mb-3 whitespace-normal break-words`}>
              {point.quote.length <= 280 ? point.quote : (
                <>
                  {point.quote.slice(0, 280)}
                  <span className="text-slate-400 dark:text-slate-500 text-sm"> •••</span>
                </>
              )}
            </blockquote>
          )}
          <div className="flex flex-col gap-2">
            {point.sender && (
              <SenderBadge 
                sender={point.sender} 
              />
            )}
            {point.date && (
              <span className="text-xs text-gray-500 dark:text-gray-400 pl-2">{formatDate(point.date)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderFeedbackSection = (title: string, variant: keyof typeof COLORS, points: MessageInsight[]) => (
    <div className="w-full">
      <div className="mb-6">
        <Badge variant={variant} style="header">{title}</Badge>
      </div>
      <div className="space-y-8">
        {points?.map(point => renderPoint(point, variant))}
      </div>
    </div>
  );

  const renderCommentColumn = (title: string, variant: keyof typeof COLORS, points: MessageInsight[], isLast = false) => (
    <div className={`relative ${!isLast ? 'md:border-r border-gray-100 dark:border-gray-700' : ''}`}>
      <div className="px-6">
        <div className="min-w-0">
          {renderFeedbackSection(title, variant, points)}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`
      space-y-6
      transition-all duration-500 ease-in-out transform
      ${shouldFadeOut ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}
    `}>
      <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">
        Inbox Feedback Analysis
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_7.5fr] gap-8">
        <div className="space-y-8">
          <Card delay={0}>
            <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Summary</h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{data.overallSummary}</p>
          </Card>

          <Card delay={150}>
            <h3 className="text-lg font-semibold mb-6 text-gray-700 dark:text-gray-200">Key Feedback Points</h3>
            <div className="space-y-6">
              {FEEDBACK_SECTIONS.map(({ label, key, variant }) => (
                <FeedbackSection
                  key={key}
                  label={label}
                  text={data[key]}
                  variant={variant}
                />
              ))}
            </div>
          </Card>
        </div>

        <Card delay={300} padding="none">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-8 text-gray-700 dark:text-gray-200">
              Comments
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-0 relative">
              {renderCommentColumn('Praise Points', 'success', data.praisePoints)}
              {renderCommentColumn('Pain Points', 'error', data.painPoints)}
              {renderCommentColumn('Feature Requests', 'info', data.requestedFeatures, true)}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 