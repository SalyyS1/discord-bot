'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Gift, Trophy, Clock, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useRealtimeGiveaways, type GiveawayFilters } from '@/hooks/use-realtime-giveaways';
import { GiveawayHistoryFilters } from '@/components/giveaway/giveaway-history-filters';

export default function GiveawaysPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [historyFilters, setHistoryFilters] = useState<GiveawayFilters>({
    page: 1,
    limit: 20,
  });

  // Fetch active giveaways
  const {
    data: activeData,
    isLoading: loadingActive,
  } = useRealtimeGiveaways(guildId, {
    filters: { status: 'ACTIVE' },
    refetchInterval: 30000,
  });

  // Fetch history with filters
  const {
    data: historyData,
    isLoading: loadingHistory,
  } = useRealtimeGiveaways(guildId, {
    filters: historyFilters,
    refetchInterval: 60000, // Less frequent for history
  });

  const activeGiveaways = activeData?.giveaways ?? [];
  const historyGiveaways = historyData?.giveaways ?? [];
  const totalPages = historyData?.totalPages ?? 1;
  const currentPage = historyData?.page ?? 1;

  // Export handlers
  const handleExport = async (format: 'csv' | 'json') => {
    const params = new URLSearchParams();
    params.append('format', format);
    if (historyFilters.status) params.append('status', historyFilters.status);
    if (historyFilters.startDate) params.append('startDate', historyFilters.startDate);
    if (historyFilters.endDate) params.append('endDate', historyFilters.endDate);
    if (historyFilters.search) params.append('search', historyFilters.search);

    const url = `/api/guilds/${guildId}/giveaways/export?${params.toString()}`;
    window.open(url, '_blank');
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    setHistoryFilters((prev) => ({ ...prev, page }));
  };

  const handleFiltersChange = (filters: GiveawayFilters) => {
    setHistoryFilters((prev) => ({
      ...filters,
      page: 1, // Reset to page 1 when filters change
      limit: prev.limit,
    }));
  };

  // Calculate stats from all giveaways
  const allGiveawaysCount = (activeData?.giveaways?.length ?? 0) + (historyData?.total ?? 0);
  const endedCount = historyData?.giveaways?.filter((g) => g.status === 'ENDED').length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gift className="h-8 w-8" />
        <div>
          <h2 className="text-2xl font-bold">Giveaways</h2>
          <p className="text-muted-foreground">Manage server giveaways</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGiveaways.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ended</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{endedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allGiveawaysCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Active Tab */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Giveaways</CardTitle>
              <CardDescription>Currently running giveaways</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActive ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : activeGiveaways.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active giveaways</p>
              ) : (
                <div className="space-y-4">
                  {activeGiveaways.map((giveaway) => (
                    <div
                      key={giveaway.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">{giveaway.prize}</p>
                        <p className="text-sm text-muted-foreground">
                          {giveaway.winnerCount} winner(s) • Ends{' '}
                          {new Date(giveaway.endsAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Filters</CardTitle>
                  <CardDescription>Filter and export giveaway history</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('csv')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('json')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <GiveawayHistoryFilters onFiltersChange={handleFiltersChange} />
            </CardContent>
          </Card>

          {/* Giveaways List */}
          <Card>
            <CardHeader>
              <CardTitle>Giveaway History</CardTitle>
              <CardDescription>
                Showing {historyGiveaways.length} of {historyData?.total ?? 0} giveaways
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : historyGiveaways.length === 0 ? (
                <p className="text-sm text-muted-foreground">No giveaways found</p>
              ) : (
                <>
                  <div className="space-y-4">
                    {historyGiveaways.map((giveaway) => (
                      <div
                        key={giveaway.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <p className="font-medium">{giveaway.prize}</p>
                          <p className="text-sm text-muted-foreground">
                            {giveaway.winnerCount} winner(s) •{' '}
                            {giveaway.status === 'ACTIVE' ? 'Ends' : 'Ended'}{' '}
                            {new Date(giveaway.endsAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            giveaway.status === 'ACTIVE'
                              ? 'bg-green-500/10 text-green-500'
                              : giveaway.status === 'ENDED'
                                ? 'bg-gray-500/10 text-gray-500'
                                : 'bg-red-500/10 text-red-500'
                          }`}
                        >
                          {giveaway.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => goToPage(currentPage - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => goToPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => goToPage(currentPage + 1)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
