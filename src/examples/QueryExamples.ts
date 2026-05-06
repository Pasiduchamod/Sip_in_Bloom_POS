// src/examples/QueryExamples.ts
// Example queries and API usage for the POS system

import type { Product, Order, OrderItem, DailySummary } from '../types';

/**
 * EXAMPLE QUERIES FOR DAILY SUMMARY REPORTS
 */

// Get today's sales summary
export const getTodaysSales = async (): Promise<DailySummary> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  // TODO: Invoke Tauri command
  // const result = await invoke('calculate_daily_summary', { date: today });
  // return result as DailySummary;
  throw new Error('Implement Tauri invoke');
};

// Get top 10 selling items for today
export const getTopSellingItems = async (limit: number = 10) => {
  const today = new Date().toISOString().split('T')[0];
  // SQL Query (executed on backend):
  // SELECT 
  //   p.name,
  //   SUM(oi.quantity) as quantity_sold,
  //   SUM(oi.total_price) as revenue
  // FROM order_items oi
  // JOIN products p ON oi.product_id = p.id
  // JOIN orders o ON oi.order_id = o.id
  // WHERE DATE(o.created_at) = ?
  // GROUP BY p.id
  // ORDER BY quantity_sold DESC
  // LIMIT ?
  
  // Usage example:
  console.log(`Getting top ${limit} items for ${today}`);
};

// Get sales by payment method
export const getSalesByPaymentMethod = async () => {
  const today = new Date().toISOString().split('T')[0];
  // SQL Query:
  // SELECT 
  //   payment_method,
  //   COUNT(*) as count,
  //   SUM(total_amount) as total
  // FROM orders
  // WHERE DATE(created_at) = ?
  // GROUP BY payment_method;
};

// Get sales trends for last 7 days
export const getSalesTrends = async () => {
  // SQL Query:
  // SELECT 
  //   DATE(created_at) as date,
  //   COUNT(*) as orders,
  //   SUM(total_amount) as total
  // FROM orders
  // WHERE DATE(created_at) >= DATE('now', '-7 days')
  // GROUP BY DATE(created_at)
  // ORDER BY date DESC;
};

/**
 * EXAMPLE: Creating a Complete Order with Items
 */
export const createCompleteOrder = async (
  cartItems: Array<{ product: Product; quantity: number }>
): Promise<Order> => {
  const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Step 1: Create order
  // const order = await invoke('create_order', {
  //   total_amount: total,
  //   payment_method: 'card',
  // });

  // Step 2: Add items to order
  // for (const item of cartItems) {
  //   await invoke('add_order_item', {
  //     order_id: order.id,
  //     product_id: item.product.id,
  //     quantity: item.quantity,
  //     unit_price: item.product.price,
  //     total_price: item.product.price * item.quantity,
  //   });
  // }

  // return order;
  throw new Error('Implement Tauri invoke');
};

/**
 * EXAMPLE: Product Management
 */

// Create new product
export const createNewProduct = async (): Promise<Product> => {
  // const product = await invoke('create_product', {
  //   name: 'Virgin Mojito',
  //   description: 'Fresh mint mojito without alcohol',
  //   price: 500, // $5.00 in cents
  //   category: 'Cocktails',
  //   sku: 'MOJ-001',
  // });
  // return product;
  throw new Error('Implement Tauri invoke');
};

// Get all products
export const getAllProducts = async (): Promise<Product[]> => {
  // const products = await invoke('get_all_products');
  // return products;
  throw new Error('Implement Tauri invoke');
};

// Get products by category
export const getProductsByCategory = async (category: string): Promise<Product[]> => {
  // const products = await invoke('get_products_by_category', { category });
  // return products;
  throw new Error('Implement Tauri invoke');
};

// Update product
export const updateProduct = async (
  id: string,
  updates: { name?: string; price?: number; is_available?: boolean }
): Promise<Product> => {
  // const product = await invoke('update_product', {
  //   id,
  //   ...updates,
  // });
  // return product;
  throw new Error('Implement Tauri invoke');
};

// Delete product (soft delete)
export const deleteProduct = async (id: string): Promise<void> => {
  // await invoke('delete_product', { id });
  throw new Error('Implement Tauri invoke');
};

