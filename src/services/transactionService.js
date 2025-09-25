// ./src/services/transactionService.js
import databaseService from './database';

class TransactionService {
  // Process and save transaction with date
  async processTransaction(cart, paymentMethod, paymentDetails = {}) {
    try {
      // Determine transaction status
      const status = paymentDetails.status || 'COMPLETED';

      // Save to database using your existing method
      const transactionId = await databaseService.addTransaction(cart, paymentMethod, status);

      // Create transaction data with timestamp
      const now = new Date();
      const transactionData = {
        transactionId,
        cart,
        paymentMethod: paymentMethod,
        total: paymentDetails.total || cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        timestamp: now.toISOString(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        status: status === 'COMPLETED' ? 'success' : status.toLowerCase(),
        dbStatus: status,
        ...paymentDetails
      };

      return {
        success: true,
        ...transactionData
      };
    } catch (error) {
      console.error('Transaction processing failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Process cash transaction specifically
  async processCashTransaction(cart, total, received, change) {
    const paymentDetails = {
      total: parseFloat(total),
      received: parseFloat(received),
      change: parseFloat(change),
      method: 'Cash'
    };

    return await this.processTransaction(cart, 'cash', paymentDetails);
  }

  // Process digital payment (GCash, BPI, etc.)
  async processDigitalPayment(cart, total, method, additionalData = {}) {
    const paymentDetails = {
      total: parseFloat(total),
      method: method,
      ...additionalData
    };

    return await this.processTransaction(cart, method.toLowerCase(), paymentDetails);
  }

  // Get transaction summary for receipt
  createReceiptData(transactionResult, cart = []) {
    const now = new Date();
    
    return {
      transactionId: transactionResult.transactionId,
      method: transactionResult.method || transactionResult.paymentMethod || 'Unknown',
      total: transactionResult.total || 0,
      received: transactionResult.received,
      change: transactionResult.change,
      date: transactionResult.date || now.toLocaleDateString(),
      time: transactionResult.time || now.toLocaleTimeString(),
      timestamp: transactionResult.timestamp || now.toISOString(),
      cart: cart,
      status: transactionResult.status || (transactionResult.success ? 'success' : 'error')
    };
  }

  // Format transaction for display
  formatTransactionForDisplay(transactionData) {
    return {
      id: transactionData.transactionId || transactionData.id,
      method: transactionData.method || transactionData.payment_method,
      total: `₱${transactionData.total?.toFixed(2) || transactionData.total_amount?.toFixed(2)}`,
      date: transactionData.date || new Date(transactionData.transaction_datetime).toLocaleDateString(),
      time: transactionData.time || new Date(transactionData.transaction_datetime).toLocaleTimeString(),
      status: transactionData.status || transactionData.dbStatus || 'COMPLETED'
    };
  }

  // Get transactions from database
  async getTransactions() {
    try {
      return await databaseService.getTransactions();
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  // Get transaction by ID
  async getTransactionById(id) {
    try {
      return await databaseService.getTransactionById(id);
    } catch (error) {
      console.error('Error fetching transaction by ID:', error);
      throw error;
    }
  }

  // Get transactions by date
  async getTransactionsByDate(date) {
    try {
      return await databaseService.getTransactionsByDate(date);
    } catch (error) {
      console.error('Error fetching transactions by date:', error);
      throw error;
    }
  }

  // Get daily summary
  async getDailySummary(date) {
    try {
      return await databaseService.getDailySummary(date);
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      throw error;
    }
  }

  // Delete transaction
  async deleteTransaction(id) {
    try {
      return await databaseService.deleteTransaction(id);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  // Void transaction (mark as VOID instead of deleting)
  async voidTransaction(id) {
    try {
      return await databaseService.voidTransaction(id);
    } catch (error) {
      console.error('Error voiding transaction:', error);
      throw error;
    }
  }

  // Process internal consumption transaction
  async processInternalConsumption(cart, consumptionType = 'HOUSE') {
    const paymentDetails = {
      total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      method: consumptionType,
      status: 'HOUSE'
    };

    return await this.processTransaction(cart, consumptionType.toLowerCase(), paymentDetails);
  }

  // Update transaction status
  async updateTransactionStatus(id, status) {
    try {
      return await databaseService.updateTransactionStatus(id, status);
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }
}

// Create singleton instance
const transactionService = new TransactionService();

export default transactionService;