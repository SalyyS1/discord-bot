'use client';

import { useEffect, useState } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

interface ChartProps {
    data: { date: string; members: number; messages?: number }[];
}

export function GrowthChart({ data }: ChartProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center">
                <div className="text-gray-400 text-sm">Loading chart...</div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center">
                <div className="text-gray-400 text-sm">No data available</div>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: 300, minHeight: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(174, 72%, 50%)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="hsl(174, 72%, 50%)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(200, 20%, 25%)" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="hsl(200, 15%, 50%)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="hsl(200, 15%, 50%)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                        contentStyle={{ 
                            backgroundColor: 'hsl(200, 22%, 16%)', 
                            borderColor: 'hsl(200, 20%, 25%)', 
                            color: 'white',
                            borderRadius: '8px',
                        }}
                        itemStyle={{ color: 'hsl(174, 72%, 55%)' }}
                        labelStyle={{ color: 'hsl(200, 15%, 70%)' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="members"
                        stroke="hsl(174, 72%, 50%)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorMembers)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
