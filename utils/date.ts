/**
 * Formats a date string into a localized GB format (DD MMM YYYY)
 * @param date - ISO date string or undefined
 * @returns Formatted date string or "Unknown Date" if date is undefined
 * @example
 * formatDate("2024-03-15") // Returns "15 Mar 2024"
 * formatDate(undefined) // Returns "Unknown Date"
 */
export function formatDate(date: string | undefined): string {
  if (!date) return 'Unknown Date';
  
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Converts a date into a human-readable relative time string
 * @param date - ISO date string or undefined
 * @returns Relative time string (e.g., "2 days ago") or empty string if date is undefined
 * @example
 * getRelativeTimeString("2024-03-14") // Returns "Yesterday" (if today is March 15)
 * getRelativeTimeString("2024-03-01") // Returns "2 weeks ago"
 */
export function getRelativeTimeString(date: string | undefined): string {
  if (!date) return '';
  
  const now = new Date();
  const past = new Date(date);
  const diffTime = Math.abs(now.getTime() - past.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
} 