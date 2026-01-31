/**
 * /volume command - Adjust playback volume
 */

import { SlashCommandBuilder, GuildMember, EmbedBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { Command } from '../../structures/Command.js';
import { hasDJRole } from '../../modules/music/index.js';

export default new Command({
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Adjust the music volume')
        .addIntegerOption((opt) =>
            opt
                .setName('level')
                .setDescription('Volume level (0-100)')
                .setMinValue(0)
                .setMaxValue(100)
                .setRequired(true)
        ),

    async execute(interaction) {
        const member = interaction.member as GuildMember;
        const level = interaction.options.getInteger('level', true);

        if (!await hasDJRole(interaction.guildId!, member)) {
            await interaction.reply({ content: '❌ You need the DJ role.', ephemeral: true });
            return;
        }

        const queue = useQueue(interaction.guildId!);
        if (!queue) {
            await interaction.reply({ content: '❌ No music queue found.', ephemeral: true });
            return;
        }

        const oldVolume = queue.node.volume;
        queue.node.setVolume(level);

        // Volume bar visualization
        const filled = Math.round(level / 10);
        const empty = 10 - filled;
        const volumeBar = '🔊 ' + '█'.repeat(filled) + '░'.repeat(empty);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(level > 80 ? 0xed4245 : level > 50 ? 0xfee75c : 0x57f287)
                    .setDescription(`${volumeBar}\n\nVolume: **${oldVolume}%** → **${level}%**`)
            ],
        });
    },
});
