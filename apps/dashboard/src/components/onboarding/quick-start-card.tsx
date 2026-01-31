'use client';

import { ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuickStartCardProps {
    title: string;
    steps: string[];
    onStart?: () => void;
    className?: string;
}

/**
 * Quick start guide card for feature setup
 */
export function QuickStartCard({ title, steps, onStart, className }: QuickStartCardProps) {
    return (
        <Card className={`border-cyan-500/20 bg-cyan-500/5 ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <ArrowRight className="w-3 h-3 text-cyan-400" />
                    </span>
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <ol className="space-y-2">
                    {steps.map((step, index) => (
                        <li key={index} className="flex items-center gap-3 text-sm text-white/80">
                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">
                                {index + 1}
                            </span>
                            {step}
                        </li>
                    ))}
                </ol>
                {onStart && (
                    <Button
                        onClick={onStart}
                        size="sm"
                        className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700"
                    >
                        Start Setup
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
