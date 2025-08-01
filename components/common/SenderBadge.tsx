import { senderBadge, text, cn } from '../../styles';

interface SenderBadgeProps {
  sender: string;
}

function extractEmailInfo(sender: string) {
  const match = sender.match(/^(?:"?([^"]*)"?\s*)?<?([^>]*)>?$/);
  if (!match) return { name: sender, email: null };
  
  const [, name, email] = match;
  if (!name && !email) return { name: sender, email: null };
  
  return {
    name: name || email.split('@')[0],
    email: email || null
  };
}

export default function SenderBadge({ sender }: SenderBadgeProps) {
  const { name, email } = extractEmailInfo(sender);
  


  return (
    <div
      className={cn(
        senderBadge.base,
        senderBadge.padding.normal,
        'flex flex-col items-start w-full text-left'
      )}
    >
      <span className={cn(text.weights.medium, 'w-full text-left')}>{name}</span>
      {email && <span className={cn(text.colors.muted, 'w-full text-left text-sm')}>{email}</span>}
    </div>
  );
} 