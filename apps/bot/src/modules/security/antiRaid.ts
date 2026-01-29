import {
  AuditLogEvent,
  Client,
  Guild,
  GuildAuditLogsEntry,
  GuildChannel,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
  EmbedBuilder,
  Role
} from 'discord.js';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { logger } from '../../utils/logger.js';
import { TTLMap } from '../../lib/ttl-map-with-auto-cleanup.js';

interface RaidAction {
  type: 'CHANNEL_DELETE' | 'ROLE_DELETE' | 'MEMBER_KICK' | 'MEMBER_BAN' | 'CHANNEL_CREATE';
  executorId: string;
  timestamp: number;
}

interface AntiRaidConfig {
  enabled: boolean;
  // Thresholds
  channelDeleteThreshold: number;    // Max channel deletes before action
  roleDeleteThreshold: number;        // Max role deletes before action
  memberKickThreshold: number;        // Max kicks before action
  memberBanThreshold: number;         // Max bans before action
  massChannelCreateThreshold: number; // Mass channel spam
  timeWindow: number;                 // Seconds to track actions
  // Actions
  action: 'REMOVE_PERMISSIONS' | 'KICK' | 'BAN' | 'QUARANTINE';
  quarantineRoleId?: string;
  // Recovery
  autoRecoverChannels: boolean;
  autoRecoverRoles: boolean;
  // Notifications
  notifyChannelId?: string;
  notifyOwnerId: boolean;
  // Whitelist
  whitelistRoleIds: string[];
  whitelistUserIds: string[];
}

const DEFAULT_CONFIG: AntiRaidConfig = {
  enabled: false,
  channelDeleteThreshold: 3,
  roleDeleteThreshold: 3,
  memberKickThreshold: 5,
  memberBanThreshold: 3,
  massChannelCreateThreshold: 5,
  timeWindow: 60, // 1 minute
  action: 'REMOVE_PERMISSIONS',
  autoRecoverChannels: true,
  autoRecoverRoles: true,
  notifyOwnerId: true,
  whitelistRoleIds: [],
  whitelistUserIds: [],
};

// In-memory cache for deleted items (for recovery) with TTL to prevent memory leaks
const deletedChannelsCache = new TTLMap<string, Map<string, { name: string; type: number; parentId?: string; position: number }>>({
  defaultTtlMs: 60 * 60 * 1000, // 1 hour
  cleanupIntervalMs: 10 * 60 * 1000,
});

const deletedRolesCache = new TTLMap<string, Map<string, { name: string; color: number; permissions: bigint; position: number }>>({
  defaultTtlMs: 60 * 60 * 1000, // 1 hour
  cleanupIntervalMs: 10 * 60 * 1000,
});

/**
 * Anti-Raid Protection Module
 * Protects against mass channel/role deletion, mass kicks/bans
 */
export class AntiRaidModule {
  private static client: Client;

  /**
   * Initialize the module
   */
  static init(client: Client): void {
    this.client = client;
    logger.info('[AntiRaid] Module initialized');
  }

