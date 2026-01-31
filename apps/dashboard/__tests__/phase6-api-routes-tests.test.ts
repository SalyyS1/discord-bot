/**
 * API Routes Integration Tests for Phase 6
 * Tests all user-facing API endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { prisma } from '@repo/database';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { GET as getGuilds } from '@/app/api/user/guilds/route';
import { GET as getSessions, DELETE as deleteSession } from '@/app/api/user/sessions/route';
import { GET as exportData, DELETE as deleteAccount } from '@/app/api/user/data/route';
import { GET as getPreferences, PUT as updatePreferences } from '@/app/api/user/notification-preferences/route';

describe('API Routes - /api/user/guilds', () => {
  const mockUser = {
    user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
  };

  beforeAll(() => {
    (auth as jest.Mock).mockResolvedValue(mockUser);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should return 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValueOnce(null);

    const response = await getGuilds();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return accessible guilds', async () => {
    const response = await getGuilds();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('guilds');
    expect(Array.isArray(data.guilds)).toBe(true);
    expect(data).toHaveProperty('total');
  });
});

describe('API Routes - /api/user/sessions', () => {
  const mockUser = {
    user: { id: 'test-user-id', name: 'Test User' },
    session: { id: 'current-session-id' },
  };

  beforeAll(() => {
    (auth as jest.Mock).mockResolvedValue(mockUser);
  });

  it('should list user sessions', async () => {
    const response = await getSessions();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('sessions');
    expect(data).toHaveProperty('current');
  });

  it('should require sessionId for deletion', async () => {
    const { req } = createMocks({
      method: 'DELETE',
      url: '/api/user/sessions',
    });

    const response = await deleteSession(req as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Session ID required');
  });

  it('should not allow revoking current session', async () => {
    const { req } = createMocks({
      method: 'DELETE',
      url: '/api/user/sessions?sessionId=current-session-id',
    });

    // Mock session exists
    jest.spyOn(prisma.session, 'findFirst').mockResolvedValueOnce({
      id: 'current-session-id',
      userId: 'test-user-id',
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: null,
      userAgent: null,
    });

    const response = await deleteSession(req as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cannot revoke current session');
  });
});

describe('API Routes - /api/user/data', () => {
  const mockUser = {
    user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
  };

  beforeAll(() => {
    (auth as jest.Mock).mockResolvedValue(mockUser);
  });

  it('should export user data as JSON', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: new Date(),
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      accounts: [],
      sessions: [],
    } as any);

    const response = await exportData();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('user');
    expect(data).toHaveProperty('accounts');
    expect(data).toHaveProperty('sessions');
    expect(data).toHaveProperty('exportDate');
  });

  it('should require confirmation for account deletion', async () => {
    const { req } = createMocks({
      method: 'DELETE',
      body: { confirmation: 'WRONG' },
    });

    const response = await deleteAccount(req as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid confirmation');
  });

  it('should delete account with correct confirmation', async () => {
    const { req } = createMocks({
      method: 'DELETE',
      body: { confirmation: 'DELETE_MY_ACCOUNT' },
    });

    jest.spyOn(prisma.user, 'delete').mockResolvedValueOnce({
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await deleteAccount(req as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe('API Routes - /api/user/notification-preferences', () => {
  const mockUser = {
    user: { id: 'test-user-id', name: 'Test User' },
  };

  beforeAll(() => {
    (auth as jest.Mock).mockResolvedValue(mockUser);
  });

  it('should get default preferences', async () => {
    const response = await getPreferences();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('preferences');
    expect(data.preferences).toHaveProperty('emailNotifications');
    expect(data.preferences).toHaveProperty('discordDMs');
  });

  it('should require valid notification data for update', async () => {
    const { req } = createMocks({
      method: 'PUT',
      body: {},
    });

    const response = await updatePreferences(req as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('should update preferences', async () => {
    const { req } = createMocks({
      method: 'PUT',
      body: {
        notifications: {
          emailNotifications: false,
          discordDMs: true,
        },
      },
    });

    const response = await updatePreferences(req as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe('Security - Data Isolation', () => {
  it('should not allow accessing other user guilds', async () => {
    const user1 = { user: { id: 'user-1' } };
    const user2 = { user: { id: 'user-2' } };

    (auth as jest.Mock).mockResolvedValueOnce(user1);
    const response1 = await getGuilds();
    const data1 = await response1.json();

    (auth as jest.Mock).mockResolvedValueOnce(user2);
    const response2 = await getGuilds();
    const data2 = await response2.json();

    // Guilds should be different for different users
    expect(data1.guilds).not.toEqual(data2.guilds);
  });

  it('should not allow revoking other user sessions', async () => {
    const user1 = { user: { id: 'user-1' } };

    (auth as jest.Mock).mockResolvedValueOnce(user1);

    // Try to delete session belonging to user-2
    jest.spyOn(prisma.session, 'findFirst').mockResolvedValueOnce(null);

    const { req } = createMocks({
      method: 'DELETE',
      url: '/api/user/sessions?sessionId=user2-session',
    });

    const response = await deleteSession(req as any);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });
});
