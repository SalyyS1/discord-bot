'use client';

import { Maximize2, Minimize2, Grid } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type VoicePanelLayout = 'compact' | 'expanded' | 'minimal';

interface LayoutOption {
    value: VoicePanelLayout;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
    {
        value: 'compact',
        label: 'Compact',
        description: 'Essential controls only',
        icon: Minimize2,
    },
    {
        value: 'expanded',
        label: 'Expanded',
        description: 'All controls visible',
        icon: Maximize2,
    },
    {
        value: 'minimal',
        label: 'Minimal',
        description: 'Basic buttons only',
        icon: Grid,
    },
];

interface VoicePanelLayoutSelectorProps {
    value: VoicePanelLayout;
    onChange: (value: VoicePanelLayout) => void;
    className?: string;
}

export function VoicePanelLayoutSelector({
    value,
    onChange,
    className,
}: VoicePanelLayoutSelectorProps) {
    const selectedOption = LAYOUT_OPTIONS.find((opt) => opt.value === value) || LAYOUT_OPTIONS[0];
    const Icon = selectedOption.icon;

    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={className}>
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <SelectValue />
                </div>
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d26] border-white/10">
                {LAYOUT_OPTIONS.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                        <SelectItem
                            key={option.value}
                            value={option.value}
                            className="text-white hover:bg-white/10 cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <OptionIcon className="h-4 w-4 text-blue-400" />
                                <div className="flex flex-col">
                                    <span className="font-medium">{option.label}</span>
                                    <span className="text-xs text-gray-400">
                                        {option.description}
                                    </span>
                                </div>
                            </div>
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
    );
}
