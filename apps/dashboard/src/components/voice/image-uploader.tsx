'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
    value?: string;
    onChange: (url: string | null) => void;
    maxSizeMB?: number;
    acceptedFormats?: string[];
}

const DEFAULT_MAX_SIZE_MB = 2;
const DEFAULT_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];

export function ImageUploader({
    value,
    onChange,
    maxSizeMB = DEFAULT_MAX_SIZE_MB,
    acceptedFormats = DEFAULT_FORMATS,
}: ImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validateFile = (file: File): string | null => {
        // Check file type
        if (!acceptedFormats.includes(file.type)) {
            return `Invalid file type. Accepted: ${acceptedFormats.join(', ')}`;
        }

        // Check file size
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
            return `File too large. Max size: ${maxSizeMB}MB`;
        }

        return null;
    };

    const uploadFile = async (file: File): Promise<string> => {
        // Create FormData for upload
        const formData = new FormData();
        formData.append('file', file);

        // Upload to your storage service (e.g., /api/upload)
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        return data.url;
    };

    const handleFileSelect = useCallback(
        async (file: File) => {
            setError(null);

            // Validate file
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                return;
            }

            try {
                setIsUploading(true);

                // For now, create a local preview URL
                // In production, upload to storage service
                const previewUrl = URL.createObjectURL(file);

                // TODO: Implement actual upload to storage service
                // const uploadedUrl = await uploadFile(file);
                // onChange(uploadedUrl);

                onChange(previewUrl);
            } catch (err) {
                setError('Upload failed. Please try again.');
                console.error('Upload error:', err);
            } finally {
                setIsUploading(false);
            }
        },
        [onChange]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        },
        [handleFileSelect]
    );

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                handleFileSelect(files[0]);
            }
        },
        [handleFileSelect]
    );

    const handleRemove = useCallback(() => {
        onChange(null);
        setError(null);
    }, [onChange]);

    if (value) {
        return (
            <div className="relative group">
                <div className="relative rounded-lg overflow-hidden border-2 border-white/10 bg-white/5">
                    <img
                        src={value}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleRemove}
                            className="gap-2"
                        >
                            <X className="h-4 w-4" />
                            Remove
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                    'relative rounded-lg border-2 border-dashed transition-all cursor-pointer',
                    isDragging
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10',
                    isUploading && 'opacity-50 cursor-not-allowed'
                )}
            >
                <input
                    type="file"
                    accept={acceptedFormats.join(',')}
                    onChange={handleFileInputChange}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    {isUploading ? (
                        <>
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
                            <p className="text-sm text-gray-400">Uploading...</p>
                        </>
                    ) : (
                        <>
                            <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-sm text-white font-medium mb-1">
                                Drop image here or click to upload
                            </p>
                            <p className="text-xs text-gray-500">
                                PNG, JPG or GIF (max {maxSizeMB}MB)
                            </p>
                        </>
                    )}
                </div>
            </div>
            {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                    <X className="h-4 w-4" />
                    {error}
                </div>
            )}
        </div>
    );
}
