import { Collection } from 'discord.js';

const cooldowns = new Collection<string, Collection<string, number>>();

export function checkCooldown(
  commandName: string,
  userId: string,
  cooldownSeconds: number
): { onCooldown: boolean; remaining: number } {
  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(commandName)!;
  const cooldownAmount = cooldownSeconds * 1000;

  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId)! + cooldownAmount;

    if (now < expirationTime) {
      const remaining = (expirationTime - now) / 1000;
      return { onCooldown: true, remaining };
    }
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);

  return { onCooldown: false, remaining: 0 };
}
