// ./src/services/printerService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import BluetoothClassic from 'react-native-bluetooth-classic';

const STORAGE_KEY = '@selected_printer';

class PrinterService {
  constructor() {
    this.connectedPrinter = null;
    this.isPrinting = false;
  }

  // Load stored printer from AsyncStorage
  async loadStoredPrinter() {
    try {
      const storedPrinter = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedPrinter) {
        this.connectedPrinter = JSON.parse(storedPrinter);
        console.log('Loaded stored printer:', this.connectedPrinter);
        return this.connectedPrinter;
      } else {
        // Fallback to default printer
        const defaultPrinter = {
          address: '5A:4A:D4:66:D2:A4',
          name: 'VOZY P50',
          type: 'Classic'
        };
        this.connectedPrinter = defaultPrinter;
        console.log('Using fallback printer:', defaultPrinter);
        return defaultPrinter;
      }
    } catch (error) {
      console.error('Error loading stored printer:', error);
      // Use fallback printer on error
      const fallbackPrinter = {
        address: '5A:4A:D4:66:D2:A4',
        name: 'VOZY P50',
        type: 'Classic'
      };
      this.connectedPrinter = fallbackPrinter;
      return fallbackPrinter;
    }
  }

  // Get current printer
  getCurrentPrinter() {
    return this.connectedPrinter;
  }

  // Check if printer is available
  isPrinterAvailable() {
    return this.connectedPrinter !== null;
  }

  // Check if printer is required for transactions
  async isPrinterRequired() {
    try {
      const setting = await AsyncStorage.getItem('printer_required');
      return setting !== null ? JSON.parse(setting) : true; // Default to true
    } catch (error) {
      console.error('Error checking printer requirement:', error);
      return true; // Default to true on error
    }
  }

  // Print receipt function
  async printReceipt(paymentData, cart = []) {
    if (!this.connectedPrinter || this.isPrinting) {
      console.log('No printer available or already printing');
      return { success: false, error: 'Printer not available or busy' };
    }

    this.isPrinting = true;
    console.log('Printing receipt for payment:', paymentData);

    try {
      // Connect to printer
      const connection = await BluetoothClassic.connectToDevice(this.connectedPrinter.address);
      console.log('Connected to printer for receipt');

      // Create receipt content
      const receiptData = this.createReceiptData(paymentData, cart);

      // Send receipt to printer
      await connection.write(receiptData);
      console.log('Receipt sent to printer');

      // Disconnect
      await connection.disconnect();
      console.log('Printer disconnected');

      return { success: true };

    } catch (error) {
      console.error('Printing failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isPrinting = false;
    }
  }

  // Print test receipt
  async printTestReceipt() {
    if (!this.connectedPrinter) {
      return { success: false, error: 'No printer selected' };
    }

    const testPaymentData = {
      method: 'Test',
      total: 0,
      transactionId: 'TEST-' + Date.now()
    };

    try {
      this.isPrinting = true;
      
      const connection = await BluetoothClassic.connectToDevice(this.connectedPrinter.address);
      const testReceipt = this.createTestReceipt();
      
      await connection.write(testReceipt);
      await connection.disconnect();
      
      return { success: true };
    } catch (error) {
      console.error('Test print failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isPrinting = false;
    }
  }

  // Create ESC/POS receipt data
  createReceiptData(paymentData, cart = []) {
    const now = new Date();
    const dateStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}`;

    // Format time manually to avoid encoding issues
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const timeStr = `${hours}:${minutes} ${ampm}`;

    let receiptText = '';

    // Initialize printer
    receiptText += '\x1B\x40'; // ESC @ - Initialize

    // Header
    receiptText += '\x1B\x61\x01'; // Center align
    receiptText += `ORDER RECEIPT #${paymentData.transactionId || 'N/A'}\n`;
    receiptText += `${dateStr}\n`;
    receiptText += `${timeStr}\n`;
    receiptText += '\x1B\x61\x00'; // Left align
    receiptText += '\n';

    // Items (if cart is provided)
    if (cart && cart.length > 0) {
      cart.forEach(item => {
        const itemTotal = item.quantity * item.price;
        receiptText += `${item.quantity}x ${item.name} P${item.price.toFixed(2)}\n`;
      });

      // Calculate total cups
      const totalCups = cart.reduce((sum, item) => sum + item.quantity, 0);
      receiptText += `${totalCups} items\n`;
      receiptText += '\n';
    }

    // Totals
    receiptText += `TOTAL: P${paymentData.total.toFixed(2)}\n`;
    receiptText += '\n';

    // Payment details
    receiptText += `Payment Method: ${paymentData.method}\n`;
    if (paymentData.method === 'Cash') {
      receiptText += `Amount Received: P${paymentData.received.toFixed(2)}\n`;
      receiptText += `Change: P${paymentData.change.toFixed(2)}\n`;
    }
    receiptText += '\n';

    // Cut paper and add spacing
    receiptText += '\n\n\n';
    receiptText += '\x1D\x56\x00'; // Full cut

    return receiptText;
  }

  // Create test receipt
  createTestReceipt() {
    const now = new Date();
    const dateStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}`;

    // Format time manually to avoid encoding issues
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const timeStr = `${hours}:${minutes} ${ampm}`;

    let receiptText = '';

    // Initialize printer
    receiptText += '\x1B\x40'; // ESC @ - Initialize

    // Header
    receiptText += '\x1B\x61\x01'; // Center align
    receiptText += '================================\n';
    receiptText += 'TEST RECEIPT\n';
    receiptText += 'PRINTER CONNECTION\n';
    receiptText += '================================\n';
    receiptText += '\x1B\x61\x00'; // Left align
    receiptText += '\n';

    // Details
    receiptText += `Printer: ${this.connectedPrinter.name}\n`;
    receiptText += `Address: ${this.connectedPrinter.address}\n`;
    receiptText += `Date: ${dateStr}\n`;
    receiptText += `Time: ${timeStr}\n`;
    receiptText += '\n';

    receiptText += '--------------------------------\n';
    receiptText += 'Connection test successful!\n';
    receiptText += '--------------------------------\n';

    // Footer
    receiptText += '\n';
    receiptText += '\x1B\x61\x01'; // Center align
    receiptText += 'Ready for printing!\n';
    receiptText += '\n\n\n';
    
    // Cut paper
    receiptText += '\x1D\x56\x00'; // Full cut

    return receiptText;
  }

  // ESC/POS QR Code command
  addQRCode(data) {
    let qrCommand = '';

    // QR Code commands for ESC/POS (Model 2)
    qrCommand += '\x1D\x28\x6B\x04\x00\x31\x41\x32\x00'; // Set QR code model
    qrCommand += '\x1D\x28\x6B\x03\x00\x31\x43\x08';     // Set QR code size (8 = medium)
    qrCommand += '\x1D\x28\x6B\x03\x00\x31\x45\x31';     // Set error correction level

    // Store QR code data
    const dataLength = data.length + 3;
    const pL = dataLength & 0xFF;
    const pH = (dataLength >> 8) & 0xFF;

    qrCommand += '\x1D\x28\x6B';           // QR code command
    qrCommand += String.fromCharCode(pL);  // Data length L
    qrCommand += String.fromCharCode(pH);  // Data length H  
    qrCommand += '\x31\x50\x30';           // Store data command
    qrCommand += data;                     // QR code data

    // Print QR code
    qrCommand += '\x1D\x28\x6B\x03\x00\x31\x51\x30'; // Print QR code

    return qrCommand;
  }

  // Get printing status
  getPrintingStatus() {
    return {
      isPrinting: this.isPrinting,
      printerAvailable: this.isPrinterAvailable(),
      currentPrinter: this.connectedPrinter
    };
  }
}

// Create singleton instance
const printerService = new PrinterService();

export default printerService;