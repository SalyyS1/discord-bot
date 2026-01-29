/**
 * Order status type
 */
type OrderStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';

/**
 * Order interface
 */
interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  tier: string;
  addons: string[];
  total: number;
  createdAt: Date;
  estimatedCompletion?: Date;
  notes?: string;
}

import { TTLMap } from '../../lib/ttl-map-with-auto-cleanup.js';

// Mock order storage (in production, this would be an external API/database)
// Using TTLMap to prevent unbounded memory growth
const orders = new TTLMap<string, Order>({
  defaultTtlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  cleanupIntervalMs: 60 * 60 * 1000, // Cleanup every hour
});

/**
 * Studio orders module
 * In production, this would integrate with an external order management system
 */
export class OrdersModule {
  /**
   * Get order by ID
   */
  static async getOrder(orderId: string): Promise<Order | null> {
    // In production: fetch from external API
    return orders.get(orderId) ?? null;
  }

  /**
   * Get orders by customer Discord ID
   */
  static async getOrdersByCustomer(discordId: string): Promise<Order[]> {
    // In production: fetch from external API
    return Array.from(orders.values()).filter((o) => o.customerId === discordId);
  }

  /**
   * Format order status for display
   */
  static formatStatus(status: OrderStatus): string {
    const statusEmojis: Record<OrderStatus, string> = {
      pending: '⏳',
      in_progress: '🎨',
      review: '👀',
      completed: '✅',
      cancelled: '❌',
    };

    const statusLabels: Record<OrderStatus, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      review: 'Under Review',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };

    return `${statusEmojis[status]} ${statusLabels[status]}`;
  }

  /**
   * Get status color for embeds
   */
  static getStatusColor(status: OrderStatus): number {
    const colors: Record<OrderStatus, number> = {
      pending: 0xffa500,
      in_progress: 0x5865f2,
      review: 0xffff00,
      completed: 0x00ff00,
      cancelled: 0xff0000,
    };
    return colors[status];
  }

  /**
   * Create mock order for testing
   */
  static createMockOrder(
    customerId: string,
    tier: string,
    addons: string[],
    total: number
  ): Order {
    const order: Order = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      customerId,
      status: 'pending',
      tier,
      addons,
      total,
      createdAt: new Date(),
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
    orders.set(order.id, order);
    return order;
  }
}
