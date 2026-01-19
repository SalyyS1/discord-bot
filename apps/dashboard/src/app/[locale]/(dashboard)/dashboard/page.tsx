'use client';

import { useTranslations } from 'next-intl';
import {
  Users,
  MessageSquare,
  Trophy,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ReactNode;
}

function StatCard({ title, value, change, changeType, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {changeType === 'positive' ? (
            <ArrowUpRight className="h-3 w-3 text-green-500" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-red-500" />
          )}
          <span className={changeType === 'positive' ? 'text-green-500' : 'text-red-500'}>
            {change}
          </span>
          {' from last week'}
        </p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const t = useTranslations('home');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('welcome')}</h2>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Members"
          value="2,350"
          change="+180"
          changeType="positive"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Messages Today"
          value="1,247"
          change="+12%"
          changeType="positive"
          icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Active Giveaways"
          value="3"
          change="+1"
          changeType="positive"
          icon={<Trophy className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Mod Actions"
          value="24"
          change="-5"
          changeType="negative"
          icon={<Shield className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Configure your bot settings from the sidebar navigation.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              No recent activity to display.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bot Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">Online</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
