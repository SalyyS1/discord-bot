'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LevelDistribution {
  level: number;
  count: number;
}

interface LevelDistributionChartProps {
  data: LevelDistribution[];
  loading?: boolean;
}

export function LevelDistributionChart({ data, loading }: LevelDistributionChartProps) {
  if (loading) {
    return (
      <Card className="bg-surface-1 border-white/10">
        <CardHeader>
          <CardTitle>Level Distribution</CardTitle>
          <CardDescription>Member distribution across levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-white/5 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="bg-surface-1 border-white/10">
        <CardHeader>
          <CardTitle>Level Distribution</CardTitle>
          <CardDescription>Member distribution across levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No level data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group levels into buckets for better visualization
  const buckets: Record<string, number> = {};
  data.forEach(({ level, count }) => {
    if (level < 10) buckets['1-9'] = (buckets['1-9'] || 0) + count;
    else if (level < 20) buckets['10-19'] = (buckets['10-19'] || 0) + count;
    else if (level < 30) buckets['20-29'] = (buckets['20-29'] || 0) + count;
    else if (level < 40) buckets['30-39'] = (buckets['30-39'] || 0) + count;
    else if (level < 50) buckets['40-49'] = (buckets['40-49'] || 0) + count;
    else buckets['50+'] = (buckets['50+'] || 0) + count;
  });

  const chartData = Object.entries(buckets).map(([range, count]) => ({
    range,
    count,
  }));

  const maxCount = Math.max(...chartData.map(d => d.count));

  return (
    <Card className="bg-surface-1 border-white/10">
      <CardHeader>
        <CardTitle>Level Distribution</CardTitle>
        <CardDescription>Member distribution across levels</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-6 w-12 flex flex-col justify-between text-xs text-muted-foreground">
            <span>{maxCount}</span>
            <span>{Math.round(maxCount / 2)}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="ml-14 h-full flex items-end gap-2 pb-6">
            {chartData.map((item, index) => {
              const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={item.range} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-aqua-500/50 hover:bg-aqua-500/70 transition-colors rounded-t relative group"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {item.count} members
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="ml-14 flex justify-between text-xs text-muted-foreground">
            {chartData.map(item => (
              <span key={item.range} className="flex-1 text-center">
                {item.range}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
