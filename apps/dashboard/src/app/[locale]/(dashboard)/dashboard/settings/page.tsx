'use client';

import { useEffect, useState } from 'react';
import {
  Settings,
  Bot,
  Database,
  Globe,
  Shield,
  Bell,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Server,
  Clock,
  Users,
  MessageSquare,
  Zap,
  Palette,
  Sun,
  Moon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';

interface BotStats {
  guilds: number;
  users: number;
  commands: number;
  uptime: string;
}

export default function SettingsPage() {
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setBotStats({
        guilds: 1,
        users: 150,
        commands: 45,
        uptime: '99.9%',
      });
      setLoading(false);
    }, 500);
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.15), rgba(107, 114, 128, 0.05))', border: '1px solid rgba(107, 114, 128, 0.3)' }}>
          <Settings className="h-7 w-7 text-gray-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white dark:text-white">Settings</h1>
          <p className="text-gray-400 mt-1">Dashboard and bot configuration</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bot Status */}
          <Card className="surface-card overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[hsl(174_72%_50%/0.1)] to-transparent border-b border-[hsl(200_20%_22%)] pb-4">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-[hsl(174_72%_55%)]" />
                <div>
                  <CardTitle className="text-white dark:text-white">Bot Status</CardTitle>
                  <CardDescription className="text-gray-400">Current bot information and health</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat-card">
                  <Server className="h-5 w-5 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white dark:text-white">{loading ? '-' : botStats?.guilds}</p>
                  <p className="text-xs text-gray-400">Servers</p>
                </div>
                <div className="stat-card">
                  <Users className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white dark:text-white">{loading ? '-' : botStats?.users}</p>
                  <p className="text-xs text-gray-400">Users</p>
                </div>
                <div className="stat-card">
                  <Zap className="h-5 w-5 text-yellow-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white dark:text-white">{loading ? '-' : botStats?.commands}</p>
                  <p className="text-xs text-gray-400">Commands</p>
                </div>
                <div className="stat-card">
                  <Clock className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white dark:text-white">{loading ? '-' : botStats?.uptime}</p>
                  <p className="text-xs text-gray-400">Uptime</p>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <p className="text-white dark:text-white font-medium">All Systems Operational</p>
                      <p className="text-gray-400 text-sm">Bot is running smoothly</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Online</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Status */}
          <Card className="surface-card overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-transparent border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-blue-400" />
                <div>
                  <CardTitle className="text-white dark:text-white">Database Connection</CardTitle>
                  <CardDescription className="text-gray-400">Database health and statistics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="p-4 rounded-xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="text-white dark:text-white font-medium">PostgreSQL</p>
                      <p className="text-gray-400 text-sm">Primary database</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Connected</Badge>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="text-white dark:text-white font-medium">Redis Cache</p>
                      <p className="text-gray-400 text-sm">Session & caching</p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Optional</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card className="surface-card overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-500/10 to-transparent border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-purple-400" />
                <div>
                  <CardTitle className="text-white dark:text-white">Language & Region</CardTitle>
                  <CardDescription className="text-gray-400">Dashboard display preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-gray-300">Dashboard Language</Label>
                <LanguageSwitcher />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Timezone</Label>
                <Select defaultValue="utc">
                  <SelectTrigger className="bg-[#1a1d26] dark:bg-[#1a1d26] border-white/10 text-white max-w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d26] border-white/10">
                    <SelectItem value="utc" className="text-white hover:bg-white/10">UTC (Coordinated Universal Time)</SelectItem>
                    <SelectItem value="asia_hcm" className="text-white hover:bg-white/10">Asia/Ho_Chi_Minh (GMT+7)</SelectItem>
                    <SelectItem value="us_eastern" className="text-white hover:bg-white/10">US/Eastern (GMT-5)</SelectItem>
                    <SelectItem value="eu_london" className="text-white hover:bg-white/10">Europe/London (GMT+0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="surface-card overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-500/10 to-transparent border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-orange-400" />
                <div>
                  <CardTitle className="text-white dark:text-white">Notifications</CardTitle>
                  <CardDescription className="text-gray-400">Dashboard notification preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="toggle-section">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-white dark:text-white font-medium">New Ticket Alerts</p>
                      <p className="text-gray-400 text-sm">Get notified when new tickets are created</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="toggle-section">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="text-white dark:text-white font-medium">Security Alerts</p>
                      <p className="text-gray-400 text-sm">Moderation actions and raid warnings</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="toggle-section">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="text-white dark:text-white font-medium">Bot Updates</p>
                      <p className="text-gray-400 text-sm">New features and changelog updates</p>
                    </div>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Links */}
          <Card className="overflow-hidden bg-gradient-to-br from-[hsl(174_72%_50%/0.1)] via-[hsl(180_70%_40%/0.05)] to-transparent border-[hsl(174_72%_50%/0.2)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-white dark:text-white">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start border-white/10 text-gray-300 hover:bg-white/5 hover:text-white">
                <ExternalLink className="h-4 w-4 mr-2" />
                Documentation
              </Button>
              <Button variant="outline" className="w-full justify-start border-white/10 text-gray-300 hover:bg-white/5 hover:text-white">
                <ExternalLink className="h-4 w-4 mr-2" />
                Support Server
              </Button>
              <Button variant="outline" className="w-full justify-start border-white/10 text-gray-300 hover:bg-white/5 hover:text-white">
                <ExternalLink className="h-4 w-4 mr-2" />
                Status Page
              </Button>
            </CardContent>
          </Card>

          {/* Version Info */}
          <Card className="surface-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm">Version Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                <span className="text-gray-400">Bot Version</span>
                <Badge variant="outline" className="text-[hsl(174_72%_55%)] border-[hsl(174_72%_50%/0.3)] bg-[hsl(174_72%_50%/0.1)]">v1.0.0</Badge>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                <span className="text-gray-400">Dashboard</span>
                <Badge variant="outline" className="text-[hsl(180_60%_55%)] border-[hsl(180_60%_50%/0.3)] bg-[hsl(180_60%_50%/0.1)]">v1.0.0</Badge>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                <span className="text-gray-400">API</span>
                <Badge variant="outline" className="text-[hsl(200_70%_55%)] border-[hsl(200_70%_50%/0.3)] bg-[hsl(200_70%_50%/0.1)]">v1.0.0</Badge>
              </div>
              <div className="pt-2 border-t border-white/10">
                <Button variant="ghost" size="sm" className="w-full text-gray-400 hover:text-white hover:bg-white/5">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check for Updates
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Theme */}
          <Card className="surface-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mounted && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTheme('dark')}
                    className={`flex-1 p-3 rounded-lg flex flex-col items-center gap-2 transition-all ${
                      theme === 'dark' 
                        ? 'bg-[hsl(174_72%_50%/0.2)] border-2 border-[hsl(174_72%_50%/0.5)]' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Moon className={`h-5 w-5 ${theme === 'dark' ? 'text-[hsl(174_72%_55%)]' : 'text-gray-400'}`} />
                    <span className={`text-xs ${theme === 'dark' ? 'text-[hsl(174_72%_60%)]' : 'text-gray-400'}`}>Dark</span>
                  </button>
                  <button 
                    onClick={() => setTheme('light')}
                    className={`flex-1 p-3 rounded-lg flex flex-col items-center gap-2 transition-all ${
                      theme === 'light' 
                        ? 'bg-[hsl(174_72%_50%/0.2)] border-2 border-[hsl(174_72%_50%/0.5)]' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Sun className={`h-5 w-5 ${theme === 'light' ? 'text-[hsl(174_72%_55%)]' : 'text-gray-400'}`} />
                    <span className={`text-xs ${theme === 'light' ? 'text-[hsl(174_72%_60%)]' : 'text-gray-400'}`}>Light</span>
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 text-center">Choose your preferred theme</p>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="overflow-hidden bg-red-950/20 border-red-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-400 text-sm">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10">
                Reset All Settings
              </Button>
              <Button variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10">
                Remove Bot from Server
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
