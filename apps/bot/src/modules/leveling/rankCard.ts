import { createCanvas, loadImage, type SKRSContext2D as CanvasRenderingContext2D } from '@napi-rs/canvas';
import { GuildMember } from 'discord.js';
import { getXpProgress } from './xpCalculator.js';

const CARD_WIDTH = 800;
const CARD_HEIGHT = 200;

/**
 * Generate a rank card image for a member
 */
export async function generateRankCard(
  member: GuildMember,
  xp: number,
  level: number,
  rank: number
): Promise<Buffer> {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Avatar
  const avatarSize = 120;
  const avatarX = 40;
  const avatarY = (CARD_HEIGHT - avatarSize) / 2;

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
    ctx.fillStyle = '#5865f2';
    ctx.fill();
  }

  ctx.restore();

  // Avatar border
  ctx.strokeStyle = '#5865f2';
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

  // Username
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial';
  const username =
    member.user.username.length > 15
      ? member.user.username.slice(0, 12) + '...'
      : member.user.username;
  ctx.fillText(username, 190, 60);

  // Display name or discriminator
  ctx.fillStyle = '#888888';
  ctx.font = '16px Arial';
  const displayName = member.displayName !== member.user.username 
    ? member.displayName.slice(0, 20)
    : `@${member.user.username}`;
  ctx.fillText(displayName, 190, 85);

  // Stats section
  const statsX = 190;
  const statsY = 110;

  // Rank
  ctx.fillStyle = '#888888';
  ctx.font = '14px Arial';
  ctx.fillText('RANK', statsX, statsY);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(`#${rank}`, statsX, statsY + 30);

  // Level
  ctx.fillStyle = '#888888';
  ctx.font = '14px Arial';
  ctx.fillText('LEVEL', statsX + 100, statsY);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(`${level}`, statsX + 100, statsY + 30);

  // XP
  ctx.fillStyle = '#888888';
  ctx.font = '14px Arial';
  ctx.fillText('XP', statsX + 200, statsY);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(formatNumber(xp), statsX + 200, statsY + 30);

  // Progress bar
  const progress = getXpProgress(xp);
  const barX = 190;
  const barY = 160;
  const barWidth = 560;
  const barHeight = 20;

  // Bar background
  ctx.fillStyle = '#2d2d44';
  roundRect(ctx, barX, barY, barWidth, barHeight, 10);

  // Bar fill
  const fillWidth = Math.max((progress.percentage / 100) * barWidth, 10);
  const barGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
  barGradient.addColorStop(0, '#5865f2');
  barGradient.addColorStop(1, '#7289da');
  ctx.fillStyle = barGradient;
  roundRect(ctx, barX, barY, fillWidth, barHeight, 10);

  // Progress text
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(
    `${formatNumber(progress.current)} / ${formatNumber(progress.needed)} XP`,
    barX + barWidth,
    barY - 5
  );

  return canvas.toBuffer('image/png');
}

/**
 * Draw rounded rectangle
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Format large numbers with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
