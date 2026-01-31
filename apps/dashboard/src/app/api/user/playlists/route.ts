import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

const createPlaylistSchema = z.object({
    guildId: z.string(),
    name: z.string().min(1).max(100),
    tracks: z.array(z.object({
        title: z.string(),
        url: z.string().url(),
        duration: z.number().optional(),
        thumbnail: z.string().url().optional(),
        artist: z.string().optional(),
    })).max(500),
    isPublic: z.boolean().default(false),
});

const updatePlaylistSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    tracks: z.array(z.object({
        title: z.string(),
        url: z.string().url(),
        duration: z.number().optional(),
        thumbnail: z.string().url().optional(),
        artist: z.string().optional(),
    })).max(500).optional(),
    isPublic: z.boolean().optional(),
});

/**
 * GET - List user's playlists for a guild
 */
export async function GET(request: NextRequest) {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
        return ApiResponse.unauthorized();
    }

    try {
        const { searchParams } = new URL(request.url);
        const guildId = searchParams.get('guildId');

        if (!guildId) {
            return ApiResponse.badRequest('Guild ID is required');
        }

        const playlists = await prisma.savedPlaylist.findMany({
            where: {
                guildId,
                createdBy: session.user.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return ApiResponse.success(playlists);
    } catch (error) {
        logger.error(`Error fetching playlists: ${error}`);
        return ApiResponse.serverError();
    }
}

/**
 * POST - Create a new playlist
 */
export async function POST(request: NextRequest) {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
        return ApiResponse.unauthorized();
    }

    try {
        const body = await request.json();
        const validated = createPlaylistSchema.parse(body);

        // Check playlist limit (100 per user per guild)
        const count = await prisma.savedPlaylist.count({
            where: {
                guildId: validated.guildId,
                createdBy: session.user.id,
            },
        });

        if (count >= 100) {
            return ApiResponse.badRequest('You have reached the maximum of 100 playlists per server');
        }

        // Check if playlist name already exists for this user in this guild
        const existing = await prisma.savedPlaylist.findUnique({
            where: {
                guildId_name: {
                    guildId: validated.guildId,
                    name: validated.name,
                },
            },
        });

        if (existing && existing.createdBy === session.user.id) {
            return ApiResponse.badRequest('A playlist with this name already exists');
        }

        const playlist = await prisma.savedPlaylist.create({
            data: {
                guildId: validated.guildId,
                name: validated.name,
                tracks: validated.tracks,
                isPublic: validated.isPublic,
                createdBy: session.user.id,
            },
        });

        return ApiResponse.success(playlist);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest(error.errors.map(e => e.message).join(', '));
        }
        logger.error(`Error creating playlist: ${error}`);
        return ApiResponse.serverError();
    }
}

/**
 * PUT - Update a playlist
 */
export async function PUT(request: NextRequest) {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
        return ApiResponse.unauthorized();
    }

    try {
        const { searchParams } = new URL(request.url);
        const playlistId = searchParams.get('id');

        if (!playlistId) {
            return ApiResponse.badRequest('Playlist ID is required');
        }

        const body = await request.json();
        const validated = updatePlaylistSchema.parse(body);

        // Check ownership
        const playlist = await prisma.savedPlaylist.findUnique({
            where: { id: playlistId },
        });

        if (!playlist) {
            return ApiResponse.notFound('Playlist not found');
        }

        if (playlist.createdBy !== session.user.id) {
            return ApiResponse.forbidden('You do not have permission to edit this playlist');
        }

        const updated = await prisma.savedPlaylist.update({
            where: { id: playlistId },
            data: validated,
        });

        return ApiResponse.success(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest(error.errors.map(e => e.message).join(', '));
        }
        logger.error(`Error updating playlist: ${error}`);
        return ApiResponse.serverError();
    }
}

/**
 * DELETE - Delete a playlist
 */
export async function DELETE(request: NextRequest) {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
        return ApiResponse.unauthorized();
    }

    try {
        const { searchParams } = new URL(request.url);
        const playlistId = searchParams.get('id');

        if (!playlistId) {
            return ApiResponse.badRequest('Playlist ID is required');
        }

        // Check ownership
        const playlist = await prisma.savedPlaylist.findUnique({
            where: { id: playlistId },
        });

        if (!playlist) {
            return ApiResponse.notFound('Playlist not found');
        }

        if (playlist.createdBy !== session.user.id) {
            return ApiResponse.forbidden('You do not have permission to delete this playlist');
        }

        await prisma.savedPlaylist.delete({
            where: { id: playlistId },
        });

        return ApiResponse.success({ message: 'Playlist deleted successfully' });
    } catch (error) {
        logger.error(`Error deleting playlist: ${error}`);
        return ApiResponse.serverError();
    }
}
