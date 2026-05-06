# Slip in Bloom - Offline-First POS System

A modern, keyboard-optimized point-of-sale system for mocktail bars built with **Tauri + React + SQLite + Supabase**.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

## Features ✨

- ⚡ **Lightning-fast Billing**: Keyboard-first UI optimized for speed
- 📴 **Offline-First**: Works completely without internet
- ☁️ **Cloud Sync**: Automatic background sync to Supabase
- 🖨️ **Thermal Printer**: ESC/POS printer support for receipts
- 📊 **Daily Reports**: Built-in sales analytics and summaries
- 💾 **Local Database**: SQLite for reliable offline operations
- 🔄 **Conflict Resolution**: Smart sync with retry logic
- 🎯 **Zero Lag**: Sub-100ms response time for user interactions

## Quick Start 🚀

### Prerequisites
- Node.js 16+ and npm
- Rust 1.60+
- Git

### Installation

```bash
# Clone repository
git clone <repo-url>
cd slip-in-bloom

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development
npm run tauri:dev
```

See [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) for detailed instructions.

## Project Structure

```
slip-in-bloom/
├── src/                          # React frontend (TypeScript)
│   ├── components/
│   │   └── BillingScreen.tsx     # Main POS UI component
│   ├── services/
│   │   ├── db.ts                 # Database service interface
│   │   ├── sync.ts               # Supabase sync engine
│   │   └── printer.ts            # Thermal printer integration
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   ├── examples/
│   │   └── QueryExamples.ts      # Query examples
│   └── App.tsx                   # Main app component
│
├── src-tauri/                    # Tauri/Rust backend
│   ├── src/
│   │   ├── main.rs               # App entry point
│   │   ├── db.rs                 # SQLite operations
│   │   ├── commands.rs           # Tauri IPC handlers
│   │   └── lib.rs                # Library exports
│   ├── migrations/
│   │   └── 001_initial_schema.sql # Database schema
│   └── Cargo.toml                # Rust dependencies
│
├── docs/
│   ├── DATABASE_SCHEMA.md        # Full schema documentation
│   ├── SUPABASE_MIGRATIONS.sql   # PostgreSQL migrations
│   ├── SETUP_GUIDE.md            # Installation & deployment
│   └── README.md                 # This file
│
└── Configuration Files
    ├── package.json              # NPM dependencies
    ├── tsconfig.json             # TypeScript config
    ├── vite.config.ts            # Vite build config
    └── .env.example              # Environment template
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend UI | React 18 + TypeScript | User interface |
| Desktop App | Tauri 1.5 | Cross-platform wrapper |
| Backend | Rust | High-performance operations |
| Local DB | SQLite | Offline-first storage |
| Cloud DB | Supabase (PostgreSQL) | Cloud synchronization |
| Build Tool | Vite | Fast bundling |
| Package Manager | npm/Cargo | Dependency management |

## Database Schema

### Tables
- **products** - Menu items (name, price, category, availability)
- **orders** - Sales transactions (total, payment method, sync status)
- **order_items** - Individual items in each order
- **daily_summary** - Aggregated daily statistics
- **sync_log** - Audit trail for sync operations

See [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) for complete schema.

## Key Features Explained

### 1. Billing Screen (`BillingScreen.tsx`)
- Split-view: Products left, cart right
- Search and category filtering
- Keyboard shortcuts for power users:
  - `Ctrl+E` - Checkout
  - `Ctrl+C` - Clear cart
  - `Ctrl+S` - Search
  - `Ctrl+Z` - Toggle payment method
  - `1-9` - Quick add item

### 2. Offline-First Architecture
```
User Action → Local SQLite → Instant Response
                  ↓
            Background Sync (if online)
                  ↓
            Supabase Cloud DB
```

- All operations saved locally first
- No network required to complete transactions
- Automatic sync when connection available

### 3. Cloud Sync (`sync.ts`)
- Background sync every 30 seconds
- Retry logic with exponential backoff
- Conflict resolution (last-write-wins)
- Queue for failed syncs

### 4. Printer Integration (`printer.ts`)
- ESC/POS thermal printer commands
- 58mm and 80mm printer support
- Mock printer for testing
- Browser print fallback

### 5. Daily Reports
```sql
SELECT 
  total_sales,
  total_orders,
  payment_cash,
  payment_card,
  top_items
