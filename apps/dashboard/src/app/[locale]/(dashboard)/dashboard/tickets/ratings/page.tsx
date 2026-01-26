'use client';

import { useEffect, useState } from 'react';
import { Loader2, Star, MessageSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface Rating {
    id: string;
    ticketId: string;
    stars: number;
    review: string | null;
    createdAt: string;
    ticket: {
        member: {
            discordId: string;
        }
    }
}

export default function RatingsPage() {
    const [loading, setLoading] = useState(true);
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [average, setAverage] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const guildsRes = await fetch('/api/guilds');
            const guildsData = await guildsRes.json();

            if (!guildsData.guilds?.length) {
                setError('No guilds found.');
                setLoading(false);
                return;
            }

            const firstGuild = guildsData.guilds[0];

            const res = await fetch(`/api/guilds/${firstGuild.id}/tickets/ratings`);
            const { data } = await res.json();

            setRatings(data || []);

            if (data && data.length > 0) {
                const avg = data.reduce((acc: number, r: Rating) => acc + r.stars, 0) / data.length;
                setAverage(avg);
            }
        } catch {
            setError('Failed to load ratings');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/tickets">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold">Feedback & Ratings</h2>
                        <p className="text-muted-foreground">User satisfaction reviews</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
                    <span className="text-sm font-medium">Average Rating:</span>
                    <div className="flex items-center">
                        <span className="font-bold text-lg mr-1">{average.toFixed(1)}</span>
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4">
                {ratings.map((rating) => (
                    <Card key={rating.id}>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`h-4 w-4 ${i < rating.stars
                                                        ? 'fill-yellow-400 text-yellow-400'
                                                        : 'text-muted-foreground opacity-30'
                                                    }`}
                                            />
                                        ))}
                                        <span className="text-sm text-muted-foreground ml-2">
                                            {new Date(rating.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {rating.review && (
                                        <p className="mt-2 text-sm">{rating.review}</p>
                                    )}
                                    {!rating.review && (
                                        <p className="mt-2 text-sm italic text-muted-foreground">No written review</p>
                                    )}
                                </div>
                                <Badge variant="outline">
                                    Ticket #{rating.ticketId.slice(0, 8)}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {ratings.length === 0 && (
                    <div className="text-center py-12 border rounded-lg border-dashed">
                        <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-20" />
                        <p className="text-muted-foreground">No ratings received yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
