import { badge, cn } from '../../styles';

interface BadgeProps {
  variant: keyof typeof badge.variants;
  children: React.ReactNode;
  style?: 'pill' | 'header';
}

export default function Badge({ variant, children, style = 'pill' }: BadgeProps) {
  const styles = cn(
    badge.base,
    badge.variants[variant],
    style === 'pill' ? cn(badge.shapes.pill, badge.sizes.base) : cn(badge.shapes.rounded, badge.sizes.header),
    style === 'header' && 'w-full text-center block'
  );

  return (
    <span className={styles}>
      {children}
    </span>
  );
} 