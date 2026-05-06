// src-tauri/src/db.rs
// SQLite database operations for Tauri backend

use rusqlite::{params, Connection, Result as SqliteResult};
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use uuid::Uuid;
use chrono::Utc;

// Types matching TypeScript
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub price: i64,
    pub category: String,
    pub sku: Option<String>,
    pub is_available: bool,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: String,
    pub order_number: i64,
    pub total_amount: i64,
    pub payment_method: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub sync_status: String,
    pub synced_at: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderItem {
    pub id: String,
    pub order_id: String,
    pub product_id: String,
    pub quantity: i64,
    pub unit_price: i64,
    pub total_price: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailySummary {
    pub id: String,
    pub summary_date: String,
    pub total_sales: i64,
    pub total_orders: i64,
    pub total_items_sold: i64,
    pub payment_cash: i64,
    pub payment_card: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncLog {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub action: String,
    pub synced: bool,
    pub last_attempted: Option<String>,
    pub error_message: Option<String>,
    pub created_at: String,
}

pub struct DbState {
    pub conn: Mutex<Connection>,
}

impl DbState {
    pub fn new(db_path: &str) -> SqliteResult<Self> {
        let conn = Connection::open(db_path)?;
        
        // Initialize schema
        Self::init_schema(&conn)?;
        
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn init_schema(conn: &Connection) -> SqliteResult<()> {
        // Create tables if they don't exist
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price INTEGER NOT NULL,
                category TEXT NOT NULL,
                sku TEXT UNIQUE,
                is_available BOOLEAN DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                deleted_at TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
            CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);

            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                order_number INTEGER UNIQUE NOT NULL,
                total_amount INTEGER NOT NULL,
                payment_method TEXT NOT NULL,
                status TEXT DEFAULT 'completed',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                synced_at TEXT,
                notes TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
            CREATE INDEX IF NOT EXISTS idx_orders_sync_status ON orders(sync_status);

            CREATE TABLE IF NOT EXISTS order_items (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price INTEGER NOT NULL,
                total_price INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id)
            );

            CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
            CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

            CREATE TABLE IF NOT EXISTS daily_summary (
                id TEXT PRIMARY KEY,
                summary_date TEXT UNIQUE,
                total_sales INTEGER,
                total_orders INTEGER,
                total_items_sold INTEGER,
                payment_cash INTEGER,
                payment_card INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sync_log (
                id TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                action TEXT NOT NULL,
                synced BOOLEAN DEFAULT 0,
                last_attempted TEXT,
                error_message TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_sync_log_synced ON sync_log(synced);
            "
        )?;
        Ok(())
    }

    // PRODUCT OPERATIONS
    pub fn create_product(&self, name: String, description: Option<String>, price: i64, 
                          category: String, sku: Option<String>) -> SqliteResult<Product> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO products (id, name, description, price, category, sku, is_available, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![id, name, description, price, category, sku, true, now, now],
        )?;

        Ok(Product {
            id,
            name,
            description,
            price,
            category,
            sku,
            is_available: true,
            created_at: now.clone(),
            updated_at: now,
            deleted_at: None,
        })
    }

    pub fn get_all_products(&self) -> SqliteResult<Vec<Product>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, price, category, sku, is_available, created_at, updated_at, deleted_at
             FROM products WHERE deleted_at IS NULL ORDER BY category, name"
        )?;

        let products = stmt.query_map([], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                price: row.get(3)?,
                category: row.get(4)?,
                sku: row.get(5)?,
                is_available: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                deleted_at: row.get(9)?,
            })
        })?
        .collect::<SqliteResult<Vec<_>>>()?;

        Ok(products)
    }

    pub fn get_products_by_category(&self, category: String) -> SqliteResult<Vec<Product>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, price, category, sku, is_available, created_at, updated_at, deleted_at
             FROM products WHERE category = ? AND deleted_at IS NULL ORDER BY name"
        )?;

        let products = stmt.query_map(params![category], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                price: row.get(3)?,
                category: row.get(4)?,
                sku: row.get(5)?,
                is_available: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                deleted_at: row.get(9)?,
            })
        })?
        .collect::<SqliteResult<Vec<_>>>()?;

        Ok(products)
    }

    pub fn update_product(&self, id: String, name: Option<String>, price: Option<i64>,
                         is_available: Option<bool>) -> SqliteResult<Product> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        // Get current product
        let mut stmt = conn.prepare(
            "SELECT id, name, description, price, category, sku, is_available, created_at, updated_at, deleted_at
             FROM products WHERE id = ?"
        )?;
        let mut product = stmt.query_row(params![id], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                price: row.get(3)?,
                category: row.get(4)?,
                sku: row.get(5)?,
                is_available: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                deleted_at: row.get(9)?,
            })
        })?;

        // Update fields
        if let Some(n) = name {
            product.name = n;
        }
        if let Some(p) = price {
            product.price = p;
        }
        if let Some(a) = is_available {
            product.is_available = a;
        }

        conn.execute(
            "UPDATE products SET name = ?, price = ?, is_available = ?, updated_at = ? WHERE id = ?",
            params![product.name, product.price, product.is_available, now, id],
        )?;

        product.updated_at = now;
        Ok(product)
    }

    pub fn delete_product(&self, id: String) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE products SET deleted_at = ?, updated_at = ? WHERE id = ?",
            params![now, now, id],
        )?;

        Ok(())
    }

    // ORDER OPERATIONS
    pub fn create_order(&self, total_amount: i64, payment_method: String) -> SqliteResult<Order> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        // Get next order number
        let order_number: i64 = conn.query_row(
            "SELECT COALESCE(MAX(order_number), 0) + 1 FROM orders",
            [],
            |row| row.get(0),
        )?;

        conn.execute(
            "INSERT INTO orders (id, order_number, total_amount, payment_method, status, created_at, updated_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![id, order_number, total_amount, payment_method, "completed", now, now, "pending"],
        )?;

        Ok(Order {
            id,
            order_number,
            total_amount,
            payment_method,
            status: "completed".to_string(),
            created_at: now.clone(),
            updated_at: now,
            sync_status: "pending".to_string(),
            synced_at: None,
            notes: None,
        })
    }

    pub fn get_unsynced_orders(&self) -> SqliteResult<Vec<Order>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, order_number, total_amount, payment_method, status, created_at, updated_at, sync_status, synced_at, notes
             FROM orders WHERE sync_status = 'pending' ORDER BY created_at ASC"
        )?;

        let orders = stmt.query_map([], |row| {
            Ok(Order {
                id: row.get(0)?,
                order_number: row.get(1)?,
                total_amount: row.get(2)?,
                payment_method: row.get(3)?,
                status: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                sync_status: row.get(7)?,
                synced_at: row.get(8)?,
                notes: row.get(9)?,
            })
        })?
        .collect::<SqliteResult<Vec<_>>>()?;

        Ok(orders)
    }

    pub fn mark_order_as_synced(&self, id: String) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE orders SET sync_status = 'synced', synced_at = ? WHERE id = ?",
            params![now, id],
        )?;

        Ok(())
    }

    // ORDER ITEM OPERATIONS
    pub fn add_order_item(&self, order_id: String, product_id: String, quantity: i64,
                         unit_price: i64, total_price: i64) -> SqliteResult<OrderItem> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![id, order_id, product_id, quantity, unit_price, total_price, now],
        )?;

        Ok(OrderItem {
            id,
            order_id,
            product_id,
            quantity,
            unit_price,
            total_price,
            created_at: now,
        })
    }

    pub fn get_daily_summary(&self, date: String) -> SqliteResult<Option<DailySummary>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, summary_date, total_sales, total_orders, total_items_sold, payment_cash, payment_card, created_at, updated_at
             FROM daily_summary WHERE summary_date = ?"
        )?;

        let summary = stmt.query_row(params![date], |row| {
            Ok(DailySummary {
                id: row.get(0)?,
                summary_date: row.get(1)?,
                total_sales: row.get(2)?,
                total_orders: row.get(3)?,
                total_items_sold: row.get(4)?,
                payment_cash: row.get(5)?,
                payment_card: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        }).optional()?;

        Ok(summary)
    }

    pub fn calculate_daily_summary(&self, date: String) -> SqliteResult<DailySummary> {
        let conn = self.conn.lock().unwrap();

        // Calculate totals for the date
        let mut stmt = conn.prepare(
            "SELECT 
                COUNT(*) as total_orders,
                SUM(total_amount) as total_sales,
                SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) as payment_cash,
                SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END) as payment_card,
                SUM((SELECT SUM(quantity) FROM order_items WHERE order_id = orders.id)) as total_items_sold
             FROM orders
             WHERE DATE(created_at) = ? AND status = 'completed'"
        )?;

        let summary = stmt.query_row(params![date], |row| {
            Ok((
                row.get::<_, i64>(0)?, // total_orders
                row.get::<_, Option<i64>>(1)?.unwrap_or(0), // total_sales
                row.get::<_, Option<i64>>(2)?.unwrap_or(0), // payment_cash
                row.get::<_, Option<i64>>(3)?.unwrap_or(0), // payment_card
                row.get::<_, Option<i64>>(4)?.unwrap_or(0), // total_items_sold
            ))
        })?;

        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        let daily_summary = DailySummary {
            id: id.clone(),
            summary_date: date.clone(),
            total_sales: summary.1,
            total_orders: summary.0,
            total_items_sold: summary.4,
            payment_cash: summary.2,
            payment_card: summary.3,
            created_at: now.clone(),
            updated_at: now,
        };

        // Insert or update
        conn.execute(
            "INSERT OR REPLACE INTO daily_summary 
             (id, summary_date, total_sales, total_orders, total_items_sold, payment_cash, payment_card, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                daily_summary.id,
                daily_summary.summary_date,
                daily_summary.total_sales,
                daily_summary.total_orders,
                daily_summary.total_items_sold,
                daily_summary.payment_cash,
                daily_summary.payment_card,
                daily_summary.created_at,
                daily_summary.updated_at,
            ],
        )?;

        Ok(daily_summary)
    }
}
