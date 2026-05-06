-- Supabase (PostgreSQL) migrations for POS system
-- Run these in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Migration 001: Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL,  -- in cents
  category TEXT NOT NULL,
  sku TEXT UNIQUE,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);

-- Migration 002: Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number BIGSERIAL UNIQUE NOT NULL,
  total_amount BIGINT NOT NULL,  -- in cents
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  synced_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_sync_status ON orders(sync_status);

-- Migration 003: Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price BIGINT NOT NULL,  -- in cents
  total_price BIGINT NOT NULL,  -- in cents
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Migration 004: Create daily_summary table
CREATE TABLE IF NOT EXISTS daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date DATE UNIQUE NOT NULL,
  total_sales BIGINT,  -- in cents
  total_orders INTEGER,
  total_items_sold INTEGER,
  payment_cash BIGINT,  -- in cents
  payment_card BIGINT,  -- in cents
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_summary(summary_date);

-- Migration 005: Create sync_log table
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  synced BOOLEAN DEFAULT FALSE,
  last_attempted TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_log_synced ON sync_log(synced);
CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON sync_log(entity_type, entity_id);

-- Enable RLS (optional, for multi-tenant support)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Create policies (replace 'user_id' with your actual user column if needed)
-- For now, allow all (remove in production with proper RLS policies)
CREATE POLICY "Enable all access for authenticated users" ON products
  AS PERMISSIVE FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Enable all access for authenticated users" ON orders
  AS PERMISSIVE FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Enable all access for authenticated users" ON order_items
  AS PERMISSIVE FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Enable all access for authenticated users" ON daily_summary
  AS PERMISSIVE FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Enable all access for authenticated users" ON sync_log
  AS PERMISSIVE FOR ALL USING (TRUE) WITH CHECK (TRUE);
