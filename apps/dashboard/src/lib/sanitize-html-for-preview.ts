import DOMPurify from 'dompurify';

// Safe tags for Discord-like formatting
const ALLOWED_TAGS = ['strong', 'em', 'u', 's', 'br', 'span', 'code', 'pre'];
const ALLOWED_ATTR = ['class'];

/**
 * Sanitize user input for safe HTML preview
 * Strips all potentially dangerous content while preserving formatting
 */
export function sanitizeForPreview(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // First pass: Strip ALL HTML from user input
  const stripped = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  // Second pass: Apply safe formatting transformations
  const formatted = stripped
    // Discord markdown to HTML
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/__(.*?)__/g, '<u>$1</u>')
    .replace(/~~(.*?)~~/g, '<s>$1</s>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>')
    // Placeholders with safe styling
    .replace(/\{user\}/g, '<span class="text-blue-400">@User</span>')
    .replace(/\{username\}/g, 'Username')
    .replace(/\{server\}/g, 'Server Name')
    .replace(/\{membercount\}/g, '1,234')
    .replace(/\{inviter\}/g, '<span class="text-blue-400">@Inviter</span>')
    .replace(/\{position\}/g, '1,234th')
    .replace(/\{prize\}/g, 'Discord Nitro')
    .replace(/\{winners\}/g, '<span class="text-blue-400">@Winner1</span>')
    .replace(/\{ends\}/g, '<t:1706000000:R>')
    .replace(/\{host\}/g, '<span class="text-blue-400">@Host</span>')
    .replace(/\{entries\}/g, '150')
    .replace(/\{reason\}/g, 'Issue resolved')
    .replace(/\{moderator\}/g, '<span class="text-blue-400">@Moderator</span>')
    .replace(/\{case\}/g, '#42')
    .replace(/\{warnings\}/g, '3')
    .replace(/\{duration\}/g, 'Permanent')
    .replace(/\{role\}/g, '<span class="text-blue-400">@Member</span>')
    .replace(/\{boosts\}/g, '15')
    .replace(/\{level\}/g, '2')
    .replace(/\{created\}/g, '2 years ago')
    .replace(/\{joined\}/g, '6 months ago')
    .replace(/\{requirement\}/g, '<span class="text-blue-400">@Member</span>');

  // Third pass: Ensure output only contains allowed tags
  return DOMPurify.sanitize(formatted, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

/**
 * Escape HTML entities without any formatting
 * Use for contexts where NO HTML is expected
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
