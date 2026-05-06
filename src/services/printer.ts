// src/services/printer.ts
// ESC/POS thermal printer integration

import type { Order, OrderItem, Product, PrinterConfig } from '../types';

/**
 * ESC/POS Thermal Printer Service
 * 
 * Supports 58mm and 80mm thermal printers
 * Uses ESC/POS command set (industry standard)
 */
export class ThermalPrinter {
  private device: any; // USB device or serial port
  private config: PrinterConfig;

  constructor(config: PrinterConfig) {
    this.config = config;
  }

  /**
   * Connect to printer (USB or Serial)
   */
  public async connect(): Promise<void> {
    // Implementation depends on platform (Tauri command or Web USB)
    // For now, we'll use Tauri to handle this
    console.log(`Connecting to printer: ${this.config.device_name}`);
  }

  /**
   * Disconnect from printer
   */
  public async disconnect(): Promise<void> {
    console.log('Disconnecting printer');
  }

  /**
   * Generate receipt ESC/POS commands
   */
  public generateReceiptCommands(
    order: Order,
    items: (OrderItem & { product: Product })[],
    shopName: string
  ): Uint8Array {
    const commands: number[] = [];

    // Initialize printer
    commands.push(...this.initPrinter());

    // Header with logo
    if (this.config.logo) {
      commands.push(...this.printLogo(this.config.logo));
    }

    // Shop name centered
    commands.push(...this.printCentered(shopName));
    commands.push(...this.newlines(1));

    // Date and order number
    const now = new Date();
    const dateStr = now.toLocaleString();
    commands.push(...this.printCentered(`Order #${order.order_number}`));
    commands.push(...this.printCentered(dateStr));
    commands.push(...this.newlines(1));

    // Divider
    commands.push(...this.printDivider());

    // Items header
    commands.push(...this.printItemsHeader());

    // Items
    for (const item of items) {
      commands.push(...this.printItem(item));
    }

    // Divider
    commands.push(...this.printDivider());

    // Total
    commands.push(...this.printTotal(order));
    commands.push(...this.newlines(1));

    // Payment method
    commands.push(...this.printCentered(`Payment: ${order.payment_method.toUpperCase()}`));
    commands.push(...this.newlines(1));

    // Footer
    commands.push(...this.printCentered('Thank you!'));
    commands.push(...this.printCentered('Come again!'));
    commands.push(...this.newlines(2));

    // Cut paper
    commands.push(...this.cutPaper());

    return new Uint8Array(commands);
  }

  /**
   * Send commands to printer
   */
  public async print(commands: Uint8Array): Promise<void> {
    // This would call a Tauri command that handles USB/Serial communication
    // For Tauri: invoke('send_to_printer', { data: Array.from(commands) })
    console.log('Sending', commands.length, 'bytes to printer');
  }

