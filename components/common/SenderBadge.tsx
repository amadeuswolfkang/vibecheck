import { senderBadge, text, cn } from '../../styles';

interface SenderBadgeProps {
  sender: string;
  messageId?: string;  // RFC 2822 Message-ID header
  id?: string;  // Gmail's internal ID
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

export default function SenderBadge({ sender, messageId, id }: SenderBadgeProps) {
  const { name, email } = extractEmailInfo(sender);
  
  const handleClick = () => {
    if (id) {
      // Use Gmail's internal ID for direct link (most reliable)
      window.open(`https://mail.google.com/mail/u/0/#inbox/${id}`, '_blank');
    } else if (messageId) {
      // Fallback to Message-ID search
      window.open(`https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(messageId)}`, '_blank');
    } else if (email) {
      // Last fallback to searching by sender's email
      window.open(`https://mail.google.com/mail/u/0/#search/from:${encodeURIComponent(email)}`, '_blank');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!id && !messageId && !email}
      className={cn(
        senderBadge.base,
        senderBadge.padding.normal,
        'flex flex-col items-start w-full text-left',
        (id || messageId || email) ? senderBadge.states.interactive : senderBadge.states.disabled
      )}
      title={
        id ? 'Click to open this message' :
        messageId ? 'Click to search for this message' :
        email ? 'Click to view all messages from this sender' :
        undefined
      }
    >
      <span className={cn(text.weights.medium, 'w-full text-left')}>{name}</span>
      {email && <span className={cn(text.colors.muted, 'w-full text-left text-sm')}>{email}</span>}
    </button>
  );
} 