interface PricingTier {
  name: string;
  basePrice: number;
  description: string;
}

interface Addon {
  name: string;
  price: number;
  description: string;
}

// Configurable pricing tiers
const PRICING_TIERS: PricingTier[] = [
  { name: 'Basic', basePrice: 10, description: 'Simple design, 1 revision' },
  { name: 'Standard', basePrice: 25, description: 'Detailed design, 3 revisions' },
  { name: 'Premium', basePrice: 50, description: 'Complex design, unlimited revisions' },
];

// Available addons
const ADDONS: Addon[] = [
  { name: 'Rush (24h)', price: 15, description: 'Priority delivery within 24 hours' },
  { name: 'Source Files', price: 5, description: 'PSD/AI source files included' },
  { name: 'Commercial License', price: 10, description: 'Full commercial usage rights' },
  { name: 'Extra Revision', price: 5, description: 'Additional revision round' },
];

/**
 * Studio pricing module
 */
export class PricingModule {
  /**
   * Get all pricing tiers
   */
  static getTiers(): PricingTier[] {
    return PRICING_TIERS;
  }

  /**
   * Get all addons
   */
  static getAddons(): Addon[] {
    return ADDONS;
  }

  /**
   * Find tier by name
   */
  static getTier(name: string): PricingTier | undefined {
    return PRICING_TIERS.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Calculate total price
   */
  static calculatePrice(tierName: string, addonNames: string[]): number {
    const tier = this.getTier(tierName);
    if (!tier) return 0;

    let total = tier.basePrice;

    for (const addonName of addonNames) {
      const addon = ADDONS.find(
        (a) => a.name.toLowerCase() === addonName.toLowerCase()
      );
      if (addon) {
        total += addon.price;
      }
    }

    return total;
  }

  /**
   * Format price list for display
   */
  static formatPriceList(): string {
    let output = '**Pricing Tiers:**\n';
    for (const tier of PRICING_TIERS) {
      output += `• **${tier.name}** - $${tier.basePrice} - ${tier.description}\n`;
    }

    output += '\n**Add-ons:**\n';
    for (const addon of ADDONS) {
      output += `• **${addon.name}** - +$${addon.price} - ${addon.description}\n`;
    }

    return output;
  }

  /**
   * Get tier choices for command options
   */
  static getTierChoices(): Array<{ name: string; value: string }> {
    return PRICING_TIERS.map((t) => ({ name: t.name, value: t.name }));
  }

  /**
   * Get addon choices for command options
   */
  static getAddonChoices(): Array<{ name: string; value: string }> {
    return ADDONS.map((a) => ({ name: `${a.name} (+$${a.price})`, value: a.name }));
  }
}
