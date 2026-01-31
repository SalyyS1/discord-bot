'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorCardProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    className?: string;
}

/**
 * Reusable error display card with optional retry action
 */
export function ErrorCard({
    title = 'Something went wrong',
    message,
    onRetry,
    className
}: ErrorCardProps) {
    return (
        <Card className={`border-red-500/20 bg-red-500/5 ${className}`}>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-white/70">{message}</p>
                {onRetry && (
                    <Button
                        variant="outline"
                        onClick={onRetry}
                        className="border-red-500/30 hover:bg-red-500/10"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