  /**
   * Get config from database or return defaults
   */
  private static async getConfig(guildId: string): Promise<AntiRaidConfig> {
    try {
      const settings = await prisma.guildSettings.findUnique({
        where: { guildId },
        select: {
          // We'll add these fields to the schema
        },
      });

      // For now, return defaults - config can be extended later
      return DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Track action in Redis
   */
  private static async trackAction(guildId: string, action: RaidAction): Promise<number> {
    const key = `antiraid:${guildId}:${action.executorId}:${action.type}`;
    const now = Date.now();
    const windowMs = DEFAULT_CONFIG.timeWindow * 1000;

    try {
      // Add action to sorted set
      await redis.zadd(key, now.toString(), `${now}`);
      
      // Remove old entries outside window
      await redis.zremrangebyscore(key, '0', (now - windowMs).toString());
      
      // Set expiry
      await redis.expire(key, DEFAULT_CONFIG.timeWindow * 2);
      
      // Get count
      const count = await redis.zcard(key);
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Check if user is whitelisted
   */
  private static async isWhitelisted(guild: Guild, userId: string): Promise<boolean> {
    // Owner is always whitelisted
    if (guild.ownerId === userId) return true;

    const config = await this.getConfig(guild.id);
    
    // Check user whitelist
    if (config.whitelistUserIds.includes(userId)) return true;

    // Check role whitelist
    try {
      const member = await guild.members.fetch(userId);
      const hasWhitelistedRole = member.roles.cache.some(r => config.whitelistRoleIds.includes(r.id));
      if (hasWhitelistedRole) return true;
    } catch {
      // Member not found
    }

    return false;
  }

  /**
   * Handle channel delete event
   */
  static async onChannelDelete(channel: GuildChannel): Promise<void> {
    const guild = channel.guild;
    const config = await this.getConfig(guild.id);
    if (!config.enabled) return;

    // Cache channel info for potential recovery
    if (!deletedChannelsCache.has(guild.id)) {
      deletedChannelsCache.set(guild.id, new Map());
    }
    deletedChannelsCache.get(guild.id)!.set(channel.id, {
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId || undefined,
      position: channel.position,
    });

    // Get audit log to find who deleted
    try {
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 1,
      });

      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;

      // Check if executor is bot itself
      if (entry.executor.id === this.client.user?.id) return;

      // Check whitelist
      if (await this.isWhitelisted(guild, entry.executor.id)) return;

      // Track action
      const count = await this.trackAction(guild.id, {
        type: 'CHANNEL_DELETE',
        executorId: entry.executor.id,
        timestamp: Date.now(),
      });

      logger.warn(`[AntiRaid] ${guild.name}: ${entry.executor.tag} deleted channel ${channel.name} (${count}/${config.channelDeleteThreshold})`);

      // Check threshold
      if (count >= config.channelDeleteThreshold) {
        await this.takeAction(guild, entry.executor.id, 'CHANNEL_DELETE', count);
      }
    } catch (error) {
      logger.error('[AntiRaid] Failed to check channel delete:', error);
    }
  }

  /**
   * Handle role delete event
   */
  static async onRoleDelete(role: Role): Promise<void> {
    const guild = role.guild;
    const config = await this.getConfig(guild.id);
    if (!config.enabled) return;

    // Cache role info for potential recovery
    if (!deletedRolesCache.has(guild.id)) {
      deletedRolesCache.set(guild.id, new Map());
    }
    deletedRolesCache.get(guild.id)!.set(role.id, {
      name: role.name,
      color: role.color,
      permissions: role.permissions.bitfield,
      position: role.position,
    });

    try {
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.RoleDelete,
        limit: 1,
      });

      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;

      if (entry.executor.id === this.client.user?.id) return;
      if (await this.isWhitelisted(guild, entry.executor.id)) return;

      const count = await this.trackAction(guild.id, {
        type: 'ROLE_DELETE',
        executorId: entry.executor.id,
        timestamp: Date.now(),
      });

      logger.warn(`[AntiRaid] ${guild.name}: ${entry.executor.tag} deleted role ${role.name} (${count}/${config.roleDeleteThreshold})`);

      if (count >= config.roleDeleteThreshold) {
        await this.takeAction(guild, entry.executor.id, 'ROLE_DELETE', count);
      }
    } catch (error) {
      logger.error('[AntiRaid] Failed to check role delete:', error);
    }
  }

  /**
   * Handle member kick event
   */
  static async onMemberKick(guild: Guild, userId: string): Promise<void> {
    const config = await this.getConfig(guild.id);
    if (!config.enabled) return;

    try {
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.MemberKick,
        limit: 1,
      });

      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;

      if (entry.executor.id === this.client.user?.id) return;
      if (await this.isWhitelisted(guild, entry.executor.id)) return;

      const count = await this.trackAction(guild.id, {
        type: 'MEMBER_KICK',
        executorId: entry.executor.id,
        timestamp: Date.now(),
      });

      logger.warn(`[AntiRaid] ${guild.name}: ${entry.executor.tag} kicked member (${count}/${config.memberKickThreshold})`);