FROM daily_summary
WHERE date = TODAY
```

## Usage Examples

### Starting the App
```bash
# Development with hot reload
npm run tauri:dev

# Production build
npm run tauri:build
```

### Creating an Order
```typescript
// Handled by BillingScreen component
// User adds items → clicks Checkout → prints receipt
```

### Daily Summary
```typescript
import { getTodaysSales } from './examples/QueryExamples';

const summary = await getTodaysSales();
console.log(`Today's sales: $${summary.total_sales / 100}`);
```

## Configuration

### Environment Variables
Create `.env.local` (copy from `.env.example`):

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_SHOP_NAME=Slip in Bloom
```

### Database
- Automatically created at:
  - Windows: `%APPDATA%\slip-in-bloom\pos.db`
  - macOS: `~/Library/Application Support/slip-in-bloom/pos.db`
  - Linux: `~/.local/share/slip-in-bloom/pos.db`

### Printer
Configure in app:
```typescript
const printer = new ThermalPrinter({
  device_name: 'USB Printer',
  width_chars: 32, // or 40
});
```

## Performance

### Benchmarks
- Add item to cart: **~5ms**
- Checkout: **<100ms**
- Daily summary calculation: **<50ms**
- Background sync: **Non-blocking**

### Optimizations
- ✅ Memoized React components
- ✅ Indexed SQLite queries
- ✅ Batch database inserts
- ✅ Local state management (no Redux)
- ✅ Virtual scrolling for product list

## Building for Production

### Windows
```bash
npm run tauri:build
# Generates: .msi, .nsis installers
```

### macOS
```bash
npm run tauri:build
# Generates: .dmg, .app bundle
```

### Linux
```bash
npm run tauri:build
# Generates: .deb, .AppImage
```

See [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) for deployment instructions.

## API Reference

### Tauri Commands
```typescript
// Products
invoke('get_all_products') → Product[]
invoke('create_product', {...}) → Product
invoke('update_product', {id, ...}) → Product
invoke('delete_product', {id}) → void

// Orders
invoke('create_order', {total_amount, payment_method}) → Order
invoke('get_unsynced_orders') → Order[]
invoke('mark_order_synced', {id}) → void

// Daily Summary
invoke('calculate_daily_summary', {date}) → DailySummary
```

### Sync Service
```typescript
const sync = new SyncService(config);
sync.startBackgroundSync(callback);
await sync.syncNow();
sync.stopBackgroundSync();
```

### Printer
```typescript
const printer = new ThermalPrinter(config);
await printer.printReceipt(order, items, shopName);
```

## Troubleshooting

### App won't start
```bash
# Clear cache and rebuild
cargo clean
npm run tauri:dev
```

### Database locked error
- Ensure only one app instance is running
- Stop app and restart

### Sync fails
- Check network connection
- Verify Supabase credentials in `.env.local`
- Check Supabase project status

### Printer not working
- Verify USB connection
- Install printer drivers
- Test with `MockPrinter`

See [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) for more troubleshooting.

## Development

### Running Tests
```bash
# Frontend
npm run test

# Backend (Rust)
cargo test
```

### Debugging
- React: Chrome DevTools (F12)
- Rust: IDE debugger or `dbg!()` macro
- Database: SQL query tools

### Code Style
```bash
# Format
cargo fmt
npm run format

# Lint
cargo clippy
npm run lint
```

## Security Considerations

⚠️ **Important**: For production use:
1. Enable Supabase RLS policies
2. Consider database encryption
3. Restrict printer network access
4. Use HTTPS for all connections
5. Audit sync logs regularly

## Roadmap 📋

- [ ] Multi-location support
- [ ] Inventory management
- [ ] Customer loyalty program
- [ ] Advanced analytics dashboard
- [ ] Export to accounting software
- [ ] Mobile app companion
- [ ] QR code ordering

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

- 📖 [Setup Guide](./docs/SETUP_GUIDE.md)
- 📊 [Database Schema](./docs/DATABASE_SCHEMA.md)
- 💡 [Query Examples](./src/examples/QueryExamples.ts)
- 🐛 [Issue Tracker](https://github.com/your-repo/issues)

## Author

Built with ❤️ for mocktail bars everywhere.

---

**Ready to get started?** → [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)
#   S i p _ i n _ B l o o m _ P O S  
 