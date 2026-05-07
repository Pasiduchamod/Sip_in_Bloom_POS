// src/App.tsx
// Main application component

import React, { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BillingScreen } from './components/BillingScreen';
import { SyncService } from './services/sync';
import { BrowserPrinter, MockPrinter } from './services/printer';
import type { Product, CartItem, Order, OrderWithItems, SyncResult } from './types';
import { generateId, getCurrentTimestamp, getTodayDate } from './services/db';

// Configuration - would normally come from environment variables
const SYNC_CONFIG = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  syncInterval: parseInt(import.meta.env.VITE_SYNC_INTERVAL || '30000', 10),
};

const SHOP_NAME = 'Slip in Bloom';

export const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<{ online: boolean; syncing: boolean; lastSync?: string }>({
    online: navigator.onLine,
    syncing: false,
  });
  const [syncService, setSyncService] = useState<SyncService | null>(null);
  const [printer] = useState(() => new MockPrinter({ device_name: 'mock', width_chars: 32, logo: '/logo.png' }));

  // Initialize app
  useEffect(() => {
    const init = async () => {
      try {
        // Load products from local database
        try {
          let result: Product[] = await invoke('get_all_products');
          
          if (!result || result.length === 0) {
            const mockProducts = [
              { name: 'Virgin Mojito', price: 500, category: 'Cocktails', sku: '000' },
              { name: 'Shirley Temple', price: 400, category: 'Cocktails', sku: '102' },
              { name: 'Virgin Piña Colada', price: 550, category: 'Cocktails', sku: '215' },
              { name: 'Lemonade', price: 300, category: 'Beverages', sku: '304' },
            ];
            
            for (const p of mockProducts) {
              await invoke('create_product', {
                name: p.name,
                description: null,
                price: p.price,
                category: p.category,
                sku: p.sku
              });
            }
            result = await invoke('get_all_products');
          }
          
          setProducts(result);
        } catch (error) {
          console.error('Failed to load products from DB:', error);
          // Fallback if Tauri is not available
          const mockProducts: Product[] = [
            {
              id: generateId() as any,
              name: 'Virgin Mojito',
              price: 500,
              category: 'Cocktails',
              sku: '000',
              is_available: true,
              created_at: getCurrentTimestamp(),
              updated_at: getCurrentTimestamp(),
            },
            {
              id: generateId() as any,
              name: 'Shirley Temple',
              price: 400,
              category: 'Cocktails',
              sku: '102',
              is_available: true,
              created_at: getCurrentTimestamp(),
              updated_at: getCurrentTimestamp(),
            },
            {
              id: generateId() as any,
              name: 'Virgin Piña Colada',
              price: 550,
              category: 'Cocktails',
              sku: '215',
              is_available: true,
              created_at: getCurrentTimestamp(),
              updated_at: getCurrentTimestamp(),
            },
            {
              id: generateId() as any,
              name: 'Lemonade',
              price: 300,
              category: 'Beverages',
              sku: '304',
              is_available: true,
              created_at: getCurrentTimestamp(),
              updated_at: getCurrentTimestamp(),
            },
          ];
          setProducts(mockProducts);
        }

        // Initialize Supabase sync if configured
        if (SYNC_CONFIG.supabaseUrl && SYNC_CONFIG.supabaseAnonKey) {
          try {
            const sync = new SyncService(SYNC_CONFIG);
            setSyncService(sync);

            // Start background sync
            sync.startBackgroundSync((result: SyncResult) => {
              setSyncStatus(prev => ({
                ...prev,
                lastSync: new Date().toLocaleTimeString(),
              }));

              if (!result.success) {
                console.warn('Sync failed:', result.errors);
              }
            });

            // Listen for online/offline changes
            const handleOnline = () => setSyncStatus(prev => ({ ...prev, online: true }));
            const handleOffline = () => setSyncStatus(prev => ({ ...prev, online: false }));

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
              sync.stopBackgroundSync();
              window.removeEventListener('online', handleOnline);
              window.removeEventListener('offline', handleOffline);
            };
          } catch (error) {
            console.error('Failed to initialize sync:', error);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Handle checkout
  const handleCheckout = useCallback(
    async (data: { items: CartItem[]; total: number; payment_method: 'cash' | 'card' }) => {
      try {
        setSyncStatus(prev => ({ ...prev, syncing: true }));

        // Create order via Tauri if available
        let backendOrder: Order | null = null;
        try {
          backendOrder = await invoke('create_order', {
            totalAmount: data.total,
            paymentMethod: data.payment_method,
          });

          // Create order items
          for (const cartItem of data.items) {
            await invoke('add_order_item', {
              orderId: backendOrder!.id,
              productId: cartItem.product_id,
              quantity: cartItem.quantity,
              unitPrice: cartItem.price,
              totalPrice: cartItem.price * cartItem.quantity,
            });
          }
        } catch (dbError) {
          console.error("Database unavailable, proceeding offline:", dbError);
        }

        const fallbackOrder: Order = {
          id: generateId() as any,
          order_number: Math.floor(Math.random() * 10000),
          total_amount: data.total,
          payment_method: data.payment_method,
          status: 'completed',
          created_at: getCurrentTimestamp(),
          updated_at: getCurrentTimestamp(),
          sync_status: 'pending',
        };

        const finalOrder = backendOrder || fallbackOrder;

        // Prepare for printing
        const itemsWithProducts = data.items
          .map(cartItem => {
            const product = products.find(p => p.id === cartItem.product_id);
            if (!product) return null;
            return {
              id: generateId() as any,
              order_id: finalOrder.id,
              product_id: cartItem.product_id,
              quantity: cartItem.quantity,
              unit_price: cartItem.price,
              total_price: cartItem.price * cartItem.quantity,
              created_at: getCurrentTimestamp(),
              product,
            };
          })
          .filter(Boolean) as any[];

        // Print receipt
        const printResult = await printer.printReceipt(finalOrder, itemsWithProducts, SHOP_NAME);
        if (!printResult.success) {
          console.warn('Printer warning:', printResult.error);
          // Don't fail checkout if printer fails
        }

        // Trigger sync if online
        if (syncStatus.online && syncService) {
          await syncService.syncNow();
        }

        // Order completed successfully
      } catch (error) {
        console.error('Checkout error:', error);
        throw error;
      } finally {
        setSyncStatus(prev => ({ ...prev, syncing: false }));
      }
    },
    [products, syncStatus.online, syncService, printer]
  );

  const handleAddProduct = useCallback(
    (data: { name: string; price: number; category: string; sku: string }) => {
      const normalizedSku = data.sku.trim();
      if (!/^\d{3}$/.test(normalizedSku)) {
        throw new Error('Item code must be exactly 3 digits (example: 000, 102)');
      }

      setProducts(prev => {
        const hasDuplicateCode = prev.some(p => p.sku === normalizedSku);
        if (hasDuplicateCode) {
          throw new Error(`Item code ${normalizedSku} already exists`);
        }

        const now = getCurrentTimestamp();
        const newProduct: Product = {
          id: generateId() as any,
          name: data.name.trim(),
          price: data.price,
          category: data.category.trim(),
          sku: normalizedSku,
          is_available: true,
          created_at: now,
          updated_at: now,
        };

        return [...prev, newProduct];
      });
    },
    []
  );

  const handleUpdateProduct = useCallback(
    (data: { id: string; name: string; price: number; category: string; sku: string; is_available: boolean }) => {
      const normalizedSku = data.sku.trim();
      if (!/^\d{3}$/.test(normalizedSku)) {
        throw new Error('Item code must be exactly 3 digits (example: 000, 102)');
      }

      setProducts(prev => {
        const hasDuplicateCode = prev.some(p => p.id !== data.id && p.sku === normalizedSku);
        if (hasDuplicateCode) {
          throw new Error(`Item code ${normalizedSku} already exists`);
        }

        const exists = prev.some(p => p.id === data.id);
        if (!exists) {
          throw new Error('Item not found');
        }

        return prev.map(p =>
          p.id === data.id
            ? {
                ...p,
                name: data.name.trim(),
                price: data.price,
                category: data.category.trim(),
                sku: normalizedSku,
                is_available: data.is_available,
                updated_at: getCurrentTimestamp(),
              }
            : p
        );
      });
    },
    []
  );

  const handleDeleteProduct = useCallback((productId: string) => {
    setProducts(prev => {
      const exists = prev.some(p => p.id === productId);
      if (!exists) {
        throw new Error('Item not found');
      }
      return prev.filter(p => p.id !== productId);
    });
  }, []);

  if (isLoading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <BillingScreen
          products={products}
          onCheckout={handleCheckout}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
        />
      </div>

      {/* Status Bar */}
      <div
        style={{
          height: '30px',
          background: syncStatus.online ? '#4CAF50' : '#f44336',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 12px',
          fontSize: '12px',
          flexShrink: 0,
        }}
      >
        <span>
          {syncStatus.online ? '🟢 Online' : '🔴 Offline'}
          {syncStatus.syncing && ' (Syncing...)'}
        </span>
        {syncStatus.lastSync && (
          <span>Last sync: {syncStatus.lastSync}</span>
        )}
      </div>
    </div>
  );
};

export default App;
