'use client';

import { CheckCircle, ArrowRight, X, Sparkles, Server, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface WelcomeModalProps {
    open: boolean;
    onComplete: () => void;
    onSkip: () => void;
}

const steps = [
    {
        icon: Server,
        title: 'Select a Server',
        description: 'Choose a server you manage from the sidebar',
    },
    {
        icon: Settings,
        title: 'Configure Features',
        description: 'Enable and customize bot features for your server',
    },
    {
        icon: CheckCircle,
        title: "You're Ready!",
        description: 'Your bot is now configured and ready to use',
    },
];

export function WelcomeModal({ open, onComplete, onSkip }: WelcomeModalProps) {
    return (
        <Dialog open={open}>
            <DialogContent className="sm:max-w-lg bg-black/95 border-white/10">
                <DialogHeader className="text-center">
                    <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <DialogTitle className="text-2xl">Welcome to SylaBot!</DialogTitle>
                    <DialogDescription className="text-white/60">
                        Let&apos;s get you set up in just a few steps
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {steps.map((step, index) => (
                        <div
                            key={step.title}
                            className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/10"
                        >
                            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                                <step.icon className="w-4 h-4 text-cyan-400" />
                            </div>
                            <div>
                                <p className="font-medium text-white">{step.title}</p>
                                <p className="text-sm text-white/60">{step.description}</p>
                            </div>
                            <span className="ml-auto text-sm text-white/40">{index + 1}/3</span>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 pt-4">
                    <Button variant="ghost" onClick={onSkip} className="flex-1">
                        Skip for now
                    </Button>
                    <Button
                        onClick={onComplete}
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500"
                    >
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
