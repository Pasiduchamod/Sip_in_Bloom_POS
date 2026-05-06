# POS System - Setup & Deployment Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Database Setup](#database-setup)
5. [Supabase Configuration](#supabase-configuration)
6. [Running the Application](#running-the-application)
7. [Building for Production](#building-for-production)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)
10. [Architecture Overview](#architecture-overview)

## Project Overview

**Slip in Bloom** is an offline-first POS system built with:
- **Frontend**: React + TypeScript
- **Desktop App**: Tauri (cross-platform)
- **Local Database**: SQLite
- **Cloud Sync**: Supabase (PostgreSQL)
- **Backend Logic**: Rust (via Tauri)

### Key Features
✅ Fast billing screen with keyboard shortcuts
✅ Offline-first (works without internet)
✅ Automatic cloud sync when online
✅ Thermal printer support (ESC/POS)
✅ Daily sales reports
✅ Product management

---

## Prerequisites

### Required
- **Node.js** 16+ (for React/TypeScript)
- **Rust** 1.60+ (for Tauri backend)
- **Git**

### Optional but Recommended
- **Supabase Account** (free tier available)
- **USB Thermal Printer** (ESC/POS compatible, 58mm or 80mm)
- **Visual Studio Code** with Rust Analyzer extension

### Installation

#### 1. Install Node.js
- **Windows/macOS**: Download from https://nodejs.org/ (LTS version)
- **Linux**: `sudo apt install nodejs npm` (Ubuntu/Debian)

Verify: `node --version && npm --version`

#### 2. Install Rust
- **All platforms**: https://rustup.rs/
- Run installer and follow instructions

Verify: `rustc --version && cargo --version`

#### 3. Install Tauri CLI
```bash
npm install -g @tauri-apps/cli
```

---

## Local Development Setup

### 1. Clone/Create Project

```bash
git clone <repo-url> slip-in-bloom
cd slip-in-bloom
```

### 2. Install Dependencies

```bash
# Frontend dependencies
npm install

# Tauri dependencies are handled by Cargo
```

### 3. Project Structure

```
slip-in-bloom/
├── src/                              # React frontend
│   ├── components/
│   │   └── BillingScreen.tsx        # Main POS UI
│   ├── services/
│   │   ├── db.ts                    # Database types & helpers
│   │   ├── sync.ts                  # Supabase sync logic
│   │   └── printer.ts               # Thermal printer integration
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces
│   ├── App.tsx                      # Main app component
│   └── main.tsx                     # React entry point
│
├── src-tauri/                        # Rust backend
│   ├── src/
│   │   ├── main.rs                  # Tauri app entry
│   │   ├── db.rs                    # SQLite operations
│   │   ├── commands.rs              # Tauri IPC handlers
│   │   └── lib.rs                   # Library exports
│   ├── migrations/
│   │   └── 001_initial_schema.sql   # SQLite schema
│   ├── Cargo.toml                   # Rust dependencies
│   └── tauri.conf.json              # Tauri config
│
├── docs/
│   ├── DATABASE_SCHEMA.md           # Schema documentation
│   ├── SUPABASE_MIGRATIONS.sql      # PostgreSQL schema
│   └── SETUP_GUIDE.md               # This file
│
├── package.json                     # NPM dependencies
├── tsconfig.json                    # TypeScript config
└── vite.config.ts                   # Vite build config
```

---

## Database Setup

### SQLite (Local)

SQLite database is **automatically created** at:
- **Windows**: `%APPDATA%\slip-in-bloom\pos.db`
- **macOS**: `~/Library/Application Support/slip-in-bloom/pos.db`
- **Linux**: `~/.local/share/slip-in-bloom/pos.db`

No manual setup needed - the Rust backend creates and initializes it.

### Supabase (Cloud)

#### 1. Create Supabase Project
1. Go to https://supabase.com
2. Sign up (free tier available)
3. Create a new project
4. Go to **Project Settings** → **API** → copy:
   - Project URL
   - Anon Key

#### 2. Create Tables
1. Go to **SQL Editor** in Supabase dashboard
2. Create new query
3. Copy all SQL from `docs/SUPABASE_MIGRATIONS.sql`
4. Run the query

#### 3. Environment Variables
Create `.env.local` in project root:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with your actual Supabase credentials.

---

## Running the Application

### Development Mode

#### Terminal 1: Start Vite Dev Server
```bash
npm run dev
```
This starts the React dev server on http://localhost:5173

#### Terminal 2: Start Tauri App
```bash
npm run tauri:dev
```
This compiles Rust and launches the desktop app with hot reload.

The app will open with:
- Live React component reloading
- Full-featured billing screen
- Local SQLite database

### First Run Checklist
- ✅ App opens successfully
- ✅ Product list loads
- ✅ Can add items to cart
- ✅ Checkout button works
- ✅ No console errors

---

## Building for Production

### 1. Build Frontend
```bash
npm run build
```
Generates optimized bundle in `dist/` folder.

### 2. Build Desktop App
```bash
npm run tauri:build
```
Creates native executable:
- **Windows**: `src-tauri/target/release/slip-in-bloom-backend.exe`
- **macOS**: `src-tauri/target/release/slip-in-bloom-backend.app`
- **Linux**: `src-tauri/target/release/slip-in-bloom-backend`

### 3. Build Output
Installers are created in `src-tauri/target/release/bundle/`:
- **Windows**: `.msi` (MSI installer) and `.nsis` (NSIS installer)
- **macOS**: `.dmg` (DMG installer) and `.app` (App bundle)
- **Linux**: `.deb` and `.AppImage`

### Build Troubleshooting
If build fails:
```bash
# Clear cache
cargo clean

# Rebuild
npm run tauri:build
```

---

## Deployment

### Windows Deployment

#### Option 1: MSI Installer
1. Create `slip-in-bloom_0.1.0_x64_en-US.msi` from build
2. Upload to your server
3. Users download and run installer
4. App installs to `Program Files/Slip in Bloom`

#### Option 2: Portable EXE
1. Copy `slip-in-bloom-backend.exe` to USB/network
2. Users run directly (no installation needed)
3. Data stored in `%APPDATA%\slip-in-bloom\`

### Distribution Options

#### Cloud-Hosted Installation
1. Upload `.msi` / `.exe` to AWS S3 or similar
2. Create download page
3. Add auto-update functionality (Tauri supports this)

#### USB Distribution
1. Copy `slip-in-bloom-backend.exe` to USB
2. Create `README.txt` with instructions
3. Distribute to bar locations

#### Network Share
```batch
\\network-server\slip-in-bloom\slip-in-bloom.msi
```

### Configuration for Production

Create `production.env`:
```env
REACT_APP_SUPABASE_URL=https://your-production-supabase.com
REACT_APP_SUPABASE_ANON_KEY=your-production-key
REACT_APP_SHOP_NAME=Slip in Bloom
```

Before building:
```bash
cp production.env .env.local
npm run tauri:build
```

---

## Troubleshooting

### Common Issues

#### "Database is locked"
**Problem**: Multiple app instances accessing SQLite simultaneously
**Solution**: 
- Ensure only one instance runs
- Restart app
- Check if another process has database file open

#### "Sync fails with 403 error"
**Problem**: Supabase authentication failed
**Solution**:
- Verify Anon Key in `.env.local`
- Check RLS policies aren't blocking access
- Ensure network connectivity

#### "Printer not found"
**Problem**: USB printer not detected
**Solution**:
- Install printer drivers
- Check USB connection
- Verify printer is ESC/POS compatible
- Test with `MockPrinter` for debugging

#### "App won't start on Linux"
**Problem**: Missing dependencies
**Solution**:
```bash
# Ubuntu/Debian
sudo apt-get install libssl-dev libgtk-3-dev

# Fedora/RHEL
sudo dnf install openssl-devel gtk3-devel
```

#### "Build fails with Rust errors"
**Problem**: Outdated Rust toolchain
**Solution**:
```bash
rustup update
cargo clean
npm run tauri:build
```

### Debug Mode

Enable detailed logging:

```typescript
// In App.tsx
if (process.env.DEBUG) {
  localStorage.debug = '*';
}
```

Check logs:
- **Windows**: `%APPDATA%\slip-in-bloom\`
- **macOS/Linux**: `~/.slip-in-bloom/`

---

## Architecture Overview

### Data Flow

```
┌─────────────────┐
│  React UI       │  ◄─── BillingScreen.tsx
│  (Frontend)     │
└────────┬────────┘
         │ Tauri IPC
         ▼
┌─────────────────┐
│  Tauri Rust     │  ◄─── commands.rs
│  (Backend)      │
└────────┬────────┘
         │ SQL
         ▼
┌─────────────────┐
│  SQLite DB      │  ◄─── Local Data
│  (Local)        │
└─────────────────┘

    ┌──────────────┐
    │ Background   │
    │ Sync Service │  ◄─── sync.ts
    └──────┬───────┘
           │ HTTPS
           ▼
    ┌──────────────┐
    │ Supabase     │  ◄─── Cloud Sync
    │ (PostgreSQL) │
    └──────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI | React 18 | User interface |
| State | React Hooks | Client-side state |
| Language | TypeScript | Type safety |
| Desktop | Tauri | Cross-platform app |
| Backend | Rust | High-performance backend |
| Local DB | SQLite | Offline-first storage |
| Cloud DB | Supabase | Cloud synchronization |
| Sync | Custom Service | Conflict-free sync |
| Build | Vite | Fast frontend build |
| Packager | Cargo | Rust compilation |

### Offline-First Architecture

1. **All operations are local-first**
   - User adds item → stored in SQLite immediately
   - No network required to complete sale
   - Cart saved even if app crashes

2. **Background sync when online**
   - Every 30 seconds (configurable)
   - Queues unsynced orders
   - Retries on failure with exponential backoff

3. **Conflict resolution**
   - Last-write-wins for products
   - UUID + timestamp for orders
   - Sync log for audit trail

---

## Performance Optimization

### Frontend
- ✅ Keyboard shortcuts optimized (Ctrl+E for checkout)
- ✅ Memoized components to prevent re-renders
- ✅ Local state only (no Redux needed)
- ✅ Grid layout for product display
- ✅ Instant add-to-cart (100ms response)

### Backend
- ✅ SQLite for fast local queries
- ✅ Indexed queries (category, sync_status)
- ✅ Batch inserts for order items
- ✅ Connection pooling

### Database
- ✅ Indexes on frequently queried columns
- ✅ Denormalized daily_summary table
- ✅ Soft deletes to preserve history

---

## Daily Operations

### Starting the POS System

```bash
# Terminal (keep open)
npm run tauri:dev

# Or for production:
./slip-in-bloom-backend.exe
```

### Daily Summary Report

```sql
-- Query (from App)
SELECT total_sales, total_orders, payment_cash, payment_card
FROM daily_summary
WHERE summary_date = '2026-05-06'
```

### End of Day

1. Close POS app
2. Backup database (optional):
   ```bash
   cp ~/.slip-in-bloom/pos.db ./backups/pos_$(date +%Y%m%d).db
   ```
3. Data automatically syncs to Supabase

### Backup Strategy

Recommended backup schedule:
- **Daily**: Automatic (via Supabase)
- **Weekly**: Manual backup of SQLite file
- **Monthly**: Export to CSV for archival

---

## Support & Updates

### Checking for Updates
```bash
npm run tauri:build  # Creates latest version
```

### Rollback
Keep previous version binary:
```
slip-in-bloom_v0.1.0.exe  # Previous version
slip-in-bloom_v0.2.0.exe  # New version
```

### Getting Help

1. **Check logs**:
   - Browser console (F12)
   - Tauri app logs in data directory

2. **Common Commands**:
   ```bash
   npm install              # Fix dependencies
   cargo clean              # Clear build cache
   npm run tauri:dev        # Run with hot reload
   npm run tauri:build      # Build for production
   ```

3. **Database Recovery**:
   - Stop app
   - Delete `pos.db` (fresh start)
   - Restart app (recreates database)

---

## Security Considerations

### Local Database
- SQLite file has no encryption by default
- For enhanced security, consider:
  - Using `sqlcipher` instead of `rusqlite`
  - Encrypting database file
  - Restricting file permissions

### Cloud Sync
- Use Supabase RLS (Row Level Security)
- Never expose service role key in app
- Use anon key only (read/write restrictions)
- Enable HTTPS only (Supabase does by default)

### Printer Communication
- ESC/POS is unencrypted (local USB)
- Ensure printer is on secure network
- Consider IP printer restrictions

---

## Next Steps

1. ✅ Set up local development environment
2. ✅ Create Supabase account and project
3. ✅ Configure environment variables
4. ✅ Run `npm run tauri:dev`
5. ✅ Test full workflow (add items → checkout)
6. ✅ Configure thermal printer
7. ✅ Deploy to production

Good luck! 🎉
