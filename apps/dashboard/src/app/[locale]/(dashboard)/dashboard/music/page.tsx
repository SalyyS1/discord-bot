'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Loader2, Save, Music, AlertCircle, Server, Users, Volume2,
    Settings, Mic, Hash, Play, Pause, SkipForward, List, Crown,
    Clock, Percent, Radio, Shuffle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ChannelSelector } from '@/components/selectors/channel-selector';
import { RoleSelector } from '@/components/selectors/role-selector';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGuildContext } from '@/context/guild-context';
import { useGuilds } from '@/hooks';
import { useUpdateMusic } from '@/hooks/use-mutations';
import { PanelSender } from '@/components/panels/panel-sender';
import { PlaylistManager } from '@/components/music/playlist-manager';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface MusicSettings {
    enabled: boolean;
    djRoleId: string | null;
    requestChannelId: string | null;
    defaultVolume: number;
    maxQueueSize: number;
    voteSkipEnabled: boolean;
    voteSkipPercent: number;
    announceTrackChange: boolean;
    stay24_7: boolean;
    autoplayEnabled: boolean;
    disconnectOnEmpty: number;
}

interface TopTrack {
    id: string;
    title: string;
    artist: string | null;
    playCount: number;
    thumbnail: string | null;
}

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

export default function MusicPage() {
    const [activeTab, setActiveTab] = useState('settings');
    const [loading, setLoading] = useState(true);

    const [settings, setSettings] = useState<MusicSettings>({
        enabled: true,
        djRoleId: null,
        requestChannelId: null,
        defaultVolume: 50,
        maxQueueSize: 500,
        voteSkipEnabled: true,
        voteSkipPercent: 50,
        announceTrackChange: true,
        stay24_7: false,
        autoplayEnabled: false,
        disconnectOnEmpty: 300,
    });

    const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
    const [playlistCount, setPlaylistCount] = useState(0);

    const { selectedGuildId, setSelectedGuildId } = useGuildContext();
    const { data: guilds, isLoading: guildsLoading, error: guildsError } = useGuilds();
    const updateMusic = useUpdateMusic(selectedGuildId);

    const fetchSettings = useCallback(async () => {
        if (!selectedGuildId) return;
        setLoading(true);

        try {
            const res = await fetch(`/api/guilds/${selectedGuildId}/music`);
            if (res.ok) {
                const { data } = await res.json();
                if (data) {
                    setSettings(prev => ({ ...prev, ...data.settings }));
                    setTopTracks(data.topTracks || []);
                    setPlaylistCount(data.playlistCount || 0);
                }
            }
        } catch (error) {
            console.error('Failed to fetch music settings:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedGuildId]);

    useEffect(() => {
        if (!selectedGuildId && guilds?.length) {
            setSelectedGuildId(guilds[0].id);
        }
    }, [guilds, selectedGuildId, setSelectedGuildId]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleSave = () => {
        updateMusic.mutate(settings as unknown as Record<string, unknown>);
    };

    if (guildsLoading || loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
            </div>
        );
    }

    if (guildsError || !guilds?.length) {
        return (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    {guildsError ? 'Failed to load servers' : 'No servers found.'}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div className="icon-badge icon-badge-pink">
                        <Music className="h-7 w-7 text-pink-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Music Player</h1>
                        <p className="text-gray-400 mt-1">Play music from YouTube, Spotify & more</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleSave}
                        disabled={updateMusic.isPending}
                        className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold"
                    >
                        {updateMusic.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>

                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                        <Server className="h-5 w-5 text-gray-400" />
                        <Select value={selectedGuildId || ''} onValueChange={setSelectedGuildId}>
                            <SelectTrigger className="w-[180px] bg-transparent border-0 text-white focus:ring-0">
                                <SelectValue placeholder="Select server" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1d26] border-white/10">
                                {guilds.map((guild) => (
                                    <SelectItem key={guild.id} value={guild.id} className="text-white hover:bg-white/10">
                                        {guild.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="surface-card border-pink-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Play className="h-5 w-5 text-pink-400" />
                            <div>
                                <p className="text-xl font-bold text-white">{topTracks.length}</p>
                                <p className="text-xs text-gray-500">Top Tracks</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="surface-card border-purple-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <List className="h-5 w-5 text-purple-400" />
                            <div>
                                <p className="text-xl font-bold text-white">{playlistCount}</p>
                                <p className="text-xs text-gray-500">Saved Playlists</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="surface-card border-blue-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Volume2 className="h-5 w-5 text-blue-400" />
                            <div>
                                <p className="text-xl font-bold text-white">{settings.defaultVolume}%</p>
                                <p className="text-xs text-gray-500">Default Volume</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="surface-card border-emerald-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Radio className="h-5 w-5 text-emerald-400" />
                            <div>
                                <p className="text-xl font-bold text-white">
                                    {settings.stay24_7 ? '24/7' : 'Normal'}
                                </p>
                                <p className="text-xs text-gray-500">Mode</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-[hsl(200_22%_16%)] border border-[hsl(200_20%_25%)] p-1">
                    <TabsTrigger value="settings" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400 rounded-md">
                        <Settings className="w-4 h-4 mr-2" /> Settings
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 rounded-md">
                        <Music className="w-4 h-4 mr-2" /> Top Tracks
                    </TabsTrigger>
                    <TabsTrigger value="playlists" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 rounded-md">
                        <List className="w-4 h-4 mr-2" /> Playlists
                    </TabsTrigger>
                    <TabsTrigger value="commands" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 rounded-md">
                        <Crown className="w-4 h-4 mr-2" /> Commands
                    </TabsTrigger>
                    <TabsTrigger value="panel" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 rounded-md">
                        <Music className="w-4 h-4 mr-2" /> Send Panel
                    </TabsTrigger>
                </TabsList>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-6 mt-6">
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* General */}
                        <Card className="surface-card overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-pink-500/10 to-transparent border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3">
                                    <Music className="w-5 h-5 text-pink-400" />
                                    <div>
                                        <CardTitle className="text-white">General Settings</CardTitle>
                                        <CardDescription className="text-gray-400">Core music configuration</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <Music className="h-5 w-5 text-pink-400" />
                                        <div>
                                            <p className="text-white font-medium">Enable Music</p>
                                            <p className="text-gray-400 text-sm">Allow music commands</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.enabled}
                                        onCheckedChange={(checked) => setSettings(s => ({ ...s, enabled: checked }))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-300">DJ Role (optional)</Label>
                                    <RoleSelector
                                        value={settings.djRoleId || ''}
                                        onChange={(value) => setSettings(s => ({ ...s, djRoleId: (typeof value === 'string' ? value : null) }))}
                                        placeholder="Everyone can use..."
                                    />
                                    <p className="text-xs text-gray-500">Only this role can control music</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-300">Request Channel (optional)</Label>
                                    <ChannelSelector
                                        value={settings.requestChannelId || ''}
                                        onChange={(value) => setSettings(s => ({ ...s, requestChannelId: value || null }))}
                                        types={['text']}
                                        placeholder="Any channel..."
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Playback */}
                        <Card className="surface-card overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-purple-500/10 to-transparent border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3">
                                    <Play className="w-5 h-5 text-purple-400" />
                                    <div>
                                        <CardTitle className="text-white">Playback</CardTitle>
                                        <CardDescription className="text-gray-400">Audio and behavior settings</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-gray-300">Default Volume</Label>
                                        <span className="text-white font-mono">{settings.defaultVolume}%</span>
                                    </div>
                                    <Slider
                                        value={[settings.defaultVolume]}
                                        onValueChange={(values: number[]) => setSettings(s => ({ ...s, defaultVolume: values[0] }))}
                                        max={100}
                                        step={5}
                                        className="w-full"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Max Queue Size</Label>
                                        <Input
                                            type="number"
                                            min={10}
                                            max={1000}
                                            value={settings.maxQueueSize}
                                            onChange={e => setSettings(s => ({ ...s, maxQueueSize: parseInt(e.target.value) || 500 }))}
                                            className="bg-[#1a1d26] border-white/10 text-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Disconnect Delay (sec)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={3600}
                                            value={settings.disconnectOnEmpty}
                                            onChange={e => setSettings(s => ({ ...s, disconnectOnEmpty: parseInt(e.target.value) || 300 }))}
                                            className="bg-[#1a1d26] border-white/10 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                        <div className="flex items-center gap-2">
                                            <Mic className="h-4 w-4 text-blue-400" />
                                            <span className="text-sm text-gray-300">Announce track changes</span>
                                        </div>
                                        <Switch
                                            checked={settings.announceTrackChange}
                                            onCheckedChange={(checked) => setSettings(s => ({ ...s, announceTrackChange: checked }))}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                        <div className="flex items-center gap-2">
                                            <Radio className="h-4 w-4 text-emerald-400" />
                                            <span className="text-sm text-gray-300">24/7 Mode (stay connected)</span>
                                        </div>
                                        <Switch
                                            checked={settings.stay24_7}
                                            onCheckedChange={(checked) => setSettings(s => ({ ...s, stay24_7: checked }))}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                        <div className="flex items-center gap-2">
                                            <Shuffle className="h-4 w-4 text-purple-400" />
                                            <span className="text-sm text-gray-300">Autoplay similar songs</span>
                                        </div>
                                        <Switch
                                            checked={settings.autoplayEnabled}
                                            onCheckedChange={(checked) => setSettings(s => ({ ...s, autoplayEnabled: checked }))}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Vote Skip */}
                        <Card className="surface-card overflow-hidden lg:col-span-2">
                            <CardHeader className="bg-gradient-to-r from-amber-500/10 to-transparent border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3">
                                    <SkipForward className="w-5 h-5 text-amber-400" />
                                    <div>
                                        <CardTitle className="text-white">Vote Skip</CardTitle>
                                        <CardDescription className="text-gray-400">Democratic skip functionality</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-6 flex-wrap">
                                    <div className="flex items-center gap-4">
                                        <Switch
                                            checked={settings.voteSkipEnabled}
                                            onCheckedChange={(checked) => setSettings(s => ({ ...s, voteSkipEnabled: checked }))}
                                        />
                                        <span className="text-gray-300">Enable vote skip</span>
                                    </div>

                                    {settings.voteSkipEnabled && (
                                        <div className="flex items-center gap-3">
                                            <Label className="text-gray-300">Required votes:</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={100}
                                                    value={settings.voteSkipPercent}
                                                    onChange={e => setSettings(s => ({ ...s, voteSkipPercent: parseInt(e.target.value) || 50 }))}
                                                    className="bg-[#1a1d26] border-white/10 text-white w-20"
                                                />
                                                <Percent className="h-4 w-4 text-gray-500" />
                                            </div>
                                            <span className="text-gray-500 text-sm">of listeners</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Playlists Tab */}
                <TabsContent value="playlists" className="space-y-6 mt-6">
                    <PlaylistManager guildId={selectedGuildId || ''} />
                </TabsContent>

                {/* Top Tracks Tab */}
                <TabsContent value="stats" className="space-y-6 mt-6">
                    <Card className="surface-card">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Music className="h-5 w-5 text-pink-400" />
                                Most Played Tracks
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {topTracks.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No tracks played yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {topTracks.map((track, i) => (
                                        <div key={track.id} className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                                            <span className="text-2xl font-bold text-gray-500 w-8">{i + 1}</span>
                                            {track.thumbnail && (
                                                <img src={track.thumbnail} alt="" className="w-12 h-12 rounded object-cover" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium truncate">{track.title}</p>
                                                <p className="text-gray-400 text-sm">{track.artist || 'Unknown artist'}</p>
                                            </div>
                                            <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">
                                                {track.playCount} plays
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Commands Tab */}
                <TabsContent value="commands" className="space-y-6 mt-6">
                    <Card className="surface-card">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Crown className="h-5 w-5 text-blue-400" />
                                Available Commands
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                    { cmd: '/play', desc: 'Play a song or playlist', icon: Play },
                                    { cmd: '/pause', desc: 'Pause playback', icon: Pause },
                                    { cmd: '/resume', desc: 'Resume playback', icon: Play },
                                    { cmd: '/skip', desc: 'Skip current track', icon: SkipForward },
                                    { cmd: '/stop', desc: 'Stop and clear queue', icon: Music },
                                    { cmd: '/queue', desc: 'View the queue', icon: List },
                                    { cmd: '/nowplaying', desc: 'Show current track', icon: Music },
                                    { cmd: '/volume', desc: 'Adjust volume', icon: Volume2 },
                                    { cmd: '/seek', desc: 'Jump to position', icon: Clock },
                                    { cmd: '/shuffle', desc: 'Shuffle the queue', icon: Shuffle },
                                    { cmd: '/loop', desc: 'Set loop mode', icon: Radio },
                                ].map(({ cmd, desc, icon: Icon }) => (
                                    <div key={cmd} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                                        <Icon className="h-5 w-5 text-blue-400 mt-0.5" />
                                        <div>
                                            <code className="text-sm text-white font-mono bg-blue-500/20 px-2 py-0.5 rounded">
                                                {cmd}
                                            </code>
                                            <p className="text-xs text-gray-400 mt-1">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Panel Tab */}
                <TabsContent value="panel" className="space-y-6 mt-6">
                    <PanelSender guildId={selectedGuildId || ''} type="music" />
                </TabsContent>
            </Tabs>
        </div>
    );
}
