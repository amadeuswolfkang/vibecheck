import { google } from 'googleapis';
import { GaxiosResponse } from 'gaxios';
import { gmail_v1 } from 'googleapis';
import type { GmailMessage } from '../types/api';
import { logger } from '../utils/logging';

interface DailyEmailCount {
  date: string;
  positive: number;
  negative: number;
  mixed: number;
  neutral: number;
}

// Function to get authenticated Gmail service
async function getGmailService(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth });
}

export async function fetchEmailCountLast30Days(accessToken: string): Promise<DailyEmailCount[]> {
  const gmail = await getGmailService(accessToken);
  
  // Calculate date range
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const after = Math.floor(thirtyDaysAgo.getTime() / 1000);

  // Fetch all messages in the last 30 days
  const listRes: GaxiosResponse<gmail_v1.Schema$ListMessagesResponse> = await gmail.users.messages.list({
    userId: 'me',
    q: `after:${after}`,
    maxResults: 500,
  });

  const messages = listRes.data.messages || [];
  logger.info('Gmail API - Messages fetched', { count: messages.length });

  // Create a map to store counts per day
  const countsByDay = new Map<string, { positive: number; negative: number; mixed: number; neutral: number }>();
  
  // Initialize all days in the last 30 days with 0
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    countsByDay.set(dateStr, { positive: 0, negative: 0, mixed: 0, neutral: 0 });
  }

  // Get the OpenAI analyzed results
  const analyzedMessages = await fetchGmailMessages(accessToken);
  
  // Process each message and update counts based on OpenAI sentiment analysis
  for (const message of analyzedMessages) {
    try {
      const messageDate = new Date(message.date);
      const dateStr = messageDate.toISOString().split('T')[0];
      
      if (!countsByDay.has(dateStr)) continue;
      
      const counts = countsByDay.get(dateStr)!;
      counts.neutral++; // Default to neutral until analysis is done
      countsByDay.set(dateStr, counts);
    } catch (err) {
      logger.error('Failed to process message', err instanceof Error ? err : new Error(String(err)));
      continue;
    }
  }

  // Convert map to array and sort by date
  return Array.from(countsByDay.entries())
    .map(([date, counts]) => ({
      date,
      ...counts
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchGmailMessages(accessToken: string): Promise<GmailMessage[]> {
  const gmail = await getGmailService(accessToken);
  
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 500,
  });

  const messages: GmailMessage[] = [];
  const messageIds = listRes.data.messages || [];

  for (const { id: messageId } of messageIds) {
    if (!messageId) continue;

    try {
      const res = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
      });

      const headers = res.data.payload?.headers;
      if (!headers) {
        logger.error('Message has no headers', null, { messageId });
        continue;
      }

      const sender = headers.find(h => h.name === 'From')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      let body = '';
      const parts = res.data.payload?.parts || [];
      const bodyData = res.data.payload?.body?.data || '';

      if (bodyData) {
        body = Buffer.from(bodyData, 'base64').toString();
      } else {
        for (const part of parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString();
            break;
          }
        }
      }

      if (!body) {
        logger.error('No body found for message', null, { messageId });
        continue;
      }

      messages.push({ id: messageId, sender, subject, body, date });
    } catch (err) {
      logger.error('Failed to fetch message', err instanceof Error ? err : new Error(String(err)), { messageId });
      continue;
    }
  }

  return messages;
}
