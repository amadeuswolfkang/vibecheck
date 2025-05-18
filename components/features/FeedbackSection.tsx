import Badge from '../common/Badge';

interface FeedbackSectionProps {
  label: string;
  text: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  className?: string;
}

export default function FeedbackSection({ 
  label, 
  text, 
  variant,
  className = ''
}: FeedbackSectionProps) {
  return (
    <div className={className}>
      <Badge variant={variant} style="pill">{label}</Badge>
      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mt-2">{text}</p>
    </div>
  );
} 