// src/services/sync.ts
// Supabase sync service for offline-first behavior

import { createClient } from '@supabase/supabase-js';
import type { Order, OrderItem, Product, SyncResult, UUID } from '../types';

export interface SyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  syncInterval: number; // milliseconds, e.g., 30000 for 30 seconds
}

export class SyncService {
  private supabase;
  private syncInterval: number;
  private isSyncing: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor(config: SyncConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    this.syncInterval = config.syncInterval;
  }

  /**
   * Start background sync loop
   * Syncs every `syncInterval` milliseconds
   */
  public startBackgroundSync(onSyncComplete?: (result: SyncResult) => void): void {
    if (this.syncTimer) {
      console.warn('Sync already started');
      return;
    }

    // Sync immediately on start
    this.syncNow(onSyncComplete);

    // Then sync periodically
    this.syncTimer = setInterval(() => {
      this.syncNow(onSyncComplete);
    }, this.syncInterval);
  }

  /**
   * Stop background sync
   */
  public stopBackgroundSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Manually trigger sync now
   */
  public async syncNow(onComplete?: (result: SyncResult) => void): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return {
        success: false,
        synced_count: 0,
        failed_count: 0,
        errors: [],
      };
    }

    this.isSyncing = true;
    const result = await this.performSync();
    this.isSyncing = false;

    if (onComplete) {
      onComplete(result);
    }

    return result;
  }

  /**
   * Main sync logic
   */
  private async performSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced_count: 0,
      failed_count: 0,
      errors: [],
    };

    try {
      // Check connection
      const isOnline = navigator.onLine;
      if (!isOnline) {
        console.log('Offline - sync deferred');
        return result;
      }

      // Get unsynced orders from local DB
      const unsyncedOrders = await this.getUnsyncedOrders();

      for (const order of unsyncedOrders) {
        try {
          await this.syncOrder(order);
          result.synced_count++;
        } catch (error) {
          result.failed_count++;
          result.success = false;
          result.errors.push({
            entity_id: order.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      result.success = false;
      console.error('Sync error:', error);
    }

    return result;
  }

  /**
   * Sync a single order to Supabase
   */
  private async syncOrder(order: Order): Promise<void> {
    const { data: existingOrder } = await this.supabase
      .from('orders')
      .select('id')
      .eq('id', order.id)
      .single();

    if (existingOrder) {
      // Update existing order
      const { error } = await this.supabase
        .from('orders')
        .update({
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          status: order.status,
          sync_status: 'synced',
          synced_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;
    } else {
      // Insert new order
      const { error } = await this.supabase
        .from('orders')
        .insert([
          {
            id: order.id,
            order_number: order.order_number,
            total_amount: order.total_amount,
            payment_method: order.payment_method,
            status: order.status,
            created_at: order.created_at,
            updated_at: order.updated_at,
            sync_status: 'synced',
            synced_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      // Sync order items
      const items = await this.getOrderItems(order.id);
      for (const item of items) {
        const { error: itemError } = await this.supabase
          .from('order_items')
          .insert([
            {
              id: item.id,
              order_id: item.order_id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              created_at: item.created_at,
            },
          ]);

        if (itemError) throw itemError;
      }
    }

    // Mark as synced in local DB
    await this.markOrderAsSynced(order.id);
  }

  /**
   * Pull products from Supabase (update local DB with new products)
   */
  public async syncProducts(): Promise<Product[]> {
    if (!navigator.onLine) {
      console.log('Offline - product sync deferred');
      return [];
    }

    try {
      const { data: products, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('deleted_at', null);

      if (error) throw error;

      // Store in local DB
      if (products) {
        for (const product of products) {
          await this.upsertLocalProduct(product);
        }
      }

      return products || [];
    } catch (error) {
      console.error('Error syncing products:', error);
      return [];
    }
  }

  /**
   * Push new products to Supabase (for admin use)
   */
  public async pushProduct(product: Product): Promise<void> {
    if (!navigator.onLine) {
      console.log('Offline - product push deferred');
      return;
    }

    const { error } = await this.supabase
      .from('products')
      .upsert([
        {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          sku: product.sku,
          is_available: product.is_available,
          created_at: product.created_at,
          updated_at: product.updated_at,
        },
      ]);

    if (error) throw error;
  }

  /**
   * Listen for real-time product updates from Supabase
   */
  public listenForProductUpdates(
    onUpdate: (product: Product) => void,
    onDelete: (productId: UUID) => void
  ): () => void {
    const subscription = this.supabase
      .channel('public:products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        payload => {
          if (payload.eventType === 'DELETE') {
            onDelete(payload.old.id);
          } else {
            onUpdate(payload.new as Product);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      this.supabase.removeChannel(subscription);
    };
  }

  // ============ Local DB Helpers ============
  // These would normally call Tauri commands

  private async getUnsyncedOrders(): Promise<Order[]> {
    // TODO: Call Tauri command: invoke('get_unsynced_orders')
    return [];
  }

  private async getOrderItems(order_id: UUID): Promise<OrderItem[]> {
    // TODO: Call Tauri command: invoke('get_order_items', { order_id })
    return [];
  }

  private async markOrderAsSynced(order_id: UUID): Promise<void> {
    // TODO: Call Tauri command: invoke('mark_order_synced', { order_id })
  }

  private async upsertLocalProduct(product: Product): Promise<void> {
    // TODO: Call Tauri command: invoke('upsert_product', { product })
  }
}

/**
 * Retry logic for failed syncs
 * Use exponential backoff to retry failed syncs
 */
export class RetryQueue {
  private queue: Array<{
    entityType: 'order' | 'product';
    entityId: UUID;
    action: 'create' | 'update' | 'delete';
    retryCount: number;
    lastError?: string;
  }> = [];

  private maxRetries = 3;
  private baseDelay = 1000; // 1 second

  public add(entityType: 'order' | 'product', entityId: UUID, action: 'create' | 'update' | 'delete'): void {
    this.queue.push({ entityType, entityId, action, retryCount: 0 });
  }

  public async processWithRetry(
    processor: (entityType: 'order' | 'product', entityId: UUID, action: 'create' | 'update' | 'delete') => Promise<void>
  ): Promise<void> {
    const failedItems: typeof this.queue = [];

    for (const item of this.queue) {
      let success = false;
      let lastError: string | undefined;

      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          await processor(item.entityType, item.entityId, item.action);
          success = true;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error';

          if (attempt < this.maxRetries) {
            // Exponential backoff
            const delay = this.baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!success) {
        failedItems.push({ ...item, retryCount: this.maxRetries + 1, lastError });
      }
    }

    // Keep only failed items for next retry
    this.queue = failedItems;
  }

  public getFailedCount(): number {
    return this.queue.length;
  }

  public clear(): void {
    this.queue = [];
  }
}
