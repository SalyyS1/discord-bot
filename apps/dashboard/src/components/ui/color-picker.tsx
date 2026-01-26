'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Paintbrush } from 'lucide-react';

interface ColorPickerProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
}

const PRESET_COLORS = [
    '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
    '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
    '#ec4899', '#f43f5e'
];

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal bg-black/40 border-white/10 text-white hover:bg-black/50",
                        !value && "text-gray-400"
                    )}
                >
                    <div
                        className="h-4 w-4 rounded-full border border-white/20 mr-2"
                        style={{ backgroundColor: value || '#14b8a6' }}
                    />
                    <span className="text-white">{value || "Pick a color"}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 bg-gray-900 border-white/10 backdrop-blur-xl">
                <div className="grid grid-cols-6 gap-2 mb-4">
                    {PRESET_COLORS.map(color => (
                        <button
                            key={color}
                            className="h-6 w-6 rounded-full border border-white/10 hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            onClick={() => onChange(color)}
                        />
                    ))}
                </div>
                <div className="flex gap-2 items-center">
                    <Paintbrush className="h-4 w-4 text-gray-400" />
                    <Input
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="#14b8a6"
                        className="h-8 text-xs bg-black/40 border-white/10 text-white placeholder:text-gray-500"
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}
