import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { PricingModule } from '../../modules/studio/pricing.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('price')
    .setDescription('Calculate order price')
    .addStringOption((opt) =>
      opt
        .setName('tier')
        .setDescription('Pricing tier')
        .setRequired(false)
        .addChoices(
          { name: 'Basic - $10', value: 'Basic' },
          { name: 'Standard - $25', value: 'Standard' },
          { name: 'Premium - $50', value: 'Premium' }
        )
    )
    .addBooleanOption((opt) =>
      opt.setName('rush').setDescription('Add rush delivery (+$15)').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName('source').setDescription('Add source files (+$5)').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt
        .setName('commercial')
        .setDescription('Add commercial license (+$10)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const tier = interaction.options.getString('tier');

    // If no tier specified, show full price list
    if (!tier) {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎨 Studio Pricing')
        .setDescription(PricingModule.formatPriceList())
        .setFooter({ text: 'Use /price with options to calculate a custom quote' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Calculate price with addons
    const addons: string[] = [];
    if (interaction.options.getBoolean('rush')) addons.push('Rush (24h)');
    if (interaction.options.getBoolean('source')) addons.push('Source Files');
    if (interaction.options.getBoolean('commercial')) addons.push('Commercial License');

    const total = PricingModule.calculatePrice(tier, addons);
    const tierInfo = PricingModule.getTier(tier);

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('💰 Price Quote')
      .addFields(
        { name: 'Tier', value: `${tier} - $${tierInfo?.basePrice}`, inline: true },
        {
          name: 'Add-ons',
          value: addons.length > 0 ? addons.join(', ') : 'None',
          inline: true,
        },
        { name: 'Total', value: `**$${total}**`, inline: true }
      )
      .setFooter({ text: tierInfo?.description ?? '' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
});
