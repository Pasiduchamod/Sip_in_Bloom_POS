// src-tauri/src/main.rs
// Main Tauri application entry point

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;

use std::path::PathBuf;
use db::DbState;

fn main() {
    // Get app data directory
    let app_dir = dirs::data_local_dir()
        .map(|p| p.join("slip-in-bloom"))
        .unwrap_or_else(|| PathBuf::from("./data"));

    // Create directory if it doesn't exist
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");

    let db_path = app_dir.join("pos.db");

    // Initialize database
    let db_state = DbState::new(db_path.to_str().unwrap())
        .expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(db_state)
        .setup(|app| {
            // Log app info
            println!("App started with data directory: {:?}", app_dir);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Product commands
            commands::create_product,
            commands::get_all_products,
            commands::get_products_by_category,
            commands::update_product,
            commands::delete_product,
            // Order commands
            commands::create_order,
            commands::get_unsynced_orders,
            commands::mark_order_synced,
            // Order item commands
            commands::add_order_item,
            // Daily summary commands
            commands::get_daily_summary,
            commands::calculate_daily_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
