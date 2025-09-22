// ./src/services/syncService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiConfigService from './apiConfig';

class SyncService {
  constructor() {
    this.syncQueue = [];
    this.syncing = false;
    this.retryTimeouts = new Map();
  }

  // Add transaction to sync queue
  async queueForSync(transactionData) {
    try {
      const config = await apiConfigService.getConfig();

      // Don't queue if sync is disabled
      if (!config.syncEnabled) {
        console.log('Sync disabled, skipping queue');
        return;
      }

      const queueItem = {
        id: transactionData.transactionId || Date.now().toString(),
        data: transactionData,
        attempts: 0,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      // Get current queue from storage
      const queue = await this.getOfflineQueue();
      queue.push(queueItem);

      // Limit queue size
      if (queue.length > config.maxOfflineTransactions) {
        queue.shift(); // Remove oldest item
      }

      await this.saveOfflineQueue(queue);
      console.log(`Transaction ${queueItem.id} queued for sync`);

      // Try to sync immediately if online
      this.processSyncQueue();

    } catch (error) {
      console.error('Error queuing transaction for sync:', error);
    }
  }

  // Get offline queue from storage
  async getOfflineQueue() {
    try {
      const stored = await AsyncStorage.getItem('sync_queue');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading sync queue:', error);
      return [];
    }
  }

  // Save offline queue to storage
  async saveOfflineQueue(queue) {
    try {
      await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  // Process sync queue
  async processSyncQueue() {
    if (this.syncing) {
      console.log('Sync already in progress');
      return;
    }

    this.syncing = true;

    try {
      const queue = await this.getOfflineQueue();
      const pendingItems = queue.filter(item => item.status === 'pending');

      console.log(`Processing ${pendingItems.length} pending sync items`);

      for (const item of pendingItems) {
        await this.syncSingleTransaction(item);
      }

      // Clean up completed items
      const updatedQueue = queue.filter(item => item.status !== 'completed');
      await this.saveOfflineQueue(updatedQueue);

    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      this.syncing = false;
    }
  }

  // Sync single transaction
  async syncSingleTransaction(queueItem) {
    try {
      const config = await apiConfigService.getConfig();
      const url = await apiConfigService.buildUrl('/stores/{storeId}/sales');

      // Transform transaction data to API format
      const apiData = this.transformTransactionForAPI(queueItem.data);

      console.log(`Syncing transaction ${queueItem.id} to ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData),
        timeout: config.requestTimeout
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Transaction ${queueItem.id} synced successfully:`, result);

        // Mark as completed
        queueItem.status = 'completed';
        queueItem.syncedAt = new Date().toISOString();
        queueItem.serverResponse = result;

        // Clear any retry timeout
        if (this.retryTimeouts.has(queueItem.id)) {
          clearTimeout(this.retryTimeouts.get(queueItem.id));
          this.retryTimeouts.delete(queueItem.id);
        }

      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error(`❌ Failed to sync transaction ${queueItem.id}:`, error);

      queueItem.attempts += 1;
      queueItem.lastError = error.message;
      queueItem.lastAttemptAt = new Date().toISOString();

      const config = await apiConfigService.getConfig();

      if (queueItem.attempts >= config.syncRetryAttempts) {
        console.log(`Transaction ${queueItem.id} exceeded retry attempts, marking as failed`);
        queueItem.status = 'failed';
      } else {
        // Schedule retry
        console.log(`Scheduling retry for transaction ${queueItem.id} in ${config.syncRetryDelay}ms`);
        const timeoutId = setTimeout(() => {
          this.syncSingleTransaction(queueItem);
        }, config.syncRetryDelay);

        this.retryTimeouts.set(queueItem.id, timeoutId);
      }

      // Update queue with failed attempt info
      const queue = await this.getOfflineQueue();
      const itemIndex = queue.findIndex(item => item.id === queueItem.id);
      if (itemIndex >= 0) {
        queue[itemIndex] = queueItem;
        await this.saveOfflineQueue(queue);
      }
    }
  }

  // Transform transaction data to API format
  transformTransactionForAPI(transactionData) {
    // Map cart items to API format
    const items = (transactionData.cart || []).map(item => ({
      item_name: item.name || item.item_name || 'Unknown Item',
      category: item.category || 'General',
      quantity: parseFloat(item.quantity || 1),
      unit_price: parseFloat(item.price || item.unit_price || 0),
      total_price: parseFloat((item.price || item.unit_price || 0) * (item.quantity || 1)),
      item_code: item.code || item.item_code || null,
      notes: item.notes || null
    }));

    // Build API payload
    return {
      transaction_id: transactionData.transactionId,
      transaction_datetime: transactionData.timestamp,
      payment_method: (transactionData.paymentMethod || transactionData.method || 'cash').toLowerCase(),
      subtotal: parseFloat(transactionData.total || 0),
      total_amount: parseFloat(transactionData.total || 0),
      amount_received: parseFloat(transactionData.received || transactionData.total || 0),
      change_amount: parseFloat(transactionData.change || 0),
      payment_reference: transactionData.reference || transactionData.paymentReference || null,
      cashier_name: transactionData.cashier || 'POS User',
      pos_device_id: transactionData.deviceId || 'simple-pos-app',
      receipt_number: transactionData.receiptNumber || null,
      notes: transactionData.notes || null,
      items: items
    };
  }

  // Manual sync trigger
  async syncNow() {
    console.log('Manual sync triggered');
    await this.processSyncQueue();
  }

  // Get sync status
  async getSyncStatus() {
    const queue = await this.getOfflineQueue();
    const pending = queue.filter(item => item.status === 'pending').length;
    const failed = queue.filter(item => item.status === 'failed').length;
    const completed = queue.filter(item => item.status === 'completed').length;

    return {
      pending,
      failed,
      completed,
      total: queue.length,
      syncing: this.syncing
    };
  }

  // Clear sync queue
  async clearSyncQueue() {
    try {
      await AsyncStorage.removeItem('sync_queue');
      this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
      this.retryTimeouts.clear();
      console.log('Sync queue cleared');
    } catch (error) {
      console.error('Error clearing sync queue:', error);
    }
  }

  // Retry failed transactions
  async retryFailedTransactions() {
    const queue = await this.getOfflineQueue();
    const failedItems = queue.filter(item => item.status === 'failed');

    console.log(`Retrying ${failedItems.length} failed transactions`);

    for (const item of failedItems) {
      item.status = 'pending';
      item.attempts = 0;
      delete item.lastError;
    }

    await this.saveOfflineQueue(queue);
    await this.processSyncQueue();
  }

  // Test sync with sample data
  async testSync() {
    const testTransaction = {
      transactionId: `TEST-${Date.now()}`,
      timestamp: new Date().toISOString(),
      paymentMethod: 'cash',
      total: 100.00,
      received: 100.00,
      change: 0.00,
      cart: [
        {
          name: 'Test Item',
          category: 'Test',
          quantity: 1,
          price: 100.00
        }
      ]
    };

    await this.queueForSync(testTransaction);
  }
}

// Create singleton instance
const syncService = new SyncService();

export default syncService;