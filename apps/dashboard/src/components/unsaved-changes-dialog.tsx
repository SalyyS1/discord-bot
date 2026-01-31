'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface UnsavedChangesDialogProps {
    open: boolean;
    onCancel: () => void;
    onDiscard: () => void;
    onSave?: () => void;
}

export function UnsavedChangesDialog({
    open,
    onCancel,
    onDiscard,
    onSave,
}: UnsavedChangesDialogProps) {
    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="bg-black/95 border-white/10">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Unsaved Changes</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/70">
                        You have unsaved changes. What would you like to do?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel onClick={onCancel} className="border-white/10 hover:bg-white/10">
                        Cancel
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={onDiscard}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        Discard Changes
                    </Button>
                    {onSave && (
                        <AlertDialogAction
                            onClick={onSave}
                            className="bg-cyan-600 hover:bg-cyan-700"
                        >
                            Save & Continue
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
