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