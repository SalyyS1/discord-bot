'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ColorPicker } from '@/components/ui/color-picker';
import { Card } from '@/components/ui/card';
import { ImageIcon } from 'lucide-react';

interface EmbedData {
    title?: string;
    description?: string;
    color?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    footer?: string;
}

interface EmbedEditorProps {
    value: EmbedData;
    onChange: (value: EmbedData) => void;
}

export function EmbedEditor({ value, onChange }: EmbedEditorProps) {
    const update = (key: keyof EmbedData, val: string) => {
        onChange({ ...value, [key]: val });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Editor Column */}
            <div className="space-y-4">
                <div className="grid gap-2">
                    <Label className="text-gray-300">Color</Label>
                    <ColorPicker value={value.color || '#14b8a6'} onChange={(c) => update('color', c)} />
                </div>

                <div className="grid gap-2">
                    <Label className="text-gray-300">Title</Label>
                    <Input
                        value={value.title || ''}
                        onChange={(e) => update('title', e.target.value)}
                        placeholder="Giveaway Title"
                        className="bg-black/40 border-white/10 text-white placeholder:text-gray-500"
                    />
                </div>

                <div className="grid gap-2">
                    <Label className="text-gray-300">Description</Label>
                    <Textarea
                        value={value.description || ''}
                        onChange={(e) => update('description', e.target.value)}
                        placeholder="Describe your giveaway..."
                        className="bg-black/40 border-white/10 text-white placeholder:text-gray-500 min-h-[100px]"
                    />
                </div>

                <div className="grid gap-2">
                    <Label className="text-gray-300">Image URL (Big)</Label>
                    <div className="flex gap-2">
                        <Input
                            value={value.imageUrl || ''}
                            onChange={(e) => update('imageUrl', e.target.value)}
                            placeholder="https://..."
                            className="bg-black/40 border-white/10 text-white placeholder:text-gray-500"
                        />
                    </div>
                </div>
            </div>

            {/* Preview Column */}
            <div className="relative">
                <Label className="mb-2 block text-muted-foreground">Preview</Label>
                <div className="bg-[#313338] rounded-md p-4 min-h-[300px] border border-[#2B2D31]">
                    {/* Bot Profile Fake */}
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-8 rounded-full bg-aqua-500 flex items-center justify-center text-white text-xs font-bold">BOT</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-white font-medium hover:underline cursor-pointer">Antigravity</span>
                            <span className="bg-[#5865F2] text-[10px] text-white px-1 rounded-[3px] h-[15px] flex items-center">BOT</span>
                            <span className="text-[#949BA4] text-xs">Today at 9:41 PM</span>
                        </div>
                    </div>

                    {/* Embed Box */}
                    <div
                        className="bg-[#2B2D31] rounded-l-[4px] border-l-4 p-4 max-w-[400px]"
                        style={{ borderLeftColor: value.color || '#000000' }}
                    >
                        {value.title && <div className="text-white font-bold mb-2 break-words">{value.title}</div>}
                        {value.description && <div className="text-[#DBDEE1] text-sm whitespace-pre-wrap break-words">{value.description}</div>}

                        {value.imageUrl && (
                            <div className="mt-4 rounded-md overflow-hidden bg-black/20">
                                <img src={value.imageUrl} alt="Embed" className="max-w-full h-auto object-cover" />
                            </div>
                        )}

                        {value.footer && <div className="mt-2 text-[#949BA4] text-xs">{value.footer}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
