'use client';

import { useState } from 'react';
import { Plus, Trash2, Music, Play, Share2, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Track {
    title: string;
    url: string;
    duration?: number;
    thumbnail?: string;
    artist?: string;
}

interface Playlist {
    id: string;
    name: string;
    tracks: Track[];
    isPublic: boolean;
    createdAt: string;
}

interface PlaylistManagerProps {
    guildId: string;
}

export function PlaylistManager({ guildId }: PlaylistManagerProps) {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [importUrl, setImportUrl] = useState('');

    const fetchPlaylists = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/user/playlists?guildId=${guildId}`);
            if (res.ok) {
                const data = await res.json();
                setPlaylists(data.data || []);
            } else {
                setError('Failed to load playlists');
            }
        } catch (err) {
            setError('An error occurred while loading playlists');
        } finally {
            setLoading(false);
        }
    };

    const createPlaylist = async () => {
        if (!newPlaylistName.trim()) return;

        try {
            const res = await fetch('/api/user/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guildId,
                    name: newPlaylistName,
                    tracks: [],
                    isPublic: false,
                }),
            });

            if (res.ok) {
                setNewPlaylistName('');
                setCreateDialogOpen(false);
                fetchPlaylists();
            } else {
                const data = await res.json();
                setError(data.message || 'Failed to create playlist');
            }
        } catch (err) {
            setError('An error occurred while creating playlist');
        }
    };

    const deletePlaylist = async (playlistId: string) => {
        if (!confirm('Are you sure you want to delete this playlist?')) return;

        try {
            const res = await fetch(`/api/user/playlists?id=${playlistId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                fetchPlaylists();
            } else {
                setError('Failed to delete playlist');
            }
        } catch (err) {
            setError('An error occurred while deleting playlist');
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getTotalDuration = (tracks: Track[]) => {
        const total = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
        const hours = Math.floor(total / 3600);
        const mins = Math.floor((total % 3600) / 60);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Saved Playlists</h2>
                    <p className="text-gray-400 mt-1">Manage your music playlists</p>
                </div>

                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Playlist
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#1a1d26] border-white/10">
                        <DialogHeader>
                            <DialogTitle className="text-white">Create New Playlist</DialogTitle>
                            <DialogDescription className="text-gray-400">
                                Give your playlist a unique name
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-gray-300">Playlist Name</Label>
                                <Input
                                    value={newPlaylistName}
                                    onChange={(e) => setNewPlaylistName(e.target.value)}
                                    placeholder="My Awesome Playlist"
                                    maxLength={100}
                                    className="bg-[#0f1117] border-white/10 text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gray-300">Import from URL (optional)</Label>
                                <Input
                                    value={importUrl}
                                    onChange={(e) => setImportUrl(e.target.value)}
                                    placeholder="https://youtube.com/playlist?list=..."
                                    className="bg-[#0f1117] border-white/10 text-white"
                                />
                                <p className="text-xs text-gray-500">
                                    Import tracks from YouTube or Spotify playlist
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setCreateDialogOpen(false)}
                                className="border-white/10 text-white hover:bg-white/5"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={createPlaylist}
                                disabled={!newPlaylistName.trim()}
                                className="bg-pink-500 hover:bg-pink-600"
                            >
                                Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
                </div>
            )}

            {/* Playlists Grid */}
            {!loading && playlists.length === 0 && (
                <Card className="surface-card border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Music className="h-12 w-12 text-gray-500 mb-4" />
                        <p className="text-gray-400 text-center">
                            No playlists yet. Create your first playlist!
                        </p>
                    </CardContent>
                </Card>
            )}

            {!loading && playlists.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {playlists.map((playlist) => (
                        <Card key={playlist.id} className="surface-card overflow-hidden group">
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-white truncate flex items-center gap-2">
                                            <Music className="h-4 w-4 text-pink-400 flex-shrink-0" />
                                            {playlist.name}
                                        </CardTitle>
                                        <CardDescription className="text-gray-400 mt-1">
                                            {playlist.tracks.length} tracks • {getTotalDuration(playlist.tracks)}
                                        </CardDescription>
                                    </div>
                                    {playlist.isPublic && (
                                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                            Public
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Track Preview */}
                                {playlist.tracks.length > 0 && (
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {playlist.tracks.slice(0, 3).map((track, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-2 text-sm text-gray-400 truncate"
                                            >
                                                <span className="text-gray-600">{i + 1}.</span>
                                                <span className="truncate">{track.title}</span>
                                            </div>
                                        ))}
                                        {playlist.tracks.length > 3 && (
                                            <p className="text-xs text-gray-600">
                                                +{playlist.tracks.length - 3} more
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2 border-t border-white/5">
                                    <Button
                                        size="sm"
                                        className="flex-1 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 border-pink-500/30"
                                    >
                                        <Play className="mr-1 h-3 w-3" />
                                        Play
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-white/10 hover:bg-white/5"
                                    >
                                        <Share2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => deletePlaylist(playlist.id)}
                                        className="border-red-500/30 hover:bg-red-500/10 text-red-400"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