      if (count >= config.memberKickThreshold) {
        await this.takeAction(guild, entry.executor.id, 'MEMBER_KICK', count);
      }
    } catch (error) {
      logger.error('[AntiRaid] Failed to check member kick:', error);
    }
  }

  /**
   * Handle member ban event
   */
  static async onMemberBan(guild: Guild, userId: string): Promise<void> {
    const config = await this.getConfig(guild.id);
    if (!config.enabled) return;

    try {
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanAdd,
        limit: 1,
      });

      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;

      if (entry.executor.id === this.client.user?.id) return;
      if (await this.isWhitelisted(guild, entry.executor.id)) return;

      const count = await this.trackAction(guild.id, {
        type: 'MEMBER_BAN',
        executorId: entry.executor.id,
        timestamp: Date.now(),
      });

      logger.warn(`[AntiRaid] ${guild.name}: ${entry.executor.tag} banned member (${count}/${config.memberBanThreshold})`);

      if (count >= config.memberBanThreshold) {
        await this.takeAction(guild, entry.executor.id, 'MEMBER_BAN', count);
      }
    } catch (error) {
      logger.error('[AntiRaid] Failed to check member ban:', error);
    }
  }

  /**
   * Take action against raider
   */
  private static async takeAction(
    guild: Guild, 
    executorId: string, 
    actionType: string, 
    count: number
  ): Promise<void> {
    const config = await this.getConfig(guild.id);
    
    logger.error(`[AntiRaid] RAID DETECTED in ${guild.name}! User ${executorId} performed ${count} ${actionType} actions`);

    try {
      const member = await guild.members.fetch(executorId);
      const botMember = guild.members.me;

      if (!botMember) return;

      // Check if bot can act on this member
      if (member.roles.highest.position >= botMember.roles.highest.position) {
        logger.warn('[AntiRaid] Cannot act on member with higher/equal role');
        await this.notifyOwner(guild, executorId, actionType, count, 'Cannot act - member has higher role');
        return;
      }

      switch (config.action) {
        case 'REMOVE_PERMISSIONS':
          // Remove all dangerous permissions from member's roles
          for (const role of member.roles.cache.values()) {
            if (role.id === guild.id) continue; // Skip @everyone
            if (role.managed) continue; // Skip bot roles
            
            const dangerousPerms = [
              PermissionFlagsBits.Administrator,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManageRoles,
              PermissionFlagsBits.ManageGuild,
              PermissionFlagsBits.KickMembers,
              PermissionFlagsBits.BanMembers,
            ];

            const hasDangerous = dangerousPerms.some(p => role.permissions.has(p));
            if (hasDangerous) {
              try {
                await member.roles.remove(role, `[AntiRaid] Raid protection - ${actionType}`);
                logger.info(`[AntiRaid] Removed role ${role.name} from ${member.user.tag}`);
              } catch {
                // Can't remove role
              }
            }
          }
          break;

        case 'KICK':
          await member.kick(`[AntiRaid] Raid protection - ${count} ${actionType} actions detected`);
          logger.info(`[AntiRaid] Kicked ${member.user.tag} for raiding`);
          break;

        case 'BAN':
          await member.ban({ 
            reason: `[AntiRaid] Raid protection - ${count} ${actionType} actions detected`,
            deleteMessageSeconds: 0,
          });
          logger.info(`[AntiRaid] Banned ${member.user.tag} for raiding`);
          break;

        case 'QUARANTINE':
          if (config.quarantineRoleId) {
            // Remove all roles and add quarantine role
            await member.roles.set([config.quarantineRoleId], `[AntiRaid] Quarantined for raiding`);
            logger.info(`[AntiRaid] Quarantined ${member.user.tag}`);
          }
          break;
      }

      // Notify
      await this.notifyOwner(guild, executorId, actionType, count, config.action);

      // Auto-recover if enabled
      if (config.autoRecoverChannels && actionType === 'CHANNEL_DELETE') {
        await this.recoverChannels(guild);
      }
      if (config.autoRecoverRoles && actionType === 'ROLE_DELETE') {
        await this.recoverRoles(guild);
      }

    } catch (error) {
      logger.error('[AntiRaid] Failed to take action:', error);
    }
  }

  /**
   * Notify server owner about raid
   */
  private static async notifyOwner(
    guild: Guild, 
    executorId: string, 
    actionType: string, 
    count: number,
    actionTaken: string
  ): Promise<void> {
    const config = await this.getConfig(guild.id);

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🚨 RAID ALERT')
      .setDescription(`Anti-Raid protection has been triggered!`)
      .addFields(
        { name: 'Server', value: guild.name, inline: true },
        { name: 'Raider', value: `<@${executorId}>`, inline: true },
        { name: 'Action Type', value: actionType.replace('_', ' '), inline: true },
        { name: 'Count', value: count.toString(), inline: true },
        { name: 'Action Taken', value: actionTaken, inline: true },
        { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      )
      .setTimestamp();

    // Notify in channel
    if (config.notifyChannelId) {
      try {
        const channel = await guild.channels.fetch(config.notifyChannelId) as TextChannel;
        if (channel && 'send' in channel) {
          await channel.send({ embeds: [embed] });
        }
      } catch {
        // Channel not found
      }
    }

    // DM owner
    if (config.notifyOwnerId) {
      try {
        const owner = await guild.fetchOwner();
        await owner.send({ 
          content: `⚠️ **Raid detected in ${guild.name}!**`,
          embeds: [embed] 
        });
      } catch {
        // Can't DM owner
      }
    }
  }

  /**
   * Attempt to recover deleted channels
   */
  private static async recoverChannels(guild: Guild): Promise<void> {
    const cached = deletedChannelsCache.get(guild.id);
    if (!cached || cached.size === 0) return;

    logger.info(`[AntiRaid] Attempting to recover ${cached.size} deleted channels...`);

    for (const [_id, channelData] of cached) {
      try {
        await guild.channels.create({
          name: channelData.name,
          type: channelData.type as any,
          parent: channelData.parentId,
          position: channelData.position,
          reason: '[AntiRaid] Channel recovery',
        });
        logger.info(`[AntiRaid] Recovered channel: ${channelData.name}`);
      } catch (error) {
        logger.error(`[AntiRaid] Failed to recover channel ${channelData.name}:`, error);
      }
    }

    // Clear cache
    cached.clear();
  }

  /**
   * Attempt to recover deleted roles
   */
  private static async recoverRoles(guild: Guild): Promise<void> {
    const cached = deletedRolesCache.get(guild.id);
    if (!cached || cached.size === 0) return;

    logger.info(`[AntiRaid] Attempting to recover ${cached.size} deleted roles...`);

    for (const [_id, roleData] of cached) {
      try {
        await guild.roles.create({
          name: roleData.name,
          color: roleData.color,
          permissions: roleData.permissions,
          reason: '[AntiRaid] Role recovery',
        });
        logger.info(`[AntiRaid] Recovered role: ${roleData.name}`);
      } catch (error) {
        logger.error(`[AntiRaid] Failed to recover role ${roleData.name}:`, error);
      }
    }

    // Clear cache
    cached.clear();
  }

  /**
   * Manual lockdown - lock all channels
   */
  static async lockdown(guild: Guild, reason?: string): Promise<number> {
    let locked = 0;
    const everyone = guild.roles.everyone;

    for (const channel of guild.channels.cache.values()) {
      if (!('permissionOverwrites' in channel)) continue;

      try {
        await channel.permissionOverwrites.edit(everyone, {
          SendMessages: false,
          AddReactions: false,
          Connect: false,
        }, { reason: reason || '[AntiRaid] Server lockdown' });
        locked++;
      } catch {
        // Skip
      }
    }

    logger.info(`[AntiRaid] Lockdown: Locked ${locked} channels in ${guild.name}`);
    return locked;
  }

  /**
   * Unlock all channels
   */
  static async unlock(guild: Guild, reason?: string): Promise<number> {
    let unlocked = 0;
    const everyone = guild.roles.everyone;

    for (const channel of guild.channels.cache.values()) {
      if (!('permissionOverwrites' in channel)) continue;

      try {
        await channel.permissionOverwrites.edit(everyone, {
          SendMessages: null,
          AddReactions: null,
          Connect: null,
        }, { reason: reason || '[AntiRaid] Server unlock' });
        unlocked++;
      } catch {
        // Skip
      }
    }

    logger.info(`[AntiRaid] Unlock: Unlocked ${unlocked} channels in ${guild.name}`);
    return unlocked;
  }
}
