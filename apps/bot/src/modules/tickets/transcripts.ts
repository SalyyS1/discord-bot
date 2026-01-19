import { TextChannel, Collection, Message } from 'discord.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { logger } from '../../utils/logger.js';

// R2/S3 Configuration (optional)
const s3Client =
  process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID
    ? new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      })
    : null;

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'transcripts';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

/**
 * Transcript generation and storage service
 */
export class TranscriptService {
  /**
   * Generate HTML transcript for a ticket channel
   */
  static async generate(
    channel: TextChannel,
    ticketId: string
  ): Promise<string | null> {
    try {
      // Generate simple HTML transcript manually to avoid library type issues
      const messages = await channel.messages.fetch({ limit: 100 });
      const html = this.generateHtml(messages, channel.name, ticketId);
      const buffer = Buffer.from(html, 'utf-8');

      // Upload to R2 or save locally
      if (s3Client) {
        return await this.uploadToR2(buffer, ticketId);
      } else {
        return await this.saveLocally(buffer, ticketId);
      }
    } catch (error) {
      logger.error('Failed to generate transcript:', error);
      return null;
    }
  }

  /**
   * Generate simple HTML transcript
   */
  private static generateHtml(
    messages: Collection<string, Message>,
    channelName: string,
    ticketId: string
  ): string {
    const sortedMessages = [...messages.values()].sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp
    );

    const messageHtml = sortedMessages
      .map((msg) => {
        const time = msg.createdAt.toISOString();
        const author = msg.author.tag;
        const content = this.escapeHtml(msg.content || '[No content]');
        const attachments = msg.attachments.size > 0
          ? `<div class="attachments">${msg.attachments.map(a => `📎 ${a.name}`).join(', ')}</div>`
          : '';
        
        return `
          <div class="message">
            <div class="header">
              <span class="author">${this.escapeHtml(author)}</span>
              <span class="time">${time}</span>
            </div>
            <div class="content">${content}</div>
            ${attachments}
          </div>
        `;
      })
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Transcript - ${this.escapeHtml(channelName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #36393f; color: #dcddde; padding: 20px; }
    .header { font-size: 1.2em; margin-bottom: 20px; color: #fff; }
    .message { background: #40444b; border-radius: 4px; padding: 10px; margin: 10px 0; }
    .message .header { font-size: 0.9em; margin-bottom: 5px; }
    .author { color: #7289da; font-weight: bold; }
    .time { color: #72767d; font-size: 0.8em; margin-left: 10px; }
    .content { white-space: pre-wrap; word-wrap: break-word; }
    .attachments { color: #72767d; font-size: 0.9em; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="header">📝 Transcript: ${this.escapeHtml(channelName)} | ID: ${ticketId.slice(0, 8)}</div>
  ${messageHtml}
  <div style="margin-top: 20px; color: #72767d; font-size: 0.8em;">
    Generated at ${new Date().toISOString()} | ${sortedMessages.length} messages
  </div>
</body>
</html>
    `;
  }

  /**
   * Escape HTML characters
   */
  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Upload transcript to Cloudflare R2
   */
  private static async uploadToR2(
    buffer: Buffer,
    ticketId: string
  ): Promise<string> {
    const key = `transcripts/${ticketId}.html`;

    await s3Client!.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: 'text/html',
      })
    );

    return `${PUBLIC_URL}/${key}`;
  }

  /**
   * Save transcript locally as fallback
   */
  private static async saveLocally(
    buffer: Buffer,
    ticketId: string
  ): Promise<string> {
    const dir = join(process.cwd(), 'transcripts');
    await mkdir(dir, { recursive: true });

    const filename = `${ticketId}.html`;
    const filepath = join(dir, filename);

    await writeFile(filepath, buffer);

    // Return local file path
    return `local://${filepath}`;
  }
}
