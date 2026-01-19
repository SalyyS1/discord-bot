import {
  EmbedBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  ChatInputCommandInteraction,
  ColorResolvable,
} from 'discord.js';

/**
 * Interactive embed builder with modal input
 */
export class EmbedBuilderModule {
  /**
   * Show embed builder modal
   */
  static async showModal(interaction: ChatInputCommandInteraction): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId('embed_builder')
      .setTitle('Create Embed');

    const titleInput = new TextInputBuilder()
      .setCustomId('embed_title')
      .setLabel('Title')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(256)
      .setRequired(false)
      .setPlaceholder('Enter embed title');

    const descInput = new TextInputBuilder()
      .setCustomId('embed_description')
      .setLabel('Description')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(4000)
      .setRequired(true)
      .setPlaceholder('Enter embed description');

    const colorInput = new TextInputBuilder()
      .setCustomId('embed_color')
      .setLabel('Color (hex, e.g., #5865f2)')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(7)
      .setRequired(false)
      .setPlaceholder('#5865f2');

    const footerInput = new TextInputBuilder()
      .setCustomId('embed_footer')
      .setLabel('Footer')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(2048)
      .setRequired(false)
      .setPlaceholder('Footer text');

    const imageInput = new TextInputBuilder()
      .setCustomId('embed_image')
      .setLabel('Image URL')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('https://example.com/image.png');

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(colorInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(footerInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput)
    );

    await interaction.showModal(modal);
  }

  /**
   * Process modal submission and create embed
   */
  static async processModal(interaction: ModalSubmitInteraction): Promise<EmbedBuilder> {
    const title = interaction.fields.getTextInputValue('embed_title');
    const description = interaction.fields.getTextInputValue('embed_description');
    const color = interaction.fields.getTextInputValue('embed_color');
    const footer = interaction.fields.getTextInputValue('embed_footer');
    const image = interaction.fields.getTextInputValue('embed_image');

    const embed = new EmbedBuilder()
      .setDescription(description)
      .setTimestamp();

    if (title) embed.setTitle(title);

    // Validate and set color
    if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
      embed.setColor(color as ColorResolvable);
    } else {
      embed.setColor(0x5865f2);
    }

    if (footer) embed.setFooter({ text: footer });

    // Validate and set image URL
    if (image && isValidUrl(image)) {
      embed.setImage(image);
    }

    return embed;
  }
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
