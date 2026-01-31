import { Redis } from 'ioredis';
import { redis as mainRedis } from './redis.js';
import { client } from './client.js';
import { logger } from '../utils/logger.js';
import {
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';

let subscriber: Redis | null = null;

// Track recently processed commands to prevent duplicates
const processedCommands = new Set<string>();
const DEDUP_WINDOW_MS = 5000; // 5 seconds

interface DashboardCommand {
  type: string;
  guildId: string;
  channelId: string;
  timestamp: number;
  [key: string]: unknown;
}

interface TicketPanelCommand extends DashboardCommand {
  type: 'ticket_panel';
  embed: {
    title: string;
    description: string;
    color: string;
    imageUrl: string | null;
  };
}

interface TicketCategoryData {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  pingRoleIds: string[];
  formEnabled: boolean;
  claimEnabled: boolean;
}

interface TicketPanelV2Command extends DashboardCommand {
  type: 'ticket_panel_v2';
  panelId: string;
  embed: {
    title: string;
    description: string;
    color: string;
    imageUrl?: string;
    thumbnail?: string;
    footer?: string;
  };
  componentType: 'BUTTONS' | 'SELECT';
  buttonStyle: 'PRIMARY' | 'SECONDARY' | 'SUCCESS' | 'DANGER';
  selectPlaceholder?: string;
  categories: TicketCategoryData[];
}

/**
 * Handle ticket panel command from dashboard (legacy)
 */
async function handleTicketPanel(data: TicketPanelCommand): Promise<void> {
  const { guildId, channelId, embed } = data;

  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      logger.warn(`[DashboardCmd] Guild ${guildId} not found`);
      return;
    }

    const channel = await guild.channels.fetch(channelId) as TextChannel;
    if (!channel || !channel.isTextBased()) {
      logger.warn(`[DashboardCmd] Channel ${channelId} not found or not text-based`);
      return;
    }

    // Create the embed
    const panelEmbed = new EmbedBuilder()
      .setTitle(embed.title)
      .setDescription(embed.description)
      .setColor(parseInt(embed.color.replace('#', ''), 16))
      .setFooter({ text: 'Click the button below to create a ticket' })
      .setTimestamp();

    if (embed.imageUrl) {
      panelEmbed.setImage(embed.imageUrl);
    }

    // Create the button
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_create')
        .setLabel('🎫 Open Ticket')
        .setStyle(ButtonStyle.Primary)
    );

    // Send the panel
    await channel.send({
      embeds: [panelEmbed],
      components: [row],
    });

    logger.info(`[DashboardCmd] Sent ticket panel to ${channel.name} in ${guild.name}`);
  } catch (error) {
    logger.error('[DashboardCmd] Failed to send ticket panel:', error);
  }
}

/**
 * Handle ticket panel v2 command from dashboard (multi-category with SELECT or BUTTONS)
 */
