import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import type { Props as RechartsLegendProps } from 'recharts/types/component/DefaultLegendContent';
import { motion } from 'framer-motion';
import Card from '../common/Card';
import { chart, text, layout, animation, cn } from '../../styles';
import type { VibeloopResults, Sentiment, GmailMessage, EmailSentiment } from '../../types/api';

interface EmailCount {
  date: string;
  positive: number;
  negative: number;
  mixed: number;
  neutral: number;
}

interface ChartState {
  activeTooltipIndex?: number;
  chartX?: number;
}

interface LegendProps {
  payload?: {
    value: string;
    color: string;
  }[];
}

const DailyStats = ({ 
  data, 
  activeIndex,
  userTimezone 
}: { 
  data: EmailCount[], 
  activeIndex: number,
  userTimezone: string 
}) => {
  if (activeIndex < 0 || !data[activeIndex]) return null;
  
  const currentData = data[activeIndex];
  // Parse the ISO date string and convert to user's timezone
  const date = new Date(currentData.date + 'T00:00:00Z');
  const formattedDate = `${date.getDate()} ${date.toLocaleString('default', { 
    month: 'short',
    timeZone: userTimezone 
  })}`;
  
  const total = Object.values(currentData).reduce((sum, value) => 
    typeof value === 'number' ? sum + value : sum, 0
  );

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 text-xs w-28 sm:w-32">
      <p className="font-medium mb-1">{formattedDate}</p>
      <div className="flex justify-between gap-1 sm:gap-2">
        <span className="text-emerald-600 dark:text-emerald-400">Positive</span>
        <span>{Math.round(currentData.positive)}</span>
      </div>
      <div className="flex justify-between gap-2 sm:gap-6">
        <span className="text-red-500">Negative</span>
        <span>{Math.round(currentData.negative)}</span>
      </div>
      <div className="flex justify-between gap-2 sm:gap-6">
        <span className="text-amber-500">Mixed</span>
        <span>{Math.round(currentData.mixed)}</span>
      </div>
      <div className="flex justify-between gap-2 sm:gap-6">
        <span className="text-gray-400">Neutral</span>
        <span>{Math.round(currentData.neutral)}</span>
      </div>
      <div className="flex justify-between gap-2 sm:gap-6 pt-1 mt-2 border-t border-gray-200 dark:border-gray-700">
        <span className="font-medium">Total</span>
        <span>{Math.round(total)}</span>
      </div>
    </div>
  );
};

const TotalStats = ({ data }: { data: EmailCount[] }) => {
  const totals = data.reduce((acc, day) => {
    Object.entries(day).forEach(([key, value]) => {
      if (key !== 'date' && typeof value === 'number') {
        acc[key] = (acc[key] || 0) + value;
      }
    });
    return acc;
  }, {} as Record<string, number>);

  const total = Object.entries(totals)
    .filter(([key]) => key !== 'date')
    .reduce((sum, [_, value]) => sum + value, 0);

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 text-xs w-28 sm:w-32">
      <p className="font-medium mb-1">30 Day Total</p>
      <div className="flex justify-between gap-1 sm:gap-2">
        <span className="text-emerald-600 dark:text-emerald-400">Positive</span>
        <span>{Math.round(totals.positive || 0)}</span>
      </div>
      <div className="flex justify-between gap-2 sm:gap-6">
        <span className="text-red-500">Negative</span>
        <span>{Math.round(totals.negative || 0)}</span>
      </div>
      <div className="flex justify-between gap-2 sm:gap-6">
        <span className="text-amber-500">Mixed</span>
        <span>{Math.round(totals.mixed || 0)}</span>
      </div>
      <div className="flex justify-between gap-2 sm:gap-6">
        <span className="text-gray-400">Neutral</span>
        <span>{Math.round(totals.neutral || 0)}</span>
      </div>
      <div className="flex justify-between gap-2 sm:gap-6 pt-1 mt-2 border-t border-gray-200 dark:border-gray-700">
        <span className="font-medium">Total</span>
        <span>{Math.round(total)}</span>
      </div>
    </div>
  );
};

