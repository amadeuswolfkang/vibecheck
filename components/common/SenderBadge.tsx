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
  
  const handleClick = () => {
    if (email) {
      window.open(`https://mail.google.com/mail/#search/from:${encodeURIComponent(email)}`, '_blank');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!email}
      className={cn(
        senderBadge.base,
        senderBadge.padding.normal,
        email ? senderBadge.states.interactive : senderBadge.states.disabled
      )}
      title={email ? 'Click to view all messages from this sender' : undefined}
    >
      <span className={cn(text.weights.medium)}>{name}</span>
      {email && <span className={cn(text.colors.muted, 'mt-0.5')}>{email}</span>}
    </button>
  );
} 