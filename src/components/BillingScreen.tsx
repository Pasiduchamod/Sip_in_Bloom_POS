// src/components/BillingScreen.tsx
// Main POS billing interface - optimized for keyboard

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Product, Cart, CartItem, Order } from '../types';
import { formatPrice, parsePrice, getTodayDate } from '../services/db';
import { ThermalPrinter } from '../services/printer';
import { invoke } from '@tauri-apps/api/core';

interface BillingScreenProps {
  products: Product[];
  onCheckout: (order: { items: CartItem[]; total: number; payment_method: 'cash' | 'card' }) => Promise<void>;
  onAddProduct?: (product: { name: string; price: number; category: string; sku: string }) => Promise<void>;
  onUpdateProduct?: (product: {
    id: string;
    name: string;
    price: number;
    category: string;
    sku: string;
    is_available: boolean;
  }) => Promise<void>;
  onDeleteProduct?: (productId: string) => Promise<void>;
  onRefresh?: () => void;
}

export const BillingScreen: React.FC<BillingScreenProps> = ({
  products,
  onCheckout,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onRefresh,
}) => {
  const [cart, setCart] = useState<Cart>({ items: [], total: 0 });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [managerMode, setManagerMode] = useState<'add' | 'edit'>('add');
  const [editProductId, setEditProductId] = useState('');
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formAvailable, setFormAvailable] = useState(true);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [isCompactLayout, setIsCompactLayout] = useState(() => window.innerWidth < 1024);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [summaryTotal, setSummaryTotal] = useState(0);
  const [isSummaryConfirmOpen, setIsSummaryConfirmOpen] = useState(false);
  const [summaryConfirmInput, setSummaryConfirmInput] = useState('');
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [billItems, setBillItems] = useState<CartItem[]>([]);
  const [billTotal, setBillTotal] = useState(0);
  const [billPaymentMethod, setBillPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [billOrderNumber, setBillOrderNumber] = useState('');
  const [billOrderTime, setBillOrderTime] = useState<Date | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const categories = Array.from(new Set(products.map(p => p.category))).sort();
  const filteredProducts = selectedCategory
    ? products.filter(
        p =>
          p.category === selectedCategory &&
          p.is_available &&
          (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku || '').includes(searchTerm.trim()))
      )
    : products.filter(
        p =>
          p.is_available &&
          (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku || '').includes(searchTerm.trim()))
      );

  // Calculate cart total
  const calculateTotal = (items: CartItem[]) => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  // Add product to cart
  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    const safeQty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    setCart(prev => {
      const existingItem = prev.items.find(item => item.product_id === product.id);
      let newItems: CartItem[];

      if (existingItem) {
        newItems = prev.items.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + safeQty }
            : item
        );
      } else {
        newItems = [
          ...prev.items,
          {
            product_id: product.id,
            product_name: product.name,
            price: product.price,
            quantity: safeQty,
          },
        ];
      }

      return {
        items: newItems,
        total: calculateTotal(newItems),
      };
    });
  }, []);

  const handleSearchEnter = useCallback(() => {
    const input = searchTerm.trim();
    const match = input.match(/^(\d{3})(?:\*(\d+))?$/);
    if (!match) return;

    const code = match[1];
    const quantity = match[2] ? parseInt(match[2], 10) : 1;
    const product = products.find(p => p.is_available && p.sku === code);

    if (!product) {
      setAlertMessage(`No item found for code ${code}`);
      setAlertType('error');
      setIsAlertOpen(true);
      return;
    }

    addToCart(product, quantity);
    setSearchTerm('');
  }, [searchTerm, products, addToCart]);

  // Remove product from cart
  const removeFromCart = useCallback((product_id: string) => {
    setCart(prev => {
      const newItems = prev.items.filter(item => item.product_id !== product_id);
      return {
        items: newItems,
        total: calculateTotal(newItems),
      };
    });
  }, []);

  // Update quantity
  const updateQuantity = useCallback((product_id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(product_id);
      return;
    }

    setCart(prev => {
      const newItems = prev.items.map(item =>
        item.product_id === product_id ? { ...item, quantity } : item
      );
      return {
        items: newItems,
        total: calculateTotal(newItems),
      };
    });
  }, [removeFromCart]);

  // Clear cart
  const clearCart = useCallback(() => {
    setCart({ items: [], total: 0 });
  }, []);

  // Handle checkout - show bill confirmation
  const handleCheckout = useCallback(async () => {
    if (cart.items.length === 0) return;

    setIsLoading(true);
    try {
      await onCheckout({
        items: cart.items,
        total: cart.total,
        payment_method: paymentMethod,
      });
      
      // Show bill for confirmation and printing
      const orderNum = Math.floor(Math.random() * 10000000).toString().padStart(6, '0');
      setBillOrderNumber(orderNum);
      setBillOrderTime(new Date());
      setBillItems(cart.items);
      setBillTotal(cart.total);
      setBillPaymentMethod(paymentMethod);
      setIsBillOpen(true);
      
      // Update quick total display right away
      setSummaryTotal(prev => prev + cart.total);
      setDailySales(prev => [...prev, { total: cart.total }]);
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cart, paymentMethod, onCheckout]);

  const resetManagerForm = useCallback(() => {
    setFormName('');
    setFormCode('');
    setFormPrice('');
    setFormCategory('General');
    setFormAvailable(true);
    setManagerError(null);
  }, []);

  const handleGetSummary = useCallback(() => {
    setIsSummaryConfirmOpen(true);
    setSummaryConfirmInput('');
  }, []);

  const handleBillConfirm = useCallback(async () => {
    setIsPrinting(true);
    try {
      // Print bill
      const printer = new ThermalPrinter({
        device_name: 'default',
        width_chars: 42,
      });
      
      // Create mock order for printer
      const order: Order = {
        order_id: '',
        order_number: Math.floor(Math.random() * 10000).toString(),
        total: billTotal,
        payment_method: billPaymentMethod,
        order_date: new Date(),
        delivery_date: new Date(),
        customer_id: '',
        status: 'completed',
      };

      const items = billItems.map(item => ({
        order_item_id: '',
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        product: {} as Product,
      }));

      const result = await printer.printReceipt(order, items, 'Slip in Bloom POS');
      
      if (result.success) {
        // Clear cart and close bill on success
        clearCart();
        setIsBillOpen(false);
        setSearchTerm('');
        searchInputRef.current?.focus();
      } else {
        console.error('Print failed:', result.error);
      }
    } catch (error) {
      console.error('Print error:', error);
    } finally {
      setIsPrinting(false);
    }
  }, [billItems, billTotal, billPaymentMethod, clearCart]);

  const handleSummaryConfirm = useCallback(async () => {
    if (summaryConfirmInput.trim().toLowerCase() !== 'getsummary') {
      setAlertMessage('Incorrect confirmation. Type "GetSummery" to confirm.');
      setAlertType('error');
      setIsAlertOpen(true);
      return;
    }

    try {
      const summary: any = await invoke('calculate_daily_summary', { date: getTodayDate() });
      
      const summaryMessage = `
DAILY SALES SUMMARY
━━━━━━━━━━━━━━━━━━━━━━
Total Sales: ${formatPrice(summary.total_sales || 0)}
Total Transactions: ${summary.total_orders || 0}
Total Items Sold: ${summary.total_items_sold || 0}

Cash: ${formatPrice(summary.payment_cash || 0)}
Card: ${formatPrice(summary.payment_card || 0)}

Report generated successfully from Database.
    `.trim();

      setAlertMessage(summaryMessage);
      setAlertType('info');
      setIsAlertOpen(true);

      setIsSummaryConfirmOpen(false);
      setSummaryConfirmInput('');
    } catch (e: any) {
      console.error('Failed to get daily summary', e);
      setAlertMessage('Error getting summary from DB.');
      setAlertType('error');
      setIsAlertOpen(true);
    }
  }, [summaryConfirmInput]);

  const openAddManager = useCallback(() => {
    setManagerMode('add');
    setEditProductId('');
    resetManagerForm();
    setIsManagerOpen(true);
  }, [resetManagerForm]);

  const handleEditProductSelect = useCallback(
    (productId: string) => {
      setEditProductId(productId);
      const product = products.find(p => p.id === productId);
      if (!product) return;
      setFormName(product.name);
      setFormCode(product.sku || '');
      setFormPrice((product.price / 100).toFixed(2));
      setFormCategory(product.category);
      setFormAvailable(product.is_available);
      setManagerError(null);
    },
    [products]
  );

  const handleSaveManager = useCallback(() => {
    const code = formCode.trim();
    const name = formName.trim();
    const category = formCategory.trim() || 'General';
    const priceInCents = parsePrice(formPrice.trim() || '0');

    if (!name) {
      setManagerError('Item name is required');
      return;
    }
    if (!/^\d{3}$/.test(code)) {
      setManagerError('Item code must be exactly 3 digits (example: 000, 102)');
      return;
    }
    if (!formPrice.trim() || Number.isNaN(priceInCents) || priceInCents <= 0) {
      setManagerError('Enter a valid price greater than 0');
      return;
    }

    const save = async () => {
      try {
        if (managerMode === 'add') {
          if (!onAddProduct) {
            setManagerError('Add action is not available');
            return;
          }
          await onAddProduct({ name, category, price: priceInCents, sku: code });
          resetManagerForm();
        } else {
          if (!onUpdateProduct) {
            setManagerError('Edit action is not available');
            return;
          }
          if (!editProductId) {
            setManagerError('Select an item to edit');
            return;
          }
          await onUpdateProduct({
            id: editProductId,
            name,
            category,
            price: priceInCents,
            sku: code,
            is_available: formAvailable,
          });
        }
        setManagerError(null);
        setIsManagerOpen(false);
      } catch (error) {
        setManagerError(error instanceof Error ? error.message : 'Failed to save item');
      }
    };

    save();
  }, [
    formCode,
    formName,
    formCategory,
    formPrice,
    managerMode,
    onAddProduct,
    onUpdateProduct,
    editProductId,
    formAvailable,
    resetManagerForm,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + E: Checkout
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleCheckout();
      }

      // Ctrl/Cmd + C: Clear cart
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        clearCart();
      }

      // Ctrl/Cmd + S: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Ctrl/Cmd + Z: Previous payment method
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        setPaymentMethod(prev => prev === 'cash' ? 'card' : 'cash');
      }

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCheckout, clearCart]);

  useEffect(() => {
    const handleResize = () => setIsCompactLayout(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const containerStyle: React.CSSProperties = {
    ...styles.container,
    flexDirection: isCompactLayout ? 'column' : 'row',
  };

  const leftPanelStyle: React.CSSProperties = {
    ...styles.leftPanel,
    borderRight: isCompactLayout ? 'none' : styles.leftPanel.borderRight,
    borderBottom: isCompactLayout ? '1px solid #ddd' : 'none',
  };

  const rightPanelStyle: React.CSSProperties = {
    ...styles.rightPanel,
    width: isCompactLayout ? '100%' : styles.rightPanel.width,
    maxHeight: isCompactLayout ? '45%' : 'none',
    borderLeft: isCompactLayout ? 'none' : styles.rightPanel.borderLeft,
  };

  const cartItemStyle: React.CSSProperties = {
    ...styles.cartItem,
    gridTemplateColumns: isCompactLayout ? '1fr auto auto 32px' : styles.cartItem.gridTemplateColumns,
  };

  // Fetch the summary totals right on mount so it's correct across reloads
  useEffect(() => {
    invoke('calculate_daily_summary', { date: getTodayDate() }).then((res: any) => {
      setSummaryTotal(res.total_sales || 0);
      setDailySales(new Array(res.total_orders || 0).fill({}));
    }).catch(console.error);
  }, []);

  return (
    <div style={containerStyle}>
      {/* Left: Product Selection */}
      <div style={leftPanelStyle}>
        <div style={styles.header}>
          <h1 style={styles.title}>Mocktail POS</h1>
          <div style={styles.searchBox}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search or enter code like 102 or 102*3, then Enter"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchEnter();
                }
              }}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.managerActions}>
            <button onClick={openAddManager} style={styles.managerBtn}>
              Add/Edit Item
            </button>
          </div>
        </div>

        {/* Categories */}
        <div style={styles.categories}>
          <button
            style={{
              ...styles.categoryBtn,
              ...(selectedCategory === '' ? styles.categoryBtnActive : {}),
            }}
            onClick={() => {
              setSelectedCategory('');
              setSearchTerm('');
            }}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              style={{
                ...styles.categoryBtn,
                ...(selectedCategory === cat ? styles.categoryBtnActive : {}),
              }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div style={styles.productsGrid}>
          {filteredProducts.map((product, idx) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              style={styles.productBtn}
              title={`Press ${idx + 1} to add`}
            >
              <div style={styles.productCode}>{product.sku ? `Code: ${product.sku}` : 'Code: ---'}</div>
              <div style={styles.productName}>{product.name}</div>
              <div style={styles.productPrice}>{formatPrice(product.price)}</div>
              <div style={styles.productHint}>{idx < 9 ? `[${idx + 1}]` : ''}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Cart */}
      <div style={rightPanelStyle}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          <img src="/logo.png" alt="Slip in Bloom" style={styles.logo} />
        </div>

        <h2 style={styles.cartTitle}>Cart</h2>

        {/* Cart Items */}
        <div style={styles.cartItems}>
          {cart.items.length === 0 ? (
            <div style={styles.emptyCart}>Add items to cart</div>
          ) : (
            cart.items.map((item, idx) => (
              <div key={item.product_id} style={cartItemStyle}>
                <div style={styles.itemInfo}>
                  <div style={styles.itemName}>{item.product_name}</div>
                  <div style={styles.itemPrice}>{formatPrice(item.price)}</div>
                </div>
                <div style={styles.quantityControl}>
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                    style={styles.quantityBtn}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateQuantity(item.product_id, parseInt(e.target.value) || 1)}
                    style={styles.quantityInput}
                  />
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    style={styles.quantityBtn}
                  >
                    +
                  </button>
                </div>
                <div style={styles.itemTotal}>{formatPrice(item.price * item.quantity)}</div>
                <button
                  onClick={() => removeFromCart(item.product_id)}
                  style={styles.removeBtn}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Divider */}
        <div style={styles.divider}></div>

        {/* Total */}
        <div style={styles.totalSection}>
          <div style={styles.totalLabel}>Total:</div>
          <div style={styles.totalAmount}>{formatPrice(cart.total)}</div>
        </div>

        {/* Payment Method */}
        <div style={styles.paymentSection}>
          <label style={styles.label}>Payment (Ctrl+Z):</label>
          <div style={styles.paymentButtons}>
            <button
              onClick={() => setPaymentMethod('cash')}
              style={{
                ...styles.paymentBtn,
                ...(paymentMethod === 'cash' ? styles.paymentBtnActive : {}),
              }}
            >
              Cash
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              style={{
                ...styles.paymentBtn,
                ...(paymentMethod === 'card' ? styles.paymentBtnActive : {}),
              }}
            >
              Card
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button
            onClick={handleCheckout}
            disabled={cart.items.length === 0 || isLoading}
            style={{
              ...styles.checkoutBtn,
              ...(cart.items.length === 0 || isLoading ? styles.btnDisabled : {}),
            }}
          >
            {isLoading ? 'Processing...' : 'Checkout (Ctrl+E)'}
          </button>
          <button
            onClick={clearCart}
            disabled={cart.items.length === 0}
            style={{
              ...styles.clearBtn,
              ...(cart.items.length === 0 ? styles.btnDisabled : {}),
            }}
          >
            Clear (Ctrl+C)
          </button>
        </div>

        {/* Today Sales Summary */}
        {summaryTotal > 0 && (
          <div style={styles.summaryInfo}>
            Today: {formatPrice(summaryTotal)} ({dailySales.length} sales)
          </div>
        )}

        {/* Summary Button */}
        <div style={styles.summarySection}>
          <button onClick={handleGetSummary} style={styles.summaryBtn}>
            Get Daily Summary
          </button>
        </div>
      </div>

      {isManagerOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalWindow}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Manager Item Window</h3>
              <button onClick={() => setIsManagerOpen(false)} style={styles.modalCloseBtn}>
                Close
              </button>
            </div>

            <div style={styles.modalModeSwitch}>
              <button
                onClick={() => {
                  setManagerMode('add');
                  setEditProductId('');
                  resetManagerForm();
                }}
                style={{
                  ...styles.modeBtn,
                  ...(managerMode === 'add' ? styles.modeBtnActive : {}),
                }}
              >
                Add New
              </button>
              <button
                onClick={() => {
                  setManagerMode('edit');
                  if (products[0]) {
                    handleEditProductSelect(products[0].id);
                  }
                }}
                style={{
                  ...styles.modeBtn,
                  ...(managerMode === 'edit' ? styles.modeBtnActive : {}),
                }}
                disabled={products.length === 0}
              >
                Edit Existing
              </button>
            </div>

            {managerMode === 'edit' && (
              <div style={styles.modalFieldGroup}>
                <label style={styles.modalLabel}>Select Item</label>
                <select
                  value={editProductId}
                  onChange={e => handleEditProductSelect(e.target.value)}
                  style={styles.modalSelect}
                >
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {(product.sku || '---') + ' - ' + product.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={styles.modalGrid}>
              <div style={styles.modalFieldGroup}>
                <label style={styles.modalLabel}>Item Name</label>
                <input value={formName} onChange={e => setFormName(e.target.value)} style={styles.modalInput} />
              </div>

              <div style={styles.modalFieldGroup}>
                <label style={styles.modalLabel}>3-Digit Code</label>
                <input
                  value={formCode}
                  maxLength={3}
                  onChange={e => setFormCode(e.target.value.replace(/\D/g, ''))}
                  style={styles.modalInput}
                  placeholder="000"
                />
              </div>

              <div style={styles.modalFieldGroup}>
                <label style={styles.modalLabel}>Price (LKR)</label>
                <input
                  value={formPrice}
                  onChange={e => setFormPrice(e.target.value)}
                  style={styles.modalInput}
                  placeholder="0.00"
                />
              </div>

              <div style={styles.modalFieldGroup}>
                <label style={styles.modalLabel}>Category</label>
                <input
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  style={styles.modalInput}
                  placeholder="General"
                />
              </div>
            </div>

            {managerMode === 'edit' && (
              <div style={styles.modalCheckboxRow}>
                <input
                  id="available-checkbox"
                  type="checkbox"
                  checked={formAvailable}
                  onChange={e => setFormAvailable(e.target.checked)}
                />
                <label htmlFor="available-checkbox" style={styles.modalCheckboxLabel}>
                  Item available for sale
                </label>
              </div>
            )}

            {managerError && <div style={styles.errorText}>{managerError}</div>}

            <div style={styles.modalFooter}>
              {managerMode === 'edit' && (
                <button
                  onClick={() => {
                    if (!onDeleteProduct) {
                      setManagerError('Delete action is not available');
                      return;
                    }
                    if (!editProductId) {
                      setManagerError('Select an item to delete');
                      return;
                    }
                    if (!window.confirm('Delete this item? This cannot be undone.')) {
                      return;
                    }
                    const performDelete = async () => {
                      try {
                        await onDeleteProduct(editProductId);
                        setManagerError(null);
                        setIsManagerOpen(false);
                      } catch (error) {
                        setManagerError(error instanceof Error ? error.message : 'Failed to delete item');
                      }
                    };
                    performDelete();
                  }}
                  style={styles.modalDeleteBtn}
                >
                  Delete Item
                </button>
              )}
              <button onClick={handleSaveManager} style={styles.modalSaveBtn}>
                {managerMode === 'add' ? 'Add Item' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Confirmation Modal */}
      {isSummaryConfirmOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalWindow}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Get Daily Summary</h3>
              <button onClick={() => setIsSummaryConfirmOpen(false)} style={styles.modalCloseBtn}>
                Close
              </button>
            </div>

            <div style={styles.summaryConfirmContent}>
              <p style={styles.summaryConfirmText}>
                Type <strong>"GetSummary"</strong> to confirm and reset sales data:
              </p>
              <input
                type="text"
                placeholder='Type "GetSummary" to confirm'
                value={summaryConfirmInput}
                onChange={e => setSummaryConfirmInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSummaryConfirm();
                  }
                }}
                style={styles.summaryConfirmInput}
              />
              <p style={styles.summaryWarning}>
                ⚠️ This will display the summary and reset all sales data to zero.
              </p>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={handleSummaryConfirm} style={styles.modalSaveBtn}>
                Get Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Confirmation Modal */}
      {isBillOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.billModalWindow}>
            <div style={styles.billHeader}>
              <img src="/logo.png" alt="Slip in Bloom" style={styles.billLogo} />
              <h3 style={styles.billTitle}>Order Confirmation</h3>
            </div>

            <div style={styles.billContent}>
              {/* Order Details Header */}
              <div style={styles.billInfoSection}>
                <div style={styles.billInfoRow}>
                  <span style={styles.billInfoLabel}>Order #:</span>
                  <span style={styles.billInfoValue}>{billOrderNumber}</span>
                </div>
                <div style={styles.billInfoRow}>
                  <span style={styles.billInfoLabel}>Date & Time:</span>
                  <span style={styles.billInfoValue}>
                    {billOrderTime?.toLocaleDateString()} {billOrderTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div style={styles.billDivider}></div>

              {/* Items */}
              <div style={styles.billItemsSection}>
                <div style={styles.billItemsHeader}>
                  <span style={styles.billItemName}>Item</span>
                  <span style={styles.billItemQty}>Qty</span>
                  <span style={styles.billItemUnitPrice}>Unit Price</span>
                  <span style={styles.billItemPrice}>Amount</span>
                </div>
                {billItems.map((item, idx) => (
                  <div key={idx} style={styles.billItem}>
                    <span style={styles.billItemName}>{item.product_name}</span>
                    <span style={styles.billItemQty}>{item.quantity}</span>
                    <span style={styles.billItemUnitPrice}>{formatPrice(item.price)}</span>
                    <span style={styles.billItemPrice}>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div style={styles.billDivider}></div>

              {/* Summary */}
              <div style={styles.billSummarySection}>
                <div style={styles.billTotalRow}>
                  <span style={styles.billTotalLabel}>Total Amount:</span>
                  <span style={styles.billTotalValue}>{formatPrice(billTotal)}</span>
                </div>
                <div style={styles.billPaymentRow}>
                  <span style={styles.billPaymentLabel}>Payment Method:</span>
                  <span style={styles.billPaymentValue}>{billPaymentMethod.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={styles.modalFooter}>
              <button
                onClick={() => setIsBillOpen(false)}
                style={styles.modalCancelBtn}
                disabled={isPrinting}
              >
                Cancel
              </button>
              <button
                onClick={handleBillConfirm}
                style={styles.modalPrintBtn}
                disabled={isPrinting}
              >
                {isPrinting ? 'Printing...' : 'Confirm & Print'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  container: {
    display: 'flex',
    height: '100%',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    background: '#f5f5f5',
  } as React.CSSProperties,

  leftPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#fff',
    borderRight: '1px solid #ddd',
    overflow: 'hidden',
  } as React.CSSProperties,

  rightPanel: {
    width: '350px',
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#fff',
    borderLeft: '1px solid #ddd',
    padding: '16px',
    gap: '12px',
    overflow: 'hidden',
  } as React.CSSProperties,

  header: {
    padding: '16px',
    borderBottom: '1px solid #eee',
  } as React.CSSProperties,

  managerActions: {
    marginTop: '10px',
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  } as React.CSSProperties,

  managerBtn: {
    padding: '8px 12px',
    border: '1px solid #2196F3',
    borderRadius: '4px',
    background: '#2196F3',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  errorText: {
    marginTop: '6px',
    color: '#c62828',
    fontSize: '12px',
    fontWeight: '500',
  } as React.CSSProperties,

  title: {
    margin: '0 0 12px 0',
    fontSize: '20px',
    fontWeight: 'bold',
  } as React.CSSProperties,

  searchBox: {
    display: 'flex',
  } as React.CSSProperties,

  searchInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  } as React.CSSProperties,

  categories: {
    display: 'flex',
    gap: '8px',
    padding: '0 16px 12px',
    overflowX: 'auto' as const,
    borderBottom: '1px solid #eee',
  } as React.CSSProperties,

  categoryBtn: {
    padding: '6px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.2s',
  } as React.CSSProperties,

  categoryBtnActive: {
    background: '#2196F3',
    color: '#fff',
    border: '1px solid #2196F3',
  } as React.CSSProperties,

  productsGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '8px',
    padding: '12px',
    overflow: 'auto' as const,
  } as React.CSSProperties,

  productBtn: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: 'all 0.15s',
    fontSize: '13px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  } as React.CSSProperties,

  productName: {
    fontWeight: '500',
    fontSize: '12px',
  } as React.CSSProperties,

  productCode: {
    fontSize: '10px',
    color: '#666',
    fontWeight: '600',
    letterSpacing: '0.04em',
  } as React.CSSProperties,

  productPrice: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#2196F3',
  } as React.CSSProperties,

  productHint: {
    fontSize: '10px',
    color: '#999',
  } as React.CSSProperties,

  cartTitle: {
    margin: '0',
    fontSize: '16px',
    fontWeight: 'bold',
  } as React.CSSProperties,

  cartItems: {
    flex: 1,
    overflow: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    fontSize: '13px',
  } as React.CSSProperties,

  emptyCart: {
    textAlign: 'center' as const,
    color: '#999',
    paddingTop: '20px',
  } as React.CSSProperties,

  cartItem: {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto 40px',
    gap: '6px',
    alignItems: 'center',
    padding: '8px',
    background: '#f9f9f9',
    borderRadius: '4px',
    fontSize: '12px',
  } as React.CSSProperties,

  itemInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  } as React.CSSProperties,

  itemName: {
    fontWeight: '500',
  } as React.CSSProperties,

  itemPrice: {
    fontSize: '11px',
    color: '#666',
  } as React.CSSProperties,

  quantityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  } as React.CSSProperties,

  quantityBtn: {
    width: '22px',
    height: '22px',
    padding: '0',
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    borderRadius: '2px',
  } as React.CSSProperties,

  quantityInput: {
    width: '30px',
    height: '22px',
    padding: '2px',
    border: '1px solid #ddd',
    borderRadius: '2px',
    textAlign: 'center' as const,
    fontSize: '12px',
  } as React.CSSProperties,

  itemTotal: {
    fontWeight: 'bold',
    textAlign: 'right' as const,
  } as React.CSSProperties,

  removeBtn: {
    width: '24px',
    height: '24px',
    padding: '0',
    border: '1px solid #ddd',
    background: '#ff4444',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    borderRadius: '2px',
  } as React.CSSProperties,

  divider: {
    height: '1px',
    background: '#ddd',
  } as React.CSSProperties,

  totalSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
    padding: '8px',
  } as React.CSSProperties,

  totalLabel: {
    flex: 1,
  } as React.CSSProperties,

  totalAmount: {
    fontSize: '20px',
    color: '#2196F3',
  } as React.CSSProperties,

  paymentSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  } as React.CSSProperties,

  label: {
    fontSize: '12px',
    fontWeight: '500',
  } as React.CSSProperties,

  paymentButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
  } as React.CSSProperties,

  paymentBtn: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  paymentBtnActive: {
    background: '#4CAF50',
    color: '#fff',
    border: '1px solid #4CAF50',
  } as React.CSSProperties,

  actions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
  } as React.CSSProperties,

  checkoutBtn: {
    padding: '12px',
    background: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  clearBtn: {
    padding: '12px',
    background: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,

  hints: {
    fontSize: '11px',
    color: '#999',
    background: '#f9f9f9',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #eee',
  } as React.CSSProperties,

  hintText: {
    margin: '2px 0',
  } as React.CSSProperties,

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '16px',
  } as React.CSSProperties,

  modalWindow: {
    width: 'min(720px, 100%)',
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #ddd',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  } as React.CSSProperties,

  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,

  modalTitle: {
    margin: 0,
    fontSize: '18px',
  } as React.CSSProperties,

  modalCloseBtn: {
    padding: '8px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: '600',
  } as React.CSSProperties,

  modalModeSwitch: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,

  modeBtn: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: '600',
  } as React.CSSProperties,

  modeBtnActive: {
    background: '#1E88E5',
    color: '#fff',
    border: '1px solid #1E88E5',
  } as React.CSSProperties,

  modalGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  } as React.CSSProperties,

  modalFieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  } as React.CSSProperties,

  modalLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#333',
  } as React.CSSProperties,

  modalInput: {
    width: '100%',
    padding: '9px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
  } as React.CSSProperties,

  modalSelect: {
    width: '100%',
    padding: '9px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
    background: '#fff',
  } as React.CSSProperties,

  modalCheckboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,

  modalCheckboxLabel: {
    fontSize: '13px',
    color: '#333',
  } as React.CSSProperties,

  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px',
    borderTop: '1px solid #eee',
    background: '#fafafa',
    flexShrink: 0,
  } as React.CSSProperties,

  modalDeleteBtn: {
    padding: '10px 16px',
    border: '1px solid #c62828',
    borderRadius: '4px',
    background: '#fff',
    color: '#c62828',
    fontWeight: '700',
    cursor: 'pointer',
    minWidth: '80px',
  } as React.CSSProperties,

  modalSaveBtn: {
    padding: '10px 16px',
    border: '1px solid #2E7D32',
    borderRadius: '4px',
    background: '#2E7D32',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer',
    minWidth: '80px',
  } as React.CSSProperties,

  summarySection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  } as React.CSSProperties,

  summaryBtn: {
    padding: '10px',
    background: '#FF9800',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  summaryInfo: {
    fontSize: '12px',
    color: '#666',
    background: '#f9f9f9',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #eee',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  summaryConfirmContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  } as React.CSSProperties,

  summaryConfirmText: {
    fontSize: '14px',
    color: '#333',
    margin: 0,
  } as React.CSSProperties,

  summaryConfirmInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  } as React.CSSProperties,

  summaryWarning: {
    fontSize: '12px',
    color: '#c62828',
    margin: 0,
    padding: '8px',
    background: '#ffebee',
    borderRadius: '4px',
    border: '1px solid #ef5350',
  } as React.CSSProperties,

  billModalWindow: {
    background: '#fff',
    borderRadius: '8px',
    width: '620px',
    maxHeight: '80vh',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  } as React.CSSProperties,

  billHeader: {
    padding: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #eee',
    background: '#fafafa',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    flexShrink: 0,
  } as React.CSSProperties,

  billTitle: {
    margin: '8px 0 0 0',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#333',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  billLogo: {
    maxHeight: '45px',
    maxWidth: '100%',
    objectFit: 'contain' as const,
    marginBottom: '6px',
    display: 'block' as const,
  } as React.CSSProperties,

  logoContainer: {
    textAlign: 'center' as const,
    marginBottom: '12px',
    paddingBottom: '10px',
    borderBottom: '1px solid #eee',
  } as React.CSSProperties,

  logo: {
    maxHeight: '70px',
    maxWidth: '100%',
    objectFit: 'contain' as const,
  } as React.CSSProperties,

  billContent: {
    flex: 1,
    overflow: 'auto' as const,
    padding: '16px',
    paddingBottom: '20px',
  } as React.CSSProperties,

  billInfoSection: {
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '2px solid #f0f0f0',
  } as React.CSSProperties,

  billInfoRow: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    padding: '6px 0',
    fontSize: '13px',
  } as React.CSSProperties,

  billInfoLabel: {
    fontWeight: '600' as const,
    color: '#555',
  } as React.CSSProperties,

  billInfoValue: {
    color: '#333',
    fontWeight: '500' as const,
  } as React.CSSProperties,

  billItemsSection: {
    marginBottom: '12px',
  } as React.CSSProperties,

  billItemsHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 60px 100px 100px',
    gap: '10px',
    padding: '10px 0',
    borderBottom: '2px solid #333',
    fontWeight: 'bold' as const,
    fontSize: '13px',
    color: '#333',
    marginBottom: '10px',
  } as React.CSSProperties,

  billItem: {
    display: 'grid',
    gridTemplateColumns: '2fr 60px 100px 100px',
    gap: '10px',
    padding: '10px 0',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '13px',
    alignItems: 'center' as const,
  } as React.CSSProperties,

  billItemName: {
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  billItemQty: {
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  } as React.CSSProperties,

  billItemUnitPrice: {
    textAlign: 'right' as const,
    color: '#666',
  } as React.CSSProperties,

  billItemPrice: {
    textAlign: 'right' as const,
    fontWeight: 'bold' as const,
  } as React.CSSProperties,

  billDivider: {
    height: '2px',
    background: '#333',
    margin: '12px 0',
  } as React.CSSProperties,

  billSummarySection: {
    marginTop: '12px',
  } as React.CSSProperties,

  billTotalRow: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    padding: '12px 0',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#000',
  } as React.CSSProperties,

  billTotalLabel: {
    textAlign: 'left' as const,
  } as React.CSSProperties,

  billTotalValue: {
    textAlign: 'right' as const,
    color: '#FF9800',
  } as React.CSSProperties,

  billPaymentRow: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    padding: '8px 0',
    fontSize: '14px',
    color: '#555',
  } as React.CSSProperties,

  billPaymentLabel: {
    textAlign: 'left' as const,
  } as React.CSSProperties,

  billPaymentValue: {
    textAlign: 'right' as const,
    fontWeight: 'bold' as const,
  } as React.CSSProperties,

  modalPrintBtn: {
    padding: '10px 20px',
    border: '1px solid #FF9800',
    borderRadius: '4px',
    background: '#FF9800',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer',
    minWidth: '120px',
  } as React.CSSProperties,

  modalCancelBtn: {
    padding: '10px 20px',
    border: '1px solid #999',
    borderRadius: '4px',
    background: '#f5f5f5',
    color: '#333',
    fontWeight: '700',
    cursor: 'pointer',
    minWidth: '90px',
  } as React.CSSProperties,
};
