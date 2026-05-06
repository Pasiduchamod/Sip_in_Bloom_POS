# POS System Database Schema

## Overview
This schema is compatible with both SQLite (local) and Supabase (PostgreSQL) with minimal differences.

## Tables

### 1. **products**
Stores menu items (mocktails, snacks, etc.)

```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,                    -- UUID
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,                   -- in cents (e.g., 500 = $5.00)
  category TEXT NOT NULL,                -- e.g., "cocktail", "appetizer", "snack"
  sku TEXT UNIQUE,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP                   -- soft delete
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_available ON products(is_available);
```

### 2. **orders**
Main order records

```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,                    -- UUID
  order_number INTEGER AUTO_INCREMENT,    -- Sequential for receipt
  total_amount REAL NOT NULL,             -- in cents
  payment_method TEXT NOT NULL,           -- "cash" or "card"
  status TEXT DEFAULT "completed",        -- "draft", "completed", "cancelled"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT "pending",     -- "pending", "synced", "failed"
  synced_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_sync_status ON orders(sync_status);
```

### 3. **order_items**
Individual items within an order

```sql
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,                    -- UUID
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,               -- Price at time of sale
  total_price REAL NOT NULL,              -- quantity * unit_price
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

### 4. **daily_summary** (optional, for performance)
Pre-calculated daily stats (for reports)

```sql
CREATE TABLE daily_summary (
  id TEXT PRIMARY KEY,                    -- UUID
  summary_date DATE UNIQUE,
  total_sales REAL,                       -- cents
  total_orders INTEGER,
  total_items_sold INTEGER,
  payment_cash REAL,
  payment_card REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_daily_summary_date ON daily_summary(summary_date);
```

### 5. **sync_log** (tracking)
Audit trail for sync operations

```sql
CREATE TABLE sync_log (
  id TEXT PRIMARY KEY,                    -- UUID
  entity_type TEXT NOT NULL,              -- "order", "product"
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,                   -- "create", "update", "delete"
  synced BOOLEAN DEFAULT FALSE,
  last_attempted TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_log_synced ON sync_log(synced);
CREATE INDEX idx_sync_log_entity ON sync_log(entity_type, entity_id);
```

## Key Design Decisions

1. **UUID for IDs**: Enables offline-first design without conflicts
2. **Timestamps**: `created_at`, `updated_at`, `synced_at` for auditing and sync logic
3. **Sync Status**: `pending`, `synced`, `failed` states
4. **Soft Delete**: `deleted_at` field for products (not hard delete)
5. **Price in Cents**: Avoid floating-point math issues
6. **Foreign Keys**: Maintain referential integrity

## SQLite-Specific Notes

- Use `INTEGER PRIMARY KEY AUTOINCREMENT` for `order_number` in SQLite
- Timestamps are ISO-8601 strings (e.g., "2026-05-06T10:30:00Z")
- Boolean values are 0/1

## Supabase (PostgreSQL) Notes

- Native UUID type with `gen_random_uuid()`
- Native TIMESTAMP with timezone
- Native BOOLEAN type
- Enable Row Level Security (RLS) for data isolation if needed

## Example Queries

### Get today's sales
```sql
SELECT 
  COUNT(*) as total_orders,
  SUM(total_amount) as total_sales
FROM orders
WHERE DATE(created_at) = DATE('now')
  AND status = 'completed';
```

### Top selling items today
```sql
SELECT 
  p.name,
  SUM(oi.quantity) as quantity_sold,
  SUM(oi.total_price) as revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN orders o ON oi.order_id = o.id
WHERE DATE(o.created_at) = DATE('now')
GROUP BY p.id
ORDER BY quantity_sold DESC
LIMIT 10;
```

### Get unsynced orders
```sql
SELECT * FROM orders
WHERE sync_status = 'pending'
ORDER BY created_at ASC;
```
