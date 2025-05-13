import { google } from 'googleapis';
import { GaxiosResponse } from 'gaxios';
import { gmail_v1 } from 'googleapis';
import fetch from 'node-fetch';

interface GmailMessage {
  sender: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
}

export async function fetchGmailMessages(accessToken: string): Promise<GmailMessage[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth });

  // Fetch the message IDs
  const listRes: GaxiosResponse<gmail_v1.Schema$ListMessagesResponse> = await gmail.users.messages.list({
    userId: 'me',
    q: '',
    maxResults: 50,
  });

  const messageIds = listRes.data.messages?.map((msg) => msg.id) || [];
  const messages: GmailMessage[] = [];

  // Fetch the full messages
  for (const messageId of messageIds) {
    if (!messageId) continue;

    try {
      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const payload = msgRes.data.payload;
      const headers = payload?.headers || [];

      // Extract headers
      const headerMap = headers.reduce((acc, header) => {
        if (header.name && header.value) {
          acc[header.name.toLowerCase()] = header.value;
        }
        return acc;
      }, {} as Record<string, string>);

      const sender = headerMap['from'] || 'Unknown Sender';
      const subject = headerMap['subject'] || 'No Subject';
      const date = headerMap['date'] || 'Unknown Date';

      // Extract the email body (assuming plaintext for simplicity)
      let body = '';
      if (payload?.parts) {
        const textPart = payload.parts.find((part) => part.mimeType === 'text/plain');
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
      } else if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      }

      // Add the full message to the list
      messages.push({
        sender,
        subject,
        date,
        snippet: msgRes.data.snippet || '',
        body,
      });
    } catch (err) {
      console.error(`Error fetching message ${messageId}:`, err);
      continue; // Skip this message and move to the next one
    }
  }

  return messages;
}