/**
 * EXAMPLE: Sync Operations
 */

// Get unsynced orders
export const getUnsyncedOrders = async (): Promise<Order[]> => {
  // const orders = await invoke('get_unsynced_orders');
  // return orders;
  throw new Error('Implement Tauri invoke');
};

// Mark order as synced (after successful upload to Supabase)
export const markOrderSynced = async (orderId: string): Promise<void> => {
  // await invoke('mark_order_synced', { id: orderId });
  throw new Error('Implement Tauri invoke');
};

/**
 * REAL-WORLD USAGE SCENARIOS
 */

// Scenario 1: End-of-day report
export async function generateEndOfDayReport() {
  console.log('=== END OF DAY REPORT ===\n');

  try {
    const todaysSummary = await getTodaysSales();
    
    console.log(`Date: ${todaysSummary.summary_date}`);
    console.log(`Total Sales: $${(todaysSummary.total_sales / 100).toFixed(2)}`);
    console.log(`Total Orders: ${todaysSummary.total_orders}`);
    console.log(`Cash: $${(todaysSummary.payment_cash / 100).toFixed(2)}`);
    console.log(`Card: $${(todaysSummary.payment_card / 100).toFixed(2)}`);
    console.log(`Items Sold: ${todaysSummary.total_items_sold}`);
    console.log('\n=== TOP ITEMS ===\n');
    
    // Show top items
    // (Would be implemented with top selling items query)
  } catch (error) {
    console.error('Failed to generate report:', error);
  }
}

// Scenario 2: Quick menu setup (adding products)
export async function setupDemoMenu() {
  const menuItems = [
    { name: 'Virgin Mojito', price: 500, category: 'Cocktails' },
    { name: 'Shirley Temple', price: 400, category: 'Cocktails' },
    { name: 'Virgin Piña Colada', price: 550, category: 'Cocktails' },
    { name: 'Lemonade', price: 300, category: 'Beverages' },
    { name: 'Iced Tea', price: 300, category: 'Beverages' },
    { name: 'Tropical Punch', price: 450, category: 'Beverages' },
    { name: 'Nachos', price: 600, category: 'Snacks' },
    { name: 'Chips & Dip', price: 450, category: 'Snacks' },
  ];

  console.log('Setting up menu...');
  for (const item of menuItems) {
    try {
      // await createNewProduct();
      console.log(`✓ Added: ${item.name}`);
    } catch (error) {
      console.error(`✗ Failed to add ${item.name}:`, error);
    }
  }
}

// Scenario 3: Sync all pending orders
export async function syncPendingOrders() {
  console.log('Syncing pending orders...');
  
  try {
    const pendingOrders = await getUnsyncedOrders();
    console.log(`Found ${pendingOrders.length} pending orders`);

    for (const order of pendingOrders) {
      try {
        // TODO: Send to Supabase
        // await sendOrderToSupabase(order);
        await markOrderSynced(order.id);
        console.log(`✓ Synced order #${order.order_number}`);
      } catch (error) {
        console.error(`✗ Failed to sync order #${order.order_number}:`, error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

/**
 * HELPER: Price Formatting
 */
export const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

export const parsePrice = (input: string): number => {
  const num = parseFloat(input);
  return Math.round(num * 100);
};

/**
 * EXPORT DATA FOR BACKUP
 */
export async function exportDataAsJSON() {
  try {
    const products = await getAllProducts();
    
    const data = {
      exported_at: new Date().toISOString(),
      products,
      // TODO: Add orders, order_items, etc.
    };

    const json = JSON.stringify(data, null, 2);
    
    // Download as file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos_export_${Date.now()}.json`;
    a.click();
    
    console.log('Data exported successfully');
  } catch (error) {
    console.error('Export failed:', error);
  }
}

/**
 * IMPORT DATA FROM BACKUP
 */
export async function importDataFromJSON(file: File) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    for (const product of data.products) {
      // TODO: Import products
      console.log(`Importing: ${product.name}`);
    }

    console.log('Data imported successfully');
  } catch (error) {
    console.error('Import failed:', error);
  }
}
