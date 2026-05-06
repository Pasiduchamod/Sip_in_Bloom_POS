// src/types/index.ts
// Comprehensive types for the POS system

export type UUID = string & { readonly __brand: 'UUID' };

export interface Product {
  id: UUID;
  name: string;
  description?: string;
  price: number; // in cents
  category: string;
  sku?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Order {
  id: UUID;
  order_number: number;
  total_amount: number; // in cents
  payment_method: 'cash' | 'card';
  status: 'draft' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  sync_status: 'pending' | 'synced' | 'failed';
  synced_at?: string | null;
  notes?: string;
}

export interface OrderItem {
  id: UUID;
  order_id: UUID;
  product_id: UUID;
  quantity: number;
  unit_price: number; // in cents
  total_price: number; // in cents
  created_at: string;
}

export interface OrderWithItems extends Order {
  items: (OrderItem & { product?: Product })[];
}

export interface DailySummary {
  id: UUID;
  summary_date: string; // ISO date YYYY-MM-DD
  total_sales: number; // in cents
  total_orders: number;
  total_items_sold: number;
  payment_cash: number; // in cents
  payment_card: number; // in cents
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: UUID;
  entity_type: 'order' | 'product';
  entity_id: UUID;
  action: 'create' | 'update' | 'delete';
  synced: boolean;
  last_attempted?: string;
  error_message?: string;
  created_at: string;
}

// Cart state for billing screen
export interface CartItem {
  product_id: UUID;
  product_name: string;
  price: number; // in cents
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number; // in cents
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  synced_count: number;
  failed_count: number;
  errors: Array<{
    entity_id: UUID;
    error: string;
  }>;
}

// Printer types
export interface PrinterConfig {
  device_name: string;
  width_chars: number; // typically 32 or 40
  logo?: string;
}

export interface ReceiptData {
  order: Order;
  items: (OrderItem & { product: Product })[];
  printer_config: PrinterConfig;
}
