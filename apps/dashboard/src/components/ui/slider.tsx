'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
    value: number[];
    onValueChange: (value: number[]) => void;
    max?: number;
    step?: number;
    className?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ value, onValueChange, max = 100, step = 1, className }, ref) => {
        return (
            <input
                ref={ref}
                type="range"
                min={0}
                max={max}
                step={step}
                value={value[0]}
                onChange={(e) => onValueChange([parseInt(e.target.value)])}
                className={cn(
                    'w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer',
                    '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5',
                    '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r',
                    '[&::-webkit-slider-thumb]:from-pink-500 [&::-webkit-slider-thumb]:to-purple-500',
                    '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
                    '[&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab',
                    '[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5',
                    '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gradient-to-r',
                    '[&::-moz-range-thumb]:from-pink-500 [&::-moz-range-thumb]:to-purple-500',
                    '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white',
                    className
                )}
            />
        );
    }
);
Slider.displayName = 'Slider';

export { Slider };
