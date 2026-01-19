/**
 * XP Formula: Hybrid scaling
 * Level 1: 100 XP
 * Level 2: 150 XP (100 + 50)
 * Level 3: 200 XP (100 + 100)
 * ...
 * Level N: 100 + (N * 50) XP
 */

/**
 * Get XP required for a specific level
 */
export function getXpForLevel(level: number): number {
  if (level <= 0) return 0;
  return 100 + level * 50;
}

/**
 * Get total XP required to reach a level (cumulative)
 */
export function getTotalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += getXpForLevel(i);
  }
  return total;
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXp(xp: number): number {
  let level = 0;
  let totalXp = 0;

  while (totalXp + getXpForLevel(level + 1) <= xp) {
    level++;
    totalXp += getXpForLevel(level);
  }

  return level;
}

/**
 * Get current progress towards next level
 */
export function getXpProgress(xp: number): {
  current: number;
  needed: number;
  percentage: number;
} {
  const level = getLevelFromXp(xp);
  const currentLevelTotalXp = getTotalXpForLevel(level);
  const nextLevelXp = getXpForLevel(level + 1);
  const currentProgress = xp - currentLevelTotalXp;

  return {
    current: currentProgress,
    needed: nextLevelXp,
    percentage: Math.floor((currentProgress / nextLevelXp) * 100),
  };
}

/**
 * Get random XP within range (for message XP gain)
 */
export function getRandomXp(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
