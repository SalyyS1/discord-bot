/**
 * Profile Header Component
 * Displays user avatar, name, and Discord tag
 */

'use client';

import Image from 'next/image';
import { getUserAvatarUrl } from '@/lib/auth/discord-api-client';

interface ProfileHeaderProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  discordUser?: {
    username: string;
    discriminator: string;
    avatar: string | null;
  } | null;
}

export function ProfileHeader({ user, discordUser }: ProfileHeaderProps) {
  const avatarUrl = discordUser
    ? getUserAvatarUrl(user.id, discordUser.avatar)
    : user.image || '/default-avatar.png';

  const displayName = user.name || discordUser?.username || 'User';
  const discordTag = discordUser
    ? `${discordUser.username}#${discordUser.discriminator}`
    : null;

  return (
    <div className="flex items-center gap-6 rounded-lg border bg-card p-6">
      <div className="relative h-24 w-24 overflow-hidden rounded-full">
        <Image
          src={avatarUrl || '/default-avatar.png'}
          alt={displayName}
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="flex-1">
        <h1 className="text-2xl font-bold">{displayName}</h1>
        {discordTag && (
          <p className="text-sm text-muted-foreground">{discordTag}</p>
        )}
        {user.email && (
          <p className="text-sm text-muted-foreground">{user.email}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 text-right text-sm text-muted-foreground">
        <p>User ID: {user.id}</p>
      </div>
    </div>
  );
}