  /**
   * Print receipt and return status
   */
  public async printReceipt(
    order: Order,
    items: (OrderItem & { product: Product })[],
    shopName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.connect();
      const commands = this.generateReceiptCommands(order, items, shopName);
      await this.print(commands);
      await this.disconnect();
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Printer error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  // ============ ESC/POS Commands ============

  private initPrinter(): number[] {
    // ESC @ - Initialize printer
    return [0x1b, 0x40];
  }

  private newlines(count: number): number[] {
    return Array(count).fill(0x0a);
  }

  private printDivider(): number[] {
    const divider = '─'.repeat(this.config.width_chars);
    return this.textToBytes(divider + '\n');
  }

  private printCentered(text: string): number[] {
    // ESC a - Set alignment (1 = center)
    const commands = [0x1b, 0x61, 0x01]; // Center alignment
    commands.push(...this.textToBytes(text + '\n'));
    commands.push(...[0x1b, 0x61, 0x00]); // Left alignment
    return commands;
  }

  private printItemsHeader(): number[] {
    const width = this.config.width_chars;
    const line = `${'Item'.padEnd(width - 15)} ${'Qty'.padEnd(5)} ${'Price'.padEnd(8)} ${'Total'}\n`;
    return this.textToBytes(line);
  }

  private printItem(item: OrderItem & { product: Product }): number[] {
    const width = this.config.width_chars;
    const itemName = item.product.name.substring(0, width - 15);
    const qty = item.quantity.toString().padEnd(5);
    const price = this.formatPrice(item.unit_price).padEnd(8);
    const total = this.formatPrice(item.total_price);

    const line = `${itemName.padEnd(width - 15)}${qty}${price}${total}\n`;
    return this.textToBytes(line);
  }

  private printTotal(order: Order): number[] {
    const commands = [0x1b, 0x21, 0x30]; // Double height
    const total = `TOTAL: ${this.formatPrice(order.total_amount)}\n`;
    commands.push(...this.textToBytes(total));
    commands.push(...[0x1b, 0x21, 0x00]); // Normal size
    return commands;
  }

  private printLogo(logoPath: string): number[] {
    // TODO: Implement logo printing (would require image processing)
    // For now, return empty
    return [];
  }

  private cutPaper(): number[] {
    // ESC i - Partial cut
    return [0x1b, 0x69];
  }

  private formatPrice(cents: number): string {
    return `LKR ${(cents / 100).toFixed(2)}`;
  }

  private textToBytes(text: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < text.length; i++) {
      bytes.push(text.charCodeAt(i));
    }
    return bytes;
  }
}

/**
 * Mock printer for testing
 */
export class MockPrinter extends ThermalPrinter {
  public async print(commands: Uint8Array): Promise<void> {
    console.log('MOCK PRINTER OUTPUT:');
    console.log('─'.repeat(32));
    // Decode and log the commands as text
    let output = '';
    for (let i = 0; i < commands.length; i++) {
      const byte = commands[i];
      if (byte === 0x0a) {
        output += '\n';
      } else if (byte >= 32 && byte <= 126) {
        output += String.fromCharCode(byte);
      }
    }
    console.log(output);
    console.log('─'.repeat(32));
  }
}

/**
 * Browser Print Service (fallback for web/debug)
 */
export class BrowserPrinter extends ThermalPrinter {
  public async printReceipt(
    order: any,
    items: any[],
    shopName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const html = this.generateReceiptHTML(order, items, shopName);
      const printWindow = window.open('', '', 'height=400,width=600');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
        return { success: true };
      }
      return { success: false, error: 'Failed to open print window' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }

  private generateReceiptHTML(order: any, items: any[], shopName: string): string {
    const dateStr = new Date(order.created_at).toLocaleString();
    const itemsHTML = items.map(item => `
      <tr>
        <td>${item.product.name}</td>
        <td align="right">${item.quantity}</td>
        <td align="right">LKR ${(item.unit_price / 100).toFixed(2)}</td>
        <td align="right">LKR ${(item.total_price / 100).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt #${order.order_number}</title>
        <style>
          body {
            font-family: monospace;
            font-size: 12px;
            margin: 20px;
            max-width: 300px;
          }
          table { width: 100%; }
          th, td { text-align: left; padding: 4px 0; }
          .center { text-align: center; }
          .divider { border-top: 1px solid #000; margin: 10px 0; }
          .total { font-weight: bold; font-size: 16px; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="center"><h2>${shopName}</h2></div>
        <div class="center">Order #${order.order_number}</div>
        <div class="center">${dateStr}</div>
        <div class="divider"></div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th align="right">Qty</th>
              <th align="right">Price</th>
              <th align="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <div class="divider"></div>
        <div class="total center">
          TOTAL: LKR ${(order.total_amount / 100).toFixed(2)}
        </div>
        <div class="center" style="margin-top: 20px;">
          Payment: ${order.payment_method.toUpperCase()}
        </div>
        <div class="center" style="margin-top: 20px;">
          <p>Thank you!</p>
          <p>Come again!</p>
        </div>
      </body>
      </html>
    `;
  }
}
