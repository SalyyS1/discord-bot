'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Server,
  Database,
  Globe,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'maintenance';

interface Service {
  name: string;
  icon: typeof Server;
  status: ServiceStatus;
  latency?: number;
  description: string;
}

interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'minor' | 'major' | 'critical';
  createdAt: string;
  updatedAt: string;
  updates: {
    time: string;
    status: string;
    message: string;
  }[];
}

// Mock data - in production, fetch from monitoring API
const services: Service[] = [
  { name: 'Discord Bot', icon: MessageSquare, status: 'operational', latency: 45, description: 'Core bot functionality' },
  { name: 'Dashboard', icon: Globe, status: 'operational', latency: 120, description: 'Web dashboard' },
  { name: 'API', icon: Server, status: 'operational', latency: 65, description: 'REST API endpoints' },
  { name: 'Database', icon: Database, status: 'operational', latency: 12, description: 'PostgreSQL database' },
  { name: 'Redis Cache', icon: Database, status: 'operational', latency: 3, description: 'Cache and pub/sub' },
];

const recentIncidents: Incident[] = [];

// Uptime data for the last 90 days (mock)
const uptimeData = Array.from({ length: 90 }, (_, i) => ({
  date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  status: Math.random() > 0.02 ? 'operational' : 'degraded' as ServiceStatus,
})).reverse();

function getStatusInfo(status: ServiceStatus) {
  switch (status) {
    case 'operational':
      return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Operational' };
    case 'degraded':
      return { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Degraded Performance' };
    case 'outage':
      return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Major Outage' };
    case 'maintenance':
      return { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Under Maintenance' };
  }
}

function getOverallStatus(services: Service[]): ServiceStatus {
  if (services.some(s => s.status === 'outage')) return 'outage';
  if (services.some(s => s.status === 'degraded')) return 'degraded';
  if (services.some(s => s.status === 'maintenance')) return 'maintenance';
  return 'operational';
}

function UptimeBar({ data }: { data: typeof uptimeData }) {
  return (
    <div className="flex gap-[2px]">
      {data.map((day, i) => {
        const statusInfo = getStatusInfo(day.status);
        return (
          <div
            key={i}
            className={`w-1 h-8 rounded-sm ${
              day.status === 'operational' ? 'bg-green-500' : 'bg-yellow-500'
            } opacity-80 hover:opacity-100 transition-opacity`}
            title={`${day.date}: ${statusInfo.label}`}
          />
        );
      })}
    </div>
  );
}

export default function StatusPage() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const overallStatus = getOverallStatus(services);
  const overallInfo = getStatusInfo(overallStatus);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // In production, fetch latest status
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  // Calculate uptime percentage
  const uptimePercentage = (uptimeData.filter(d => d.status === 'operational').length / uptimeData.length * 100).toFixed(2);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="pt-24 pb-16">
        {/* Header */}
        <div className="max-w-3xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold">System Status</h1>
            <p className="mt-4 text-muted-foreground">
              Real-time status of all Antigravity services
            </p>
          </motion.div>

          {/* Overall Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className={`mt-8 ${overallInfo.bg} border-none`}>
              <CardContent className="flex items-center justify-between py-6">
                <div className="flex items-center gap-4">
                  <overallInfo.icon className={`w-10 h-10 ${overallInfo.color}`} />
                  <div>
                    <p className={`text-xl font-bold ${overallInfo.color}`}>
                      {overallInfo.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8"
          >
            <h2 className="text-xl font-bold mb-4">Services</h2>
            <div className="space-y-3">
              {services.map((service) => {
                const statusInfo = getStatusInfo(service.status);
                return (
                  <Card key={service.name} className="bg-surface-1 border-white/10">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-white/5">
                          <service.icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {service.latency && (
                          <span className="text-sm text-muted-foreground">
                            {service.latency}ms
                          </span>
                        )}
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bg}`}>
                          <statusInfo.icon className={`w-4 h-4 ${statusInfo.color}`} />
                          <span className={`text-sm ${statusInfo.color}`}>{statusInfo.label}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>

          {/* Uptime */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8"
          >
            <Card className="bg-surface-1 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>90-Day Uptime</span>
                  <span className="text-green-400">{uptimePercentage}%</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UptimeBar data={uptimeData} />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>90 days ago</span>
                  <span>Today</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Incidents */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8"
          >
            <h2 className="text-xl font-bold mb-4">Recent Incidents</h2>
            {recentIncidents.length === 0 ? (
              <Card className="bg-surface-1 border-white/10">
                <CardContent className="py-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No incidents reported in the last 90 days</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {recentIncidents.map((incident) => (
                  <Card key={incident.id} className="bg-surface-1 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-lg">{incident.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {incident.updates.map((update, i) => (
                        <div key={i} className="border-l-2 border-white/10 pl-4 py-2">
                          <p className="text-sm text-muted-foreground">{update.time}</p>
                          <p className="font-medium">{update.status}</p>
                          <p className="text-muted-foreground">{update.message}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>

          {/* Subscribe */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 text-center"
          >
            <p className="text-muted-foreground">
              Get notified about incidents and scheduled maintenance
            </p>
            <Button className="mt-4" variant="outline">
              Subscribe to Updates
            </Button>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
