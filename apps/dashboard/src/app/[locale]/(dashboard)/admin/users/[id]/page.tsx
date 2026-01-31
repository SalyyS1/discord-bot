import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Building2,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      accounts: true,
      tenants: true,
      sessions: {
        where: {
          expiresAt: {
            gte: new Date(),
          },
        },
        orderBy: {
          expiresAt: 'desc',
        },
        take: 5,
      },
    },
  });

  if (!user) {
    notFound();
  }

  const discordAccount = user.accounts.find(a => a.providerId === 'discord');
  const activeSessions = user.sessions.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || 'User'}
              className="w-16 h-16 rounded-full border-2 border-white/20"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-semibold border-2 border-white/20">
              {user.name?.[0] || user.email?.[0] || '?'}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{user.name || 'Unknown User'}</h1>
            <p className="text-sm text-white/60">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {user.id}
              </Badge>
              {activeSessions > 0 && (
                <Badge variant="default" className="text-xs bg-green-500">
                  {activeSessions} Active Session{activeSessions > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white/5 backdrop-blur-sm border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Tenants</p>
              <p className="text-2xl font-bold text-white mt-1">
                {user.tenants.length}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-4 bg-white/5 backdrop-blur-sm border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Accounts</p>
              <p className="text-2xl font-bold text-white mt-1">
                {user.accounts.length}
              </p>
            </div>
            <Shield className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-4 bg-white/5 backdrop-blur-sm border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Sessions</p>
              <p className="text-2xl font-bold text-white mt-1">
                {activeSessions}
              </p>
            </div>
            <Activity className="w-8 h-8 text-purple-400" />
          </div>
        </Card>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Info */}
        <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            User Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/60">Name</label>
              <p className="text-sm text-white">{user.name || 'Not set'}</p>
            </div>
            <div>
              <label className="text-xs text-white/60">Email</label>
              <p className="text-sm text-white">{user.email || 'Not set'}</p>
            </div>
            <div>
              <label className="text-xs text-white/60">Email Verified</label>
              <p className="text-sm text-white">
                {user.emailVerified ? 'Verified' : 'Not verified'}
              </p>
            </div>
            <div>
              <label className="text-xs text-white/60">Created</label>
              <p className="text-sm text-white">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            {discordAccount && (
              <div>
                <label className="text-xs text-white/60">Discord ID</label>
                <p className="text-sm text-white font-mono">{discordAccount.accountId}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Accounts */}
        <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Linked Accounts ({user.accounts.length})
          </h3>
          <div className="space-y-2">
            {user.accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5"
              >
                <div>
                  <p className="text-sm font-medium text-white capitalize">
                    {account.providerId}
                  </p>
                  <p className="text-xs text-white/60 font-mono">
                    {account.accountId}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  oauth
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tenant Memberships */}
      <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Tenants ({user.tenants.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {user.tenants.map((tenant) => (
            <Link
              key={tenant.id}
              href={`/admin/tenants/${tenant.id}`}
              className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    {tenant.name}
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    Created {new Date(tenant.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {tenant.status}
                </Badge>
              </div>
            </Link>
          ))}
          {user.tenants.length === 0 && (
            <p className="text-sm text-white/60 col-span-full text-center py-8">
              No tenant memberships
            </p>
          )}
        </div>
      </Card>

      {/* Active Sessions */}
      {user.sessions.length > 0 && (
        <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Active Sessions ({user.sessions.length})
          </h3>
          <div className="space-y-2">
            {user.sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5"
              >
                <div>
                  <p className="text-sm text-white font-mono text-xs">
                    {session.token.slice(0, 32)}...
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    Expires {new Date(session.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="text-red-400 border-red-400/30">
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
