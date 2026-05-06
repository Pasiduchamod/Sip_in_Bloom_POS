// src-tauri/src/commands.rs
// Tauri IPC command handlers

use crate::db::{DbState, Product, Order, OrderItem, DailySummary};
use tauri::State;

// PRODUCT COMMANDS
#[tauri::command]
pub fn create_product(
    name: String,
    description: Option<String>,
    price: i64,
    category: String,
    sku: Option<String>,
    db: State<DbState>,
) -> Result<Product, String> {
    db.create_product(name, description, price, category, sku)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_products(db: State<DbState>) -> Result<Vec<Product>, String> {
    db.get_all_products().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_products_by_category(category: String, db: State<DbState>) -> Result<Vec<Product>, String> {
    db.get_products_by_category(category)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_product(
    id: String,
    name: Option<String>,
    price: Option<i64>,
    is_available: Option<bool>,
    db: State<DbState>,
) -> Result<Product, String> {
    db.update_product(id, name, price, is_available)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_product(id: String, db: State<DbState>) -> Result<(), String> {
    db.delete_product(id).map_err(|e| e.to_string())
}

// ORDER COMMANDS
#[tauri::command]
pub fn create_order(
    total_amount: i64,
    payment_method: String,
    db: State<DbState>,
) -> Result<Order, String> {
    db.create_order(total_amount, payment_method)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_unsynced_orders(db: State<DbState>) -> Result<Vec<Order>, String> {
    db.get_unsynced_orders().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn mark_order_synced(id: String, db: State<DbState>) -> Result<(), String> {
    db.mark_order_as_synced(id).map_err(|e| e.to_string())
}

// ORDER ITEM COMMANDS
#[tauri::command]
pub fn add_order_item(
    order_id: String,
    product_id: String,
    quantity: i64,
    unit_price: i64,
    total_price: i64,
    db: State<DbState>,
) -> Result<OrderItem, String> {
    db.add_order_item(order_id, product_id, quantity, unit_price, total_price)
        .map_err(|e| e.to_string())
}

// DAILY SUMMARY COMMANDS
#[tauri::command]
pub fn get_daily_summary(date: String, db: State<DbState>) -> Result<Option<DailySummary>, String> {
    db.get_daily_summary(date).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn calculate_daily_summary(date: String, db: State<DbState>) -> Result<DailySummary, String> {
    db.calculate_daily_summary(date).map_err(|e| e.to_string())
}
