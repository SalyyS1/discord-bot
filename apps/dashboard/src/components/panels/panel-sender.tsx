'use client';

import { useState } from 'react';
import { Loader2, Send, Palette, MessageSquare, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChannelSelector } from '@/components/selectors/channel-selector';
import { toast } from 'sonner';

interface PanelSenderProps {
    guildId: string;
    type: 'voice' | 'music';
}

const PRESET_COLORS = [
    { value: '#5865f2', label: 'Discord Blue' },
    { value: '#57f287', label: 'Green' },
    { value: '#fee75c', label: 'Yellow' },
    { value: '#eb459e', label: 'Pink' },
    { value: '#ed4245', label: 'Red' },
    { value: '#9b59b6', label: 'Purple' },
    { value: '#3498db', label: 'Blue' },
    { value: '#1abc9c', label: 'Teal' },
];

const DEFAULT_VOICE_PANEL = {
    title: '🎙️ Voice Channel Control',
    description: `Use the buttons below to control your temporary voice channel.

**Requirements:**
• You must be in a temp voice channel
• You must be the channel owner

**Available Actions:**
🔒 **Lock/Unlock** - Restrict who can join
🙈 **Hide/Show** - Toggle channel visibility
👥 **Set Limit** - Change user limit
✏️ **Rename** - Change channel name`,
};

const DEFAULT_MUSIC_PANEL = {
    title: '🎵 Music Player Control',
    description: `Control the music player using buttons or commands.

**Quick Commands:**
\`/play <song>\` - Play a song or playlist
\`/queue\` - View the current queue
\`/nowplaying\` - Show current track

**Supported Sources:**
• YouTube (videos & playlists)
• Spotify (tracks & playlists)
• SoundCloud`,
};

export function PanelSender({ guildId, type }: PanelSenderProps) {
    const [sending, setSending] = useState(false);
    const [channelId, setChannelId] = useState('');
    const defaults = type === 'voice' ? DEFAULT_VOICE_PANEL : DEFAULT_MUSIC_PANEL;
    const [title, setTitle] = useState(defaults.title);
    const [description, setDescription] = useState(defaults.description);
    const [color, setColor] = useState(type === 'voice' ? '#5865f2' : '#eb459e');

    const handleSend = async () => {
        if (!channelId) {
            toast.error('Please select a channel');
            return;
        }

        setSending(true);
        try {
            const res = await fetch(`/api/guilds/${guildId}/panels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId,
                    type,
                    title,
                    description,
                    color,
                }),
            });

            if (res.ok) {
                toast.success(`${type === 'voice' ? 'Voice' : 'Music'} panel sent!`);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to send panel');
            }
        } catch {
            toast.error('Failed to send panel');
        } finally {
            setSending(false);
        }
    };

    const handleReset = () => {
        setTitle(defaults.title);
        setDescription(defaults.description);
        setColor(type === 'voice' ? '#5865f2' : '#eb459e');
    };

    return (
        <div className="grid lg:grid-cols-2 gap-6">
            {/* Editor */}
            <Card className="surface-card overflow-hidden">
                <CardHeader className={`bg-gradient-to-r ${type === 'voice' ? 'from-blue-500/10' : 'from-pink-500/10'} to-transparent border-b border-white/5 pb-4`}>
                    <div className="flex items-center gap-3">
                        <MessageSquare className={`w-5 h-5 ${type === 'voice' ? 'text-blue-400' : 'text-pink-400'}`} />
                        <div>
                            <CardTitle className="text-white">Customize Panel</CardTitle>
                            <CardDescription className="text-gray-400">Edit the panel message before sending</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-gray-300">Target Channel</Label>
                        <ChannelSelector
                            guildId={guildId}
                            value={channelId}
                            onChange={setChannelId}
                            placeholder="Select a text channel..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-300">Title</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-[#1a1d26] border-white/10 text-white"
                            placeholder="Panel title..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-300">Description</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-[#1a1d26] border-white/10 text-white min-h-[200px] font-mono text-sm"
                            placeholder="Panel description (supports markdown)..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-300 flex items-center gap-2">
                            <Palette className="w-4 h-4" /> Embed Color
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => setColor(preset.value)}
                                    className={`w-8 h-8 rounded-lg border-2 transition-all ${color === preset.value
                                            ? 'border-white scale-110'
                                            : 'border-transparent hover:border-white/50'
                                        }`}
                                    style={{ backgroundColor: preset.value }}
                                    title={preset.label}
                                />
                            ))}
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent"
                                title="Custom color"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={handleSend}
                            disabled={sending || !channelId}
                            className={`flex-1 ${type === 'voice'
                                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                                    : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600'
                                } text-white font-bold`}
                        >
                            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Send className="mr-2 h-4 w-4" />
                            Send Panel
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="border-white/20 text-gray-300 hover:bg-white/5"
                        >
                            Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Preview */}
            <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-500/10 to-transparent border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <Hash className="w-5 h-5 text-gray-400" />
                        <div>
                            <CardTitle className="text-white">Preview</CardTitle>
                            <CardDescription className="text-gray-400">How it will look in Discord</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="bg-[#313338] rounded-lg p-4">
                        {/* Discord embed preview */}
                        <div
                            className="rounded-md overflow-hidden"
                            style={{ borderLeft: `4px solid ${color}` }}
                        >
                            <div className="bg-[#2b2d31] p-4">
                                <h3 className="text-white font-semibold mb-2">{title || 'Panel Title'}</h3>
                                <div className="text-[#dbdee1] text-sm whitespace-pre-wrap">
                                    {description.split('\n').map((line, i) => {
                                        if (line.startsWith('**') && line.endsWith('**')) {
                                            return <p key={i} className="font-semibold text-white">{line.slice(2, -2)}</p>;
                                        }
                                        if (line.startsWith('• ')) {
                                            return <p key={i} className="ml-2">{line}</p>;
                                        }
                                        if (line.startsWith('`') && line.endsWith('`')) {
                                            return <code key={i} className="bg-[#1e1f22] px-1 rounded text-[#e3e5e8]">{line.slice(1, -1)}</code>;
                                        }
                                        return <p key={i}>{line}</p>;
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Button preview */}
                        <div className="mt-3 flex flex-wrap gap-2">
                            {type === 'voice' ? (
                                <>
                                    <div className="px-3 py-1 bg-[#4f545c] rounded text-white text-sm">🔒 Lock/Unlock</div>
                                    <div className="px-3 py-1 bg-[#4f545c] rounded text-white text-sm">🙈 Hide/Show</div>
                                    <div className="px-3 py-1 bg-[#5865f2] rounded text-white text-sm">👥 Set Limit</div>
                                    <div className="px-3 py-1 bg-[#5865f2] rounded text-white text-sm">✏️ Rename</div>
                                </>
                            ) : (
                                <>
                                    <div className="px-3 py-1 bg-[#4f545c] rounded text-white text-sm">⏮️</div>
                                    <div className="px-3 py-1 bg-[#5865f2] rounded text-white text-sm">⏸️</div>
                                    <div className="px-3 py-1 bg-[#4f545c] rounded text-white text-sm">⏭️</div>
                                    <div className="px-3 py-1 bg-[#ed4245] rounded text-white text-sm">⏹️</div>
                                    <div className="px-3 py-1 bg-[#4f545c] rounded text-white text-sm">🔀</div>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
