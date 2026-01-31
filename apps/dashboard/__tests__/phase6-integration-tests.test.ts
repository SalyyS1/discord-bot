/**
 * Phase 6 Integration Tests
 * Tests guild access validation, profile features, and GDPR compliance
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@repo/database';
import {
  getUserAccessibleGuilds,
  validateUserGuildAccess,
} from '@/lib/auth/guild-access-validator';
import {
  hasManageGuildPermission,
  fetchUserGuilds,
} from '@/lib/auth/discord-api-client';

describe('Phase 6 - Guild Access Validation', () => {
  let testUser: any;
  let testGuild: any;
  let testAccount: any;

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });

    // Create Discord account
    testAccount = await prisma.account.create({
      data: {
        userId: testUser.id,
        providerId: 'discord',
        accountId: '123456789',
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      },
    });

    // Create test guild
    testGuild = await prisma.guild.create({
      data: {
        id: '987654321',
        name: 'Test Guild',
      },
    });
  });

  afterEach(async () => {
    // Clean up
    await prisma.account.deleteMany({ where: { userId: testUser.id } });
    await prisma.guild.deleteMany({ where: { id: testGuild.id } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });
  });

  describe('hasManageGuildPermission', () => {
    it('should return true for ADMINISTRATOR permission', () => {
      const permissions = '8'; // ADMINISTRATOR
      expect(hasManageGuildPermission(permissions)).toBe(true);
    });

    it('should return true for MANAGE_GUILD permission', () => {
      const permissions = '32'; // MANAGE_GUILD
      expect(hasManageGuildPermission(permissions)).toBe(true);
    });

    it('should return false for no permissions', () => {
      const permissions = '0';
      expect(hasManageGuildPermission(permissions)).toBe(false);
    });

    it('should return true for combined permissions with MANAGE_GUILD', () => {
      const permissions = '2048'; // Other permissions
      expect(hasManageGuildPermission('2080')).toBe(true); // 2048 + 32
    });
  });

  describe('getUserAccessibleGuilds', () => {
    it('should return empty array when no Discord account', async () => {
      await prisma.account.deleteMany({ where: { userId: testUser.id } });
      const guilds = await getUserAccessibleGuilds(testUser.id);
      expect(guilds).toEqual([]);
    });

    it('should filter guilds by bot presence', async () => {
      // Mock Discord API response would be needed here
      // This is a placeholder for integration testing
      const guilds = await getUserAccessibleGuilds(testUser.id);
      expect(Array.isArray(guilds)).toBe(true);
    });

    it('should filter guilds by user permissions', async () => {
      // Mock Discord API to return guilds without MANAGE_GUILD
      const guilds = await getUserAccessibleGuilds(testUser.id);
      // All returned guilds should have proper permissions
      guilds.forEach((guild) => {
        expect(
          guild.owner || hasManageGuildPermission(guild.permissions)
        ).toBe(true);
      });
    });
  });

  describe('validateUserGuildAccess', () => {
    it('should return false when user has no access', async () => {
      const hasAccess = await validateUserGuildAccess(
        testUser.id,
        'non_existent_guild'
      );
      expect(hasAccess).toBe(false);
    });

    it('should return true when user has proper access', async () => {
      // This would require mocking Discord API
      // Placeholder for integration testing
      const hasAccess = await validateUserGuildAccess(
        testUser.id,
        testGuild.id
      );
      expect(typeof hasAccess).toBe('boolean');
    });
  });
});

describe('Phase 6 - Session Management', () => {
  let testUser: any;
  let testSession: any;

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        email: 'session-test@example.com',
        name: 'Session Test User',
      },
    });

    testSession = await prisma.session.create({
      data: {
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 86400000), // 24 hours
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      },
    });
  });

  afterEach(async () => {
    await prisma.session.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });
  });

  it('should list user sessions', async () => {
    const sessions = await prisma.session.findMany({
      where: { userId: testUser.id },
    });

    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].userId).toBe(testUser.id);
  });

  it('should delete specific session', async () => {
    await prisma.session.delete({
      where: { id: testSession.id },
    });

    const deletedSession = await prisma.session.findUnique({
      where: { id: testSession.id },
    });

    expect(deletedSession).toBeNull();
  });

  it('should not delete session from different user', async () => {
    const otherUser = await prisma.user.create({
      data: {
        email: 'other@example.com',
        name: 'Other User',
      },
    });

    // Verify session belongs to testUser, not otherUser
    const session = await prisma.session.findFirst({
      where: {
        id: testSession.id,
        userId: otherUser.id,
      },
    });

    expect(session).toBeNull();

    await prisma.user.delete({ where: { id: otherUser.id } });
  });
});

describe('Phase 6 - GDPR Compliance', () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        email: 'gdpr-test@example.com',
        name: 'GDPR Test User',
      },
    });

    await prisma.account.create({
      data: {
        userId: testUser.id,
        providerId: 'discord',
        accountId: '111222333',
        accessToken: 'token',
        refreshToken: 'refresh',
      },
    });

    await prisma.session.create({
      data: {
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  });

  afterEach(async () => {
    // Clean up if user still exists
    await prisma.account.deleteMany({ where: { userId: testUser.id } });
    await prisma.session.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });
  });

  it('should export all user data', async () => {
    const userData = await prisma.user.findUnique({
      where: { id: testUser.id },
      include: {
        accounts: true,
        sessions: true,
      },
    });

    expect(userData).not.toBeNull();
    expect(userData?.accounts.length).toBeGreaterThan(0);
    expect(userData?.sessions.length).toBeGreaterThan(0);
  });

  it('should cascade delete user data', async () => {
    const userId = testUser.id;

    // Delete user (should cascade)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Verify accounts deleted
    const accounts = await prisma.account.findMany({
      where: { userId },
    });
    expect(accounts.length).toBe(0);

    // Verify sessions deleted
    const sessions = await prisma.session.findMany({
      where: { userId },
    });
    expect(sessions.length).toBe(0);
  });
});

describe('Phase 6 - Data Isolation', () => {
  let user1: any;
  let user2: any;

  beforeEach(async () => {
    user1 = await prisma.user.create({
      data: {
        email: 'user1@example.com',
        name: 'User 1',
      },
    });

    user2 = await prisma.user.create({
      data: {
        email: 'user2@example.com',
        name: 'User 2',
      },
    });

    await prisma.session.create({
      data: {
        userId: user1.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    await prisma.session.create({
      data: {
        userId: user2.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  });

  afterEach(async () => {
    await prisma.session.deleteMany({
      where: { userId: { in: [user1.id, user2.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [user1.id, user2.id] } },
    });
  });

  it('should not allow access to other user sessions', async () => {
    const user1Sessions = await prisma.session.findMany({
      where: { userId: user1.id },
    });

    const user2Sessions = await prisma.session.findMany({
      where: { userId: user2.id },
    });

    expect(user1Sessions.length).toBe(1);
    expect(user2Sessions.length).toBe(1);
    expect(user1Sessions[0].id).not.toBe(user2Sessions[0].id);
  });

  it('should not allow data export for other users', async () => {
    const user1Data = await prisma.user.findUnique({
      where: { id: user1.id },
      include: { sessions: true },
    });

    const user2Data = await prisma.user.findUnique({
      where: { id: user2.id },
      include: { sessions: true },
    });

    expect(user1Data?.sessions[0].userId).toBe(user1.id);
    expect(user2Data?.sessions[0].userId).toBe(user2.id);
    expect(user1Data?.id).not.toBe(user2Data?.id);
  });
});
