import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import { GuildMember } from 'discord.js';

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 250;

/**
 * Generate a welcome image for a new member
 */
export async function generateWelcomeImage(
  member: GuildMember,
  backgroundUrl?: string
): Promise<Buffer> {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background
  if (backgroundUrl) {
    try {
      const bg = await loadImage(backgroundUrl);
      ctx.drawImage(bg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } catch {
      // Fallback gradient
      drawDefaultGradient(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  } else {
    drawDefaultGradient(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Avatar circle
  const avatarSize = 128;
  const avatarX = 50;
  const avatarY = (CANVAS_HEIGHT - avatarSize) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2,
    0,
    Math.PI * 2
  );
  ctx.closePath();
  ctx.clip();

  try {
    const avatar = await loadImage(
      member.user.displayAvatarURL({ extension: 'png', size: 256 })
    );
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  } catch {
    // Fallback: colored circle
    ctx.fillStyle = '#5865f2';
    ctx.fill();
  }

  ctx.restore();

  // Avatar border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2 + 2,
    0,
    Math.PI * 2
  );
  ctx.stroke();

  // Welcome text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial';
  ctx.fillText('WELCOME', 200, 80);

  // Username
  ctx.font = 'bold 28px Arial';
  const username =
    member.user.username.length > 20
      ? member.user.username.slice(0, 17) + '...'
      : member.user.username;
  ctx.fillText(username, 200, 125);

  // Server name
  ctx.font = '20px Arial';
  ctx.fillStyle = '#cccccc';
  const serverName =
    member.guild.name.length > 25
      ? member.guild.name.slice(0, 22) + '...'
      : member.guild.name;
  ctx.fillText(`to ${serverName}`, 200, 160);

  // Member count
  ctx.font = '18px Arial';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(`Member #${member.guild.memberCount}`, 200, 200);

  return canvas.toBuffer('image/png');
}

/**
 * Generate a goodbye image for a departing member
 */
export async function generateGoodbyeImage(member: GuildMember): Promise<Buffer> {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Dark gradient background
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#434343');
  gradient.addColorStop(1, '#000000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Avatar
  const avatarSize = 100;
  const avatarX = (CANVAS_WIDTH - avatarSize) / 2;
  const avatarY = 30;

  ctx.save();
  ctx.beginPath();
  ctx.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2,
    0,
    Math.PI * 2
  );
  ctx.closePath();
  ctx.clip();

  try {
    const avatar = await loadImage(
      member.user.displayAvatarURL({ extension: 'png', size: 256 })
    );
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  } catch {
    ctx.fillStyle = '#666666';
    ctx.fill();
  }

  ctx.restore();

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 28px Arial';
  ctx.fillText('Goodbye', CANVAS_WIDTH / 2, 170);

  ctx.font = '24px Arial';
  const username =
    member.user.username.length > 25
      ? member.user.username.slice(0, 22) + '...'
      : member.user.username;
  ctx.fillText(username, CANVAS_WIDTH / 2, 210);

  ctx.font = '16px Arial';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(
    `${member.guild.memberCount} members remaining`,
    CANVAS_WIDTH / 2,
    240
  );

  return canvas.toBuffer('image/png');
}

/**
 * Draw default gradient background
 */
function drawDefaultGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// Re-export types for external use
export type { CanvasRenderingContext2D };
