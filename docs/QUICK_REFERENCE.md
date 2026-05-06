// docs/QUICK_REFERENCE.md
# Quick Reference Guide

## 🚀 Get Started in 3 Minutes

### 1. Install & Setup
```bash
cd "d:\Projects\Slip in Bloom"
npm install
cp .env.example .env.local
# Edit .env.local with Supabase credentials
```

### 2. Run Development
```bash
npm run tauri:dev
```

### 3. Start Coding!
```
✅ App opens at http://localhost:5173
✅ SQLite database auto-created
✅ Hot reload enabled
✅ Ready to bill!
```

---

## 📁 File Locations

### Frontend
- `src/components/BillingScreen.tsx` - Main UI
- `src/services/db.ts` - Database interface
- `src/services/sync.ts` - Cloud sync
- `src/services/printer.ts` - Printing
- `src/App.tsx` - App entry point

### Backend
- `src-tauri/src/main.rs` - Tauri setup
- `src-tauri/src/db.rs` - SQLite operations
- `src-tauri/src/commands.rs` - IPC handlers

### Data
- SQLite: `~/.slip-in-bloom/pos.db` (auto-created)
- Supabase: Cloud PostgreSQL

---

## ⌨️ Keyboard Shortcuts

```
Ctrl+E    Checkout
Ctrl+C    Clear cart
Ctrl+S    Search
Ctrl+Z    Toggle payment
1-9       Quick add item
```

---

## 🔧 Common Tasks

### Add Product to Menu
```typescript
// In App.tsx mockProducts array
{
  id: generateId(),
  name: 'Virgin Piña Colada',
  price: 550,  // $5.50 in cents
  category: 'Cocktails',
  is_available: true,
  created_at: getCurrentTimestamp(),
  updated_at: getCurrentTimestamp(),
}
```

### Change Sync Interval
```typescript
// In src/services/sync.ts
const SYNC_CONFIG = {
  syncInterval: 60000,  // milliseconds (60 seconds)
};
```

### Customize Keyboard Shortcut
```typescript
// In BillingScreen.tsx handleKeyDown
if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
  e.preventDefault();
  handlePrintPreview();
}
```

### Query Daily Sales
```typescript
import { getTodaysSales } from './examples/QueryExamples';
const summary = await getTodaysSales();
console.log(`Sales: $${(summary.total_sales / 100).toFixed(2)}`);
```

---

## 📊 Database Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| products | Menu items | id, name, price, category |
| orders | Transactions | id, total_amount, payment_method, sync_status |
| order_items | Line items | order_id, product_id, quantity |
| daily_summary | Reports | summary_date, total_sales, total_orders |
| sync_log | Audit trail | entity_id, action, synced |

---

## 🔄 Tauri Commands

### Invoke from React
```typescript
import { invoke } from '@tauri-apps/api/tauri';

// Call backend
const products = await invoke('get_all_products');
```

### Available Commands
```
get_all_products()
get_products_by_category(category)
create_product(name, price, category)
update_product(id, name, price)
delete_product(id)

create_order(total_amount, payment_method)
get_unsynced_orders()
mark_order_synced(id)

add_order_item(order_id, product_id, quantity, unit_price, total_price)

calculate_daily_summary(date)
```

---

## 💡 Code Examples

### Create Order from Cart
```typescript
async function handleCheckout(cartData) {
  // Create order
  const order = await invoke('create_order', {
    total_amount: cartData.total,
    payment_method: 'card',
  });

  // Add items
  for (const item of cartData.items) {
    await invoke('add_order_item', {
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    });
  }

  return order;
}
```

### Print Receipt
```typescript
import { BrowserPrinter } from './services/printer';

const printer = new BrowserPrinter({ 
  device_name: 'printer', 
  width_chars: 32 
});

await printer.printReceipt(order, items, 'Slip in Bloom');
```