async function handleTicketPanelV2(data: TicketPanelV2Command): Promise<void> {
  const { guildId, channelId, embed, componentType, buttonStyle, selectPlaceholder, categories } = data;

  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      logger.warn(`[DashboardCmd] Guild ${guildId} not found`);
      return;
    }

    const channel = await guild.channels.fetch(channelId) as TextChannel;
    if (!channel || !channel.isTextBased()) {
      logger.warn(`[DashboardCmd] Channel ${channelId} not found or not text-based`);
      return;
    }

    // Create the embed
    const panelEmbed = new EmbedBuilder()
      .setTitle(embed.title)
      .setDescription(embed.description)
      .setColor(parseInt(embed.color.replace('#', ''), 16))
      .setTimestamp();

    if (embed.imageUrl) {
      panelEmbed.setImage(embed.imageUrl);
    }

    if (embed.thumbnail) {
      panelEmbed.setThumbnail(embed.thumbnail);
    }

    if (embed.footer) {
      panelEmbed.setFooter({ text: embed.footer });
    }

    // Create components based on componentType
    const rows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

    if (componentType === 'SELECT') {
      // Create select menu
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder(selectPlaceholder || 'Select a category...')
        .setMinValues(1)
        .setMaxValues(1);

      // Add options for each category
      const options = categories.map(cat => {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(cat.name)
          .setValue(cat.id);

        if (cat.description) {
          option.setDescription(cat.description.slice(0, 100)); // Discord limit
        }

        if (cat.emoji) {
          option.setEmoji(cat.emoji);
        }

        return option;
      });

      selectMenu.addOptions(options);

      const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
      rows.push(selectRow);
    } else {
      // Create buttons
      const styleMap: Record<string, ButtonStyle> = {
        PRIMARY: ButtonStyle.Primary,
        SECONDARY: ButtonStyle.Secondary,
        SUCCESS: ButtonStyle.Success,
        DANGER: ButtonStyle.Danger,
      };

      const buttons = categories.map(cat => {
        const button = new ButtonBuilder()
          .setCustomId(`ticket_category:${cat.id}`)
          .setLabel(cat.name)
          .setStyle(styleMap[buttonStyle] || ButtonStyle.Primary);

        if (cat.emoji) {
          button.setEmoji(cat.emoji);
        }

        return button;
      });

      // Split buttons into rows (max 5 per row)
      for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          buttons.slice(i, i + 5)
        );
        rows.push(row);
      }
    }

    // Send the panel
    const message = await channel.send({
      embeds: [panelEmbed],
      components: rows,
    });

    logger.info(`[DashboardCmd] Sent ticket panel v2 (${componentType}) to ${channel.name} in ${guild.name} with ${categories.length} categories`);
    logger.info(`[DashboardCmd] Panel message ID: ${message.id}`);
  } catch (error) {
    logger.error('[DashboardCmd] Failed to send ticket panel v2:', error);
  }
}

/**
 * Handle sending a voice control panel
 */
async function handleVoicePanel(data: DashboardCommand): Promise<void> {
  const { guildId, channelId, customEmbed } = data as DashboardCommand & { customEmbed?: { title?: string; description?: string; color?: string } };

  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      logger.warn(`[DashboardCmd] Guild ${guildId} not found`);
      return;
    }

    const channel = await guild.channels.fetch(channelId) as TextChannel;
    if (!channel || !channel.isTextBased()) {
      logger.warn(`[DashboardCmd] Channel ${channelId} not found or not text-based`);
      return;
    }

    // Create the embed
    const color = customEmbed?.color ? parseInt(customEmbed.color.replace('#', ''), 16) : 0x5865f2;
    const panelEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(customEmbed?.title || '🎙️ TempVoice Interface')
      .setDescription(customEmbed?.description || `This **interface** can be used to manage temporary voice channels.
More options are available with **/voice** commands.`)
      .setFooter({ text: '⚙️ Press the buttons below to use the interface' });

    // Row 1: NAME, LIMIT, PRIVACY, WAITING R., THREAD (icon only)
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('voice_rename').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voice_limit').setEmoji('👥').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voice_lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voice_hide').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voice_bitrate').setEmoji('#️⃣').setStyle(ButtonStyle.Secondary)
    );

    // Row 2: TRUST, UNTRUST, INVITE, KICK, REGION (icon only)
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('voice_permit').setEmoji('✅').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voice_reject').setEmoji('❌').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voice_invite').setEmoji('📩').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voice_kick').setEmoji('👢').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voice_region').setEmoji('🌐').setStyle(ButtonStyle.Secondary)
    );

    // Row 3: BLOCK, UNBLOCK, CLAIM, TRANSFER, DELETE (icon only)
    const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('voice_block').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voice_unblock').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voice_claim').setEmoji('👑').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voice_transfer').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voice_delete').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [panelEmbed], components: [row1, row2, row3] });
    logger.info(`[DashboardCmd] Sent voice panel to ${channel.name} in ${guild.name}`);
  } catch (error) {
    logger.error('[DashboardCmd] Failed to send voice panel:', error);
  }
}

/**
 * Handle sending a music control panel
 */
