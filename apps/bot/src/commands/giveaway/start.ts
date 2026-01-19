import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { GiveawayModule } from '../../modules/giveaway/index.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway management commands')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption((opt) =>
          opt.setName('prize').setDescription('The prize').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('duration')
            .setDescription('Duration (e.g., 1h, 1d, 1w)')
            .setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('winners')
            .setDescription('Number of winners (default: 1)')
            .setMinValue(1)
            .setMaxValue(20)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Giveaway channel (default: current)')
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption((opt) =>
          opt.setName('secret_prize').setDescription('Secret prize (DM only)')
        )
        .addRoleOption((opt) =>
          opt.setName('required_role').setDescription('Required role to enter')
        )
        .addIntegerOption((opt) =>
          opt
            .setName('min_invites')
            .setDescription('Minimum invites required')
            .setMinValue(0)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('min_level')
            .setDescription('Minimum level required')
            .setMinValue(0)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('End a giveaway early')
        .addStringOption((opt) =>
          opt
            .setName('message_id')
            .setDescription('Giveaway message ID')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Reroll winner(s)')
        .addStringOption((opt) =>
          opt
            .setName('message_id')
            .setDescription('Giveaway message ID')
            .setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('count')
            .setDescription('Number of new winners (default: 1)')
            .setMinValue(1)
            .setMaxValue(10)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List active giveaways')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'start':
        await handleStart(interaction);
        break;
      case 'end':
        await handleEnd(interaction);
        break;
      case 'reroll':
        await handleReroll(interaction);
        break;
      case 'list':
        await handleList(interaction);
        break;
    }
  },
});

async function handleStart(interaction: any): Promise<void> {
  const prize = interaction.options.getString('prize', true);
  const durationStr = interaction.options.getString('duration', true);
  const winners = interaction.options.getInteger('winners') ?? 1;
  const channel = (interaction.options.getChannel('channel') ??
    interaction.channel) as TextChannel;
  const secretPrize = interaction.options.getString('secret_prize');
  const requiredRole = interaction.options.getRole('required_role');
  const minInvites = interaction.options.getInteger('min_invites') ?? 0;
  const minLevel = interaction.options.getInteger('min_level') ?? 0;

  // Parse duration
  const duration = parseDuration(durationStr);
  if (!duration) {
    await interaction.reply({
      content: '❌ Invalid duration format. Use: 1s, 1m, 1h, 1d, 1w',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const giveawayId = await GiveawayModule.create(interaction.guild!, {
    channelId: channel.id,
    hostId: interaction.user.id,
    prize,
    prizeSecret: secretPrize ?? undefined,
    winnerCount: winners,
    duration,
    requiredRoleIds: requiredRole ? [requiredRole.id] : [],
    requiredInvites: minInvites,
    requiredLevel: minLevel,
  });

  if (giveawayId) {
    await interaction.editReply(
      `✅ Giveaway created in <#${channel.id}>!\n` +
        `• Prize: **${prize}**\n` +
        `• Winners: ${winners}\n` +
        `• Duration: ${durationStr}`
    );
  } else {
    await interaction.editReply('❌ Failed to create giveaway.');
  }
}

async function handleEnd(interaction: any): Promise<void> {
  const messageId = interaction.options.getString('message_id', true);

  await interaction.deferReply({ ephemeral: true });

  const winners = await GiveawayModule.forceEnd(messageId);

  if (winners.length > 0) {
    await interaction.editReply(
      `✅ Giveaway ended! ${winners.length} winner(s) selected.`
    );
  } else {
    await interaction.editReply(
      '❌ Giveaway not found or no eligible entries.'
    );
  }
}

async function handleReroll(interaction: any): Promise<void> {
  const messageId = interaction.options.getString('message_id', true);
  const count = interaction.options.getInteger('count') ?? 1;

  await interaction.deferReply({ ephemeral: true });

  const newWinners = await GiveawayModule.reroll(messageId, count);

  if (newWinners.length > 0) {
    await interaction.editReply(
      `✅ Rerolled! New winner(s): ${newWinners.map((id) => `<@${id}>`).join(', ')}`
    );
  } else {
    await interaction.editReply('❌ Failed to reroll. No eligible entries remaining.');
  }
}

async function handleList(interaction: any): Promise<void> {
  const giveaways = await GiveawayModule.listActive(interaction.guild!.id);

  if (giveaways.length === 0) {
    await interaction.reply({
      content: '📭 No active giveaways.',
      ephemeral: true,
    });
    return;
  }

  const list = giveaways
    .map(
      (g, i) =>
        `${i + 1}. **${g.prize}** - Ends <t:${Math.floor(g.endsAt.getTime() / 1000)}:R>\n` +
        `   Channel: <#${g.channelId}> | [Jump](https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId})`
    )
    .join('\n\n');

  await interaction.reply({
    content: `🎉 **Active Giveaways (${giveaways.length})**\n\n${list}`,
    ephemeral: true,
  });
}

function parseDuration(str: string): number | null {
  const match = str.match(/^(\d+)(s|m|h|d|w)$/i);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}