interface Props {
  results?: VibeloopResults | null;
  isAnalyzing?: boolean;
  messages?: GmailMessage[];
  sentiments?: EmailSentiment[];
}

export default function EmailCountChart({ 
  results, 
  isAnalyzing = false,
  messages = [],
  sentiments = []
}: Props) {
  const [data, setData] = useState<EmailCount[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [clickedDate, setClickedDate] = useState<string | null>(null);
  const [shouldFadeOut, setShouldFadeOut] = useState(false);
  
  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (isAnalyzing) {
      setShouldFadeOut(true);
    } else {
      setShouldFadeOut(false);
    }
  }, [isAnalyzing]);

  useEffect(() => {
    if (!results) {
      setData([]);
      return;
    }

    const countsByDay = new Map<string, EmailCount>();
    
    // Get current date in user's timezone
    const now = new Date();
    // Set to midnight of current day to ensure we include all of today
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    // Create data points for last 30 days including today
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      countsByDay.set(dateStr, {
        date: dateStr,
        positive: 0,
        negative: 0,
        mixed: 0,
        neutral: 0
      });
    }

    // Process messages with their sentiments
    messages.forEach((msg: GmailMessage, index: number) => {
      const sentiment = sentiments[index]?.sentiment;
      if (!sentiment) return;

      // Get the date for this message
      const messageDate = new Date(msg.date);
      const messageDateStr = messageDate.toISOString().split('T')[0];
      
      // Only process if the date is within our 30-day window
      const counts = countsByDay.get(messageDateStr);
      if (!counts) return;

      // Update the counts for this sentiment
      counts[sentiment as keyof Omit<EmailCount, 'date'>]++;
      countsByDay.set(messageDateStr, counts);
    });

    // Convert map to array and sort by date
    setData(Array.from(countsByDay.values()).sort((a, b) => a.date.localeCompare(b.date)));
  }, [results, messages, sentiments]);

  useEffect(() => {
    if (data.length > 0) {
      setActiveIndex(data.length - 1);
      setClickedDate(null);
    }
  }, [data]);

  useEffect(() => {
    const handleGlobalClick = () => {
      setClickedDate(null);
      setActiveIndex(data.length - 1);
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [data.length]);

  const handleMouseMove = (state: ChartState) => {
    if (state.activeTooltipIndex !== undefined) {
      setActiveIndex(state.activeTooltipIndex);
    }
  };

  const handleMouseLeave = () => {
    if (!clickedDate) {
      setActiveIndex(data.length - 1);
    } else {
      const clickedIndex = data.findIndex(d => d.date === clickedDate);
      if (clickedIndex !== -1) {
        setActiveIndex(clickedIndex);
      }
    }
  };

  const handleClick = (state: ChartState, event: React.MouseEvent) => {
    if (state.activeTooltipIndex !== undefined) {
      const newIndex = state.activeTooltipIndex;
      event.stopPropagation();
      setActiveIndex(newIndex);
      setClickedDate(data[newIndex]?.date || null);
    }
  };

  if (!results) {
    return (
      <Card>
        <div className={cn(layout.flex.center, chart.container, text.colors.muted)}>
          Click "Analyze" to see sentiment trends
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      {...animation.motion.fadeSlideUp}
      animate={{ 
        opacity: shouldFadeOut ? 0 : 1,
        y: shouldFadeOut ? 16 : 0
      }}
      className={cn(
        'w-full sm:w-[85%] md:w-[80%] lg:w-[70%] mx-auto'
      )}
    >
      <Card>
        <div className={cn(chart.container)}>
          <div className="h-[400px] sm:h-[450px] md:h-[400px] flex flex-col">
            <h2 className="text-lg font-semibold leading-none mb-1 text-gray-700 dark:text-gray-200">
              Email Sentiment Distribution (Last 30 Days)
            </h2>
            <div className="flex-1 relative">
              <div className="absolute top-[48px] right-0 sm:right-[24px] flex flex-col gap-4 z-10">
                <DailyStats 
                  data={data} 
                  activeIndex={activeIndex} 
                  userTimezone={userTimezone}
                />
                <TotalStats data={data} />
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ 
                    top: 40, 
                    right: window.innerWidth < 640 ? 100 : 180, 
                    left: 0, 
                    bottom: 30 
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onClick={handleClick}
                >
                  <Legend
                    verticalAlign="top"
                    height={20}
                    align="left"
                    wrapperStyle={{
                      paddingLeft: 0,
                      marginLeft: 0,
                      marginTop: '-36px'
                    }}
                    layout="horizontal"
                    content={(props: RechartsLegendProps) => (
                      <div className="flex flex-wrap gap-4 sm:gap-6">
                        {props.payload?.map((entry) => (
                          <div key={entry.value} className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded" style={{ backgroundColor: entry.color || '' }} />
                            <span className="text-gray-700 dark:text-gray-200 text-xs sm:text-sm">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                  <CartesianGrid strokeDasharray="0" className="opacity-50 dark:opacity-30" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(dateStr) => {
                      const d = new Date(dateStr);
                      return d.toLocaleDateString('default', { 
                        day: 'numeric',
                        month: window.innerWidth < 640 ? 'numeric' : 'short',
                      });
                    }}
                    height={40}
                    dy={10}
                    ticks={data.map(d => d.date).filter((_, i, arr) => {
                      if (window.innerWidth < 640) {
                        return i % 7 === 0 || i === arr.length - 1;
                      }
                      return i % 5 === 0 || i === arr.length - 1;
                    })}
                    tick={{ 
                      fontSize: window.innerWidth < 640 ? 10 : 12, 
                      fill: 'currentColor', 
                      className: 'text-gray-700 dark:text-gray-200' 
                    }}
                    tickLine={false}
                    axisLine={false}
                    padding={{ left: 0, right: 0 }}
                  />
                  <YAxis
                    tickFormatter={(value) => Math.round(value).toString()}
                    allowDecimals={false}
                    allowDuplicatedCategory={false}
                    domain={[0, 'auto']}
                    tickCount={window.innerWidth < 640 ? 5 : 7}
                    tick={{ 
                      fontSize: window.innerWidth < 640 ? 10 : 12, 
                      fill: 'currentColor', 
                      className: 'text-gray-700 dark:text-gray-200' 
                    }}
                    tickLine={false}
                    axisLine={false}
                    width={24}
                    padding={{ top: 0, bottom: 0 }}
                  />
                  {clickedDate && (
                    <ReferenceLine
                      x={clickedDate}
                      stroke="#94a3b8"
                      strokeWidth={3}
                    />
                  )}
                  <Tooltip
                    content={() => null}
                    cursor={{
                      stroke: '#94a3b8',
                      strokeWidth: 2,
                      strokeOpacity: 0.5
                    }}
                  />
                  <Area
                    type="linear"
                    dataKey="positive"
                    name="Positive"
                    stackId="1"
                    stroke="none"
                    fill="#10B981"
                    activeDot={false}
                    isAnimationActive={false}
                  />
                  <Area
                    type="linear"
                    dataKey="negative"
                    name="Negative"
                    stackId="1"
                    stroke="none"
                    fill="#EF4444"
                    activeDot={false}
                    isAnimationActive={false}
                  />
                  <Area
                    type="linear"
                    dataKey="mixed"
                    name="Mixed"
                    stackId="1"
                    stroke="none"
                    fill="#F59E0B"
                    activeDot={false}
                    isAnimationActive={false}
                  />
                  <Area
                    type="linear"
                    dataKey="neutral"
                    name="Neutral"
                    stackId="1"
                    stroke="none"
                    fill="#9CA3AF"
                    activeDot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
} 