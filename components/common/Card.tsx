import { motion } from 'framer-motion';
import { card, animation, cn } from '../../styles';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: keyof typeof card.padding;
  variant?: keyof typeof card.variants;
  delay?: number;
  onAnimationComplete?: () => void;
  onClick?: (e: React.MouseEvent) => void;
}

export default function Card({ 
  children, 
  className = '', 
  padding = 'normal',
  variant = 'default',
  delay = 0,
  onAnimationComplete,
  onClick
}: CardProps) {
  // Extract opacity and transform values from className
  const isVisible = !className?.includes('opacity-0');
  
  return (
    <motion.div 
      {...animation.motion.fadeSlideUp}
      animate={{ 
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : 16
      }}
      transition={{ 
        ...animation.motion.fadeSlideUp.transition,
        delay: delay / 1000 // Convert ms to seconds
      }}
      className={cn(
        card.base,
        card.variants[variant],
        card.padding[padding],
        onClick && card.variants.interactive,
        className
      )}
      onAnimationComplete={onAnimationComplete}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
} 