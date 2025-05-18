import FeedbackSection from './FeedbackSection';
import Card from '../common/Card';
import Badge from '../common/Badge';
import SenderBadge from '../common/SenderBadge';
import type { FeedbackPoint, VibecheckResults } from '../../types/api';
import { formatDate } from '../../utils/date';
import { useState, useEffect } from 'react';

const FEEDBACK_SECTIONS = [
  { label: 'Most Praised', key: 'topPraise', variant: 'success' },
  { label: 'Most Painful', key: 'topPain', variant: 'error' },
  { label: 'Most Intense', key: 'topIntensity', variant: 'warning' },
  { label: 'Most Requested', key: 'topRequestedFeature', variant: 'info' },
] as const;

const BORDER_COLORS = {
  success: 'border-emerald-200',
  error: 'border-rose-200',
  warning: 'border-amber-200',
  info: 'border-blue-200',
} as const;

const BULLET_COLORS = {
  success: 'bg-emerald-300',
  error: 'bg-rose-300',
  warning: 'bg-amber-300',
  info: 'bg-blue-300',
} as const;

interface FeedbackDisplayProps {
  data: VibecheckResults;
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

  const renderPoint = (point: FeedbackPoint, variant: keyof typeof BORDER_COLORS) => (
    <div key={point.text} className="mb-8 last:mb-0 w-full">
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${BULLET_COLORS[variant]}`} />
        <div className="flex-1">
          <p className="text-gray-700 dark:text-gray-200 mb-3 text-sm leading-relaxed">{point.text}</p>
          {point.source && (
            <blockquote className={`border-l-2 ${BORDER_COLORS[variant]} pl-3 py-2 text-gray-500 dark:text-gray-400 text-sm italic mb-3 leading-relaxed`}>
              {point.source.length <= 280 ? point.source : (
                <>
                  {point.source.slice(0, 280)}
                  <span className="text-slate-400 dark:text-slate-500 text-sm"> •••</span>
                </>
              )}
            </blockquote>
          )}
          <div className="flex flex-col gap-2">
            {point.sender && <SenderBadge sender={point.sender} />}
            {point.date && (
              <span className="text-xs text-gray-500 dark:text-gray-400 pl-2">{formatDate(point.date)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderFeedbackSection = (title: string, variant: keyof typeof BORDER_COLORS, points: FeedbackPoint[]) => (
    <div className="w-full">
      <div className="mb-6">
        <Badge variant={variant} style="header">{title}</Badge>
      </div>
      <div className="space-y-8">
        {(points || []).map(point => renderPoint(point, variant))}
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
      
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_7fr] gap-8">
        <div className="space-y-8">
          <Card delay={0}>
            <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">📄 Summary</h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{data.overallSummary}</p>
          </Card>

          <Card delay={150}>
            <h3 className="text-lg font-semibold mb-6 text-gray-700 dark:text-gray-200">🎯 Key Feedback Points</h3>
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

        <Card delay={300}>
          <h3 className="text-lg font-semibold mb-8 text-gray-700 dark:text-gray-200">
            💬 Comments
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 relative">
            <div className="relative flex-1 min-w-0">
              <div className="px-6">
                {renderFeedbackSection('Praise Points', 'success', data.praisePoints)}
              </div>
              <div className="absolute right-0 top-0 h-full w-px bg-gray-100 dark:bg-gray-700 hidden md:block" />
            </div>
            <div className="relative flex-1 min-w-0">
              <div className="px-6">
                {renderFeedbackSection('Pain Points', 'error', data.painPoints)}
              </div>
              <div className="absolute right-0 top-0 h-full w-px bg-gray-100 dark:bg-gray-700 hidden md:block" />
            </div>
            <div className="relative flex-1 min-w-0">
              <div className="px-6">
                {renderFeedbackSection('Feature Requests', 'info', data.requestedFeatures)}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 