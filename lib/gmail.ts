import { google } from 'googleapis';
import type { GmailMessage } from '../types/api';
import { logger } from '../utils/logging';
import { env } from './env';

// Concurrent messages.get calls per batch. Each call costs 5 quota units against
// Gmail's ~250 units/sec per-user limit, so 20 in flight stays comfortably under it.
const FETCH_CONCURRENCY = 20;

// Function to get authenticated Gmail service
async function getGmailService(accessToken: string) {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.gmail({ version: 'v1', auth });
  } catch (error) {
    logger.error('Failed to initialize Gmail service');
    throw new Error('Gmail service initialization failed');
  }
}

// Sanitize email content to prevent XSS and protect sensitive data
function sanitizeEmailContent(content: string): string {
  if (!content) return '';
  
  return content
    // Remove potential HTML/script tags
    .replace(/<[^>]*>/g, '')
    // Mask email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    // Mask phone numbers
    .replace(/(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[PHONE]')
    // Mask URLs
    .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '[LINK]')
    // Remove special characters that could be used for injection
    .replace(/[<>\\$]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchGmailMessages(accessToken: string): Promise<GmailMessage[]> {
  try {
    const gmail = await getGmailService(accessToken);

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: env.GMAIL_QUERY ?? 'newer_than:30d',
      maxResults: 500,
    });

    const messages: GmailMessage[] = [];
    const messageIds = listRes.data.messages || [];
    logger.info('Gmail API - Messages listed', { count: messageIds.length });

    for (let i = 0; i < messageIds.length; i += FETCH_CONCURRENCY) {
      const chunk = messageIds.slice(i, i + FETCH_CONCURRENCY);
      const fetched = await Promise.all(chunk.map(async ({ id }): Promise<GmailMessage | null> => {
        if (!id) return null;

        try {
          const res = await gmail.users.messages.get({
            userId: 'me',
            id: id,
          });

          const headers = res.data.payload?.headers || [];
          const sender = headers.find(h => h.name === 'From')?.value || '';
          const subject = headers.find(h => h.name === 'Subject')?.value || '';
          const date = headers.find(h => h.name === 'Date')?.value || '';
          const messageId = headers.find(h => h.name === 'Message-ID')?.value || '';

          let body = '';
          const parts = res.data.payload?.parts || [];
          const bodyData = res.data.payload?.body?.data || '';

          if (bodyData) {
            body = sanitizeEmailContent(Buffer.from(bodyData, 'base64').toString());
          } else {
            for (const part of parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                body = sanitizeEmailContent(Buffer.from(part.body.data, 'base64').toString());
                break;
              }
            }
          }

          if (!body) {
            logger.error('No body found for message', new Error('No body found'), { id });
            return null;
          }

          return {
            id: id,  // Gmail's internal ID
            messageId: messageId,  // RFC 2822 Message-ID header
            sender,
            subject,
            body,
            date
          };
        } catch (err) {
          logger.error('Failed to fetch message', err instanceof Error ? err : new Error(String(err)), { id });
          return null;
        }
      }));

      for (const message of fetched) {
        if (message) messages.push(message);
      }
    }

    return messages;
  } catch (error) {
    logger.error('Failed to fetch Gmail messages');
    throw new Error('Failed to fetch Gmail messages');
  }
}
