// src/services/db.ts
// Local SQLite database service

import { v4 as uuidv4 } from 'uuid';
import type { Product, Order, OrderItem, OrderWithItems, DailySummary, SyncLog, UUID } from '../types';

// This interface represents the Tauri invoke function
// In a real app, you'd import from '@tauri-apps/api/tauri'
export interface DatabaseService {
  // Product operations
  getProduct(id: UUID): Promise<Product | null>;
  getAllProducts(): Promise<Product[]>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Product>;
  updateProduct(id: UUID, updates: Partial<Product>): Promise<Product>;
  deleteProduct(id: UUID): Promise<void>; // soft delete

  // Order operations
  getOrder(id: UUID): Promise<OrderWithItems | null>;
  getAllOrders(limit?: number, offset?: number): Promise<OrderWithItems[]>;
  getOrdersByDate(date: string): Promise<OrderWithItems[]>; // YYYY-MM-DD
  createOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order>;
  updateOrderSyncStatus(id: UUID, status: 'pending' | 'synced' | 'failed'): Promise<void>;

  // Order item operations
  addOrderItem(item: Omit<OrderItem, 'id' | 'created_at'>): Promise<OrderItem>;
  getOrderItems(order_id: UUID): Promise<OrderItem[]>;

  // Daily summary
  getDailySummary(date: string): Promise<DailySummary | null>;
  calculateDailySummary(date: string): Promise<DailySummary>;
  getTopSellingItems(date: string, limit?: number): Promise<Array<{ product: Product; quantity: number; revenue: number }>>;

  // Sync operations
  getUnSyncedOrders(): Promise<Order[]>;
  logSyncAction(entity_type: 'order' | 'product', entity_id: UUID, action: 'create' | 'update' | 'delete'): Promise<SyncLog>;
  markAsSynced(entity_type: 'order' | 'product', entity_id: UUID): Promise<void>;

  // Admin
  clearAllData(): Promise<void>;
  exportData(): Promise<string>; // JSON export
}

// Helper to generate UUID
export const generateId = (): UUID => uuidv4() as UUID;

// Helper to format price for display
export const formatPrice = (cents: number): string => {
  return `LKR ${(cents / 100).toFixed(2)}`;
};

// Helper to parse price from user input
export const parsePrice = (input: string): number => {
  const num = parseFloat(input);
  return Math.round(num * 100);
};

// Utility: Get today's date in YYYY-MM-DD format
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Utility: Get current ISO timestamp
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};