### Get Daily Summary
```typescript
// Query database
const summary = await invoke('calculate_daily_summary', {
  date: '2026-05-06'
});

console.log(`Sales: $${(summary.total_sales / 100).toFixed(2)}`);
console.log(`Orders: ${summary.total_orders}`);
```

---

## 🐛 Debug Mode

### Enable Logging
```typescript
// In main.tsx
if (process.env.DEBUG) {
  console.log('Debug mode enabled');
}
```

### Check SQLite
```bash
# Access database
sqlite3 ~/.slip-in-bloom/pos.db

# See recent orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;

# Check sync status
SELECT COUNT(*) FROM orders WHERE sync_status = 'pending';
```

### Browser Console (F12)
```javascript
// Check sync status
console.log(syncStatus);

// Test Tauri command
window.__TAURI__.invoke('get_all_products')
  .then(products => console.log(products))
  .catch(err => console.error(err));
```

---

## 📦 Build & Deploy

### Build for Production
```bash
npm run tauri:build
```

Outputs:
- Windows: `.msi` installer (portable)
- macOS: `.dmg` (disk image)
- Linux: `.deb`, `.AppImage`

### Distribute
1. Get `.msi` from `src-tauri/target/release/bundle/`
2. Copy to USB or upload to server
3. Users run installer
4. App installs to `Program Files/Slip in Bloom`

---

## ⚙️ Configuration

### Environment Variables (.env.local)
```env
REACT_APP_SUPABASE_URL=https://xxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-key
REACT_APP_SHOP_NAME=Slip in Bloom
REACT_APP_SYNC_INTERVAL=30000
```

### Database Location
```
Windows:   %APPDATA%\slip-in-bloom\pos.db
macOS:     ~/Library/Application Support/slip-in-bloom/pos.db
Linux:     ~/.local/share/slip-in-bloom/pos.db
```

---

## 🚨 Common Errors & Fixes

### "Database is locked"
```bash
# Kill all instances
pkill -f slip-in-bloom

# Restart app
npm run tauri:dev
```

### "Tauri command not found"
```bash
# Ensure command is registered
# Check src-tauri/src/commands.rs for invoke definition
```

### "Sync fails"
```bash
# Check Supabase credentials in .env.local
# Verify network connection
# Check RLS policies in Supabase dashboard
```

### "Printer not working"
```typescript
// Test with MockPrinter first
const printer = new MockPrinter({ device_name: 'mock', width_chars: 32 });
```

---

## 📚 File Size Guide

```
React components      ~600 lines
TypeScript types      ~100 lines
Sync service         ~280 lines
Printer service      ~380 lines
Rust backend         ~650 lines
Total code           ~2000+ lines
Documentation        ~1000 lines
```

---

## 🎯 Performance Targets

```
Add to cart:        <5ms
Checkout:           <100ms
Daily summary:      <50ms
Background sync:    Non-blocking
Printer:            ~2-3 seconds per receipt
```

---

## 📖 Full Documentation

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete installation
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database design
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Architecture
- [README.md](../README.md) - Project overview
- [src/examples/QueryExamples.ts](../src/examples/QueryExamples.ts) - Real queries

---

## 🔗 Useful Links

- **Tauri Docs**: https://tauri.app/
- **React Docs**: https://react.dev/
- **Supabase Docs**: https://supabase.com/docs
- **SQLite Docs**: https://www.sqlite.org/docs.html
- **ESC/POS Printer**: https://en.wikipedia.org/wiki/Thermal_printer

---

## ✅ Before Going Live

- [ ] Test all keyboard shortcuts
- [ ] Test offline/online switching
- [ ] Print test receipt
- [ ] Check daily summary report
- [ ] Verify data syncs to Supabase
- [ ] Backup database
- [ ] Configure printer
- [ ] Train staff on shortcuts
- [ ] Set up monitoring/logging

---

**Ready? Start with:** `npm run tauri:dev`

**Need help?** Check the docs folder or review the code comments.

Good luck! 🍹
