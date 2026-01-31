'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award } from 'lucide-react';

interface TopMember {
  discordId: string;
  username: string;
  xp: number;
  level: number;
}

interface TopMembersListProps {
  members: TopMember[];
  loading?: boolean;
}

export function TopMembersList({ members, loading }: TopMembersListProps) {
  if (loading) {
    return (
      <Card className="bg-surface-1 border-white/10">
        <CardHeader>
          <CardTitle>Top Members</CardTitle>
          <CardDescription>Highest XP earners</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!members || members.length === 0) {
    return (
      <Card className="bg-surface-1 border-white/10">
        <CardHeader>
          <CardTitle>Top Members</CardTitle>
          <CardDescription>Highest XP earners</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No member data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-sm text-muted-foreground">#{index + 1}</span>;
    }
  };

  return (
    <Card className="bg-surface-1 border-white/10">
      <CardHeader>
        <CardTitle>Top Members</CardTitle>
        <CardDescription>Highest XP earners</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.map((member, index) => (
            <div
              key={member.discordId}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              {/* Rank */}
              <div className="w-8 flex items-center justify-center">
                {getRankIcon(index)}
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{member.username}</p>
                <p className="text-xs text-muted-foreground">
                  Level {member.level}
                </p>
              </div>

              {/* XP */}
              <div className="text-right">
                <p className="font-semibold text-aqua-400">
                  {member.xp.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
