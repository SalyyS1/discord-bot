import { Events, EmbedBuilder, GuildMember } from 'discord.js';
import { Event } from '../structures/Event.js';
import { LoggingService } from '../services/logging.js';
import { WelcomeModule } from '../modules/welcome/index.js';
import { AutoRoleModule } from '../modules/autorole/index.js';
import { prisma } from '../lib/prisma.js';

export default new Event({
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    // Ensure guild exists in database
    await prisma.guild.upsert({
      where: { id: member.guild.id },
      create: { id: member.guild.id, name: member.guild.name },
      update: { name: member.guild.name },
    });

    // Ensure guild settings exist
    await prisma.guildSettings.upsert({
      where: { guildId: member.guild.id },
      create: { guildId: member.guild.id },
      update: {},
    });

    // Send welcome message
    await WelcomeModule.sendWelcome(member);

    // Assign auto-roles (checks for verification requirement)
    await AutoRoleModule.assignRoles(member);

    // Logging
    const accountAge = Date.now() - member.user.createdTimestamp;
    const daysOld = Math.floor(accountAge / (1000 * 60 * 60 * 24));

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('👋 Member Joined')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'User', value: `${member.user.tag}`, inline: true },
        { name: 'ID', value: member.id, inline: true },
        { name: 'Account Age', value: `${daysOld} days`, inline: true },
        {
          name: 'Member Count',
          value: `${member.guild.memberCount}`,
          inline: true,
        }
      )
      .setTimestamp();

    // Flag new accounts
    if (daysOld < 7) {
      embed.addFields({ name: '⚠️ Warning', value: 'New account (<7 days old)' });
    }

    await LoggingService.sendLog(member.guild, embed);
  },
});