async function handleMusicPanel(data: DashboardCommand): Promise<void> {
  const { guildId, channelId, customEmbed } = data as DashboardCommand & { customEmbed?: { title?: string; description?: string; color?: string } };

  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      logger.warn(`[DashboardCmd] Guild ${guildId} not found`);
      return;
    }

    const channel = await guild.channels.fetch(channelId) as TextChannel;
    if (!channel || !channel.isTextBased()) {
      logger.warn(`[DashboardCmd] Channel ${channelId} not found or not text-based`);
      return;
    }

    // Create the embed
    const color = customEmbed?.color ? parseInt(customEmbed.color.replace('#', ''), 16) : 0xeb459e;
    const panelEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(customEmbed?.title || '🎵 Music Player Control')
      .setDescription(customEmbed?.description || `Control the music player using buttons or commands.

**Quick Commands:**
\`/play <song>\` - Play a song or playlist
\`/queue\` - View the current queue
\`/nowplaying\` - Show current track

**Supported Sources:**
• YouTube (videos & playlists)
• Spotify (tracks & playlists)
• SoundCloud`)
      .setFooter({ text: 'Join a voice channel and use /play to start!' });

    // Row 1: Playback controls
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('music_previous').setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_pause').setEmoji('⏸️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('music_shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary)
    );

    // Row 2: Volume and extras
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('music_voldown').setLabel('-10').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_volup').setLabel('+10').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_loop').setEmoji('🔁').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_queue').setLabel('Queue').setEmoji('📋').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('music_lyrics').setLabel('Lyrics').setEmoji('📝').setStyle(ButtonStyle.Secondary)
    );

    // Row 3: Advanced controls
    const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('music_bassboost').setLabel('Bass').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_nightcore').setLabel('Nightcore').setEmoji('🌙').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_vaporwave').setLabel('Vapor').setEmoji('🌊').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_save').setLabel('Save').setEmoji('💾').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('music_autoplay').setLabel('Autoplay').setEmoji('📻').setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [panelEmbed], components: [row1, row2, row3] });
    logger.info(`[DashboardCmd] Sent music panel to ${channel.name} in ${guild.name}`);
  } catch (error) {
    logger.error('[DashboardCmd] Failed to send music panel:', error);
  }
}

/**
 * Handle incoming dashboard command
 */
async function handleCommand(message: string): Promise<void> {
  try {
    const data = JSON.parse(message) as DashboardCommand;

    // Create a unique key for deduplication
    const dedupKey = `${data.type}:${data.guildId}:${data.channelId}:${data.timestamp}`;

    // Check if we've already processed this command
    if (processedCommands.has(dedupKey)) {
      logger.warn(`[DashboardCmd] Duplicate command ignored: ${data.type}`);
      return;
    }

    // Mark as processed
    processedCommands.add(dedupKey);

    // Clean up after dedup window
    setTimeout(() => {
      processedCommands.delete(dedupKey);
    }, DEDUP_WINDOW_MS);

    logger.info(`[DashboardCmd] Received command: ${data.type}`);

    switch (data.type) {
      case 'ticket_panel':
        await handleTicketPanel(data as TicketPanelCommand);
        break;
      case 'ticket_panel_v2':
        await handleTicketPanelV2(data as TicketPanelV2Command);
        break;
      case 'SEND_PANEL':
        const panelType = (data as DashboardCommand & { panelType: string }).panelType;
        if (panelType === 'voice') {
          await handleVoicePanel(data);
        } else if (panelType === 'music') {
          await handleMusicPanel(data);
        } else {
          logger.warn(`[DashboardCmd] Unknown panel type: ${panelType}`);
        }
        break;
      default:
        logger.warn(`[DashboardCmd] Unknown command type: ${data.type}`);
    }
  } catch (error) {
    logger.error('[DashboardCmd] Failed to handle command:', error);
  }
}

/**
 * Initialize the dashboard commands subscriber
 */
export async function initDashboardCommands(): Promise<void> {
  // Prevent duplicate initialization
  if (subscriber) {
    logger.warn('[DashboardCmd] Subscriber already initialized, skipping');
    return;
  }

  try {
    // Create a duplicate connection for subscribing
    subscriber = mainRedis.duplicate();

    subscriber.on('message', (channel, message) => {
      if (channel === 'dashboard:commands') {
        handleCommand(message);
      }
    });

    await subscriber.subscribe('dashboard:commands');

    logger.info('[DashboardCmd] Dashboard commands subscriber initialized');
  } catch (error) {
    logger.error('[DashboardCmd] Failed to initialize:', error);
  }
}

/**
 * Cleanup the subscriber
 */
export async function stopDashboardCommands(): Promise<void> {
  if (subscriber) {
    await subscriber.unsubscribe('dashboard:commands');
    subscriber.disconnect();
    subscriber = null;
    logger.info('[DashboardCmd] Dashboard commands subscriber stopped');
  }
}
