import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  TextChannel,
  ButtonStyle,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { ButtonRolesModule } from '../../modules/utility/buttonRoles.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('buttonrole')
    .setDescription('Create self-assignable role buttons')
    .addStringOption((opt) =>
      opt.setName('title').setDescription('Embed title').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('description')
        .setDescription('Embed description')
        .setRequired(true)
    )
    .addRoleOption((opt) =>
      opt.setName('role1').setDescription('First role').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('emoji1').setDescription('Emoji for role 1')
    )
    .addRoleOption((opt) =>
      opt.setName('role2').setDescription('Second role')
    )
    .addStringOption((opt) =>
      opt.setName('emoji2').setDescription('Emoji for role 2')
    )
    .addRoleOption((opt) =>
      opt.setName('role3').setDescription('Third role')
    )
    .addStringOption((opt) =>
      opt.setName('emoji3').setDescription('Emoji for role 3')
    )
    .addRoleOption((opt) =>
      opt.setName('role4').setDescription('Fourth role')
    )
    .addStringOption((opt) =>
      opt.setName('emoji4').setDescription('Emoji for role 4')
    )
    .addRoleOption((opt) =>
      opt.setName('role5').setDescription('Fifth role')
    )
    .addStringOption((opt) =>
      opt.setName('emoji5').setDescription('Emoji for role 5')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  permissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  async execute(interaction) {
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);

    // Collect roles
    const roles: Array<{
      roleId: string;
      label: string;
      emoji?: string;
      style: ButtonStyle;
    }> = [];

    const botMember = interaction.guild!.members.me;

    for (let i = 1; i <= 5; i++) {
      const role = interaction.options.getRole(`role${i}`);
      const emoji = interaction.options.getString(`emoji${i}`);

      if (role) {
        // Check if bot can manage this role
        if (botMember && role.position >= botMember.roles.highest.position) {
          await interaction.reply({
            content: `❌ I cannot manage the role **${role.name}** (it is higher than my highest role).`,
            ephemeral: true,
          });
          return;
        }

        // Check if role is @everyone
        if (role.id === interaction.guild!.id) {
          await interaction.reply({
            content: '❌ Cannot use @everyone as a button role.',
            ephemeral: true,
          });
          return;
        }

        roles.push({
          roleId: role.id,
          label: role.name,
          emoji: emoji || undefined,
          style: ButtonStyle.Primary,
        });
      }
    }

    if (roles.length === 0) {
      await interaction.reply({
        content: '❌ At least one role is required.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await ButtonRolesModule.createButtonRoles(
        interaction.channel as TextChannel,
        title,
        description,
        roles
      );

      await interaction.editReply(
        `✅ Button roles created with ${roles.length} role(s).`
      );
    } catch {
      await interaction.editReply('❌ Failed to create button roles.');
    }
  },
});
