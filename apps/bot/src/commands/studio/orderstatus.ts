import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { OrdersModule } from '../../modules/studio/orders.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('orderstatus')
    .setDescription('Check your order status')
    .addStringOption((opt) =>
      opt
        .setName('order-id')
        .setDescription('Order ID (leave empty to see all your orders)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const orderId = interaction.options.getString('order-id');

    if (orderId) {
      // Get specific order
      const order = await OrdersModule.getOrder(orderId);

      if (!order) {
        await interaction.reply({
          content: '❌ Order not found. Please check the order ID.',
          ephemeral: true,
        });
        return;
      }

      // Verify ownership
      if (order.customerId !== interaction.user.id) {
        await interaction.reply({
          content: '❌ This order does not belong to you.',
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(OrdersModule.getStatusColor(order.status))
        .setTitle(`📦 Order ${order.id}`)
        .addFields(
          { name: 'Status', value: OrdersModule.formatStatus(order.status), inline: true },
          { name: 'Tier', value: order.tier, inline: true },
          { name: 'Total', value: `$${order.total}`, inline: true },
          {
            name: 'Add-ons',
            value: order.addons.length > 0 ? order.addons.join(', ') : 'None',
            inline: false,
          },
          {
            name: 'Created',
            value: `<t:${Math.floor(order.createdAt.getTime() / 1000)}:R>`,
            inline: true,
          }
        )
        .setTimestamp();

      if (order.estimatedCompletion) {
        embed.addFields({
          name: 'Estimated Completion',
          value: `<t:${Math.floor(order.estimatedCompletion.getTime() / 1000)}:R>`,
          inline: true,
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      // Get all user orders
      const orders = await OrdersModule.getOrdersByCustomer(interaction.user.id);

      if (orders.length === 0) {
        await interaction.reply({
          content: '📭 You have no orders. Create a ticket to place an order!',
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📦 Your Orders')
        .setDescription(`Found ${orders.length} order(s)`)
        .setTimestamp();

      for (const order of orders.slice(0, 10)) {
        embed.addFields({
          name: `${order.id}`,
          value:
            `${OrdersModule.formatStatus(order.status)}\n` +
            `${order.tier} - $${order.total}`,
          inline: true,
        });
      }

      if (orders.length > 10) {
        embed.setFooter({ text: `Showing 10 of ${orders.length} orders` });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
});
