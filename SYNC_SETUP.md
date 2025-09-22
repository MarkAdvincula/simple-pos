# Sales Sync Integration

This document explains how to set up and use the sales synchronization feature between the simple-pos Android app and the backend API.

## Overview

The sync functionality automatically sends completed transactions from the POS app to your backend server for centralized reporting and analytics. It includes offline support, retry mechanisms, and manual sync management.

## Features

✅ **Automatic Sync** - Transactions are automatically queued for sync after completion
✅ **Offline Support** - Failed syncs are stored locally and retried when connection is restored
✅ **Retry Logic** - Configurable retry attempts with exponential backoff
✅ **Manual Management** - Full control over sync process through the maintenance screen
✅ **Configuration UI** - Easy setup of API endpoints and sync settings
✅ **Status Monitoring** - Real-time view of sync queue status

## Files Added/Modified

### New Services
- `src/services/apiConfig.js` - API configuration management
- `src/services/syncService.js` - Core sync functionality and offline queue

### New Components
- `src/components/SyncManager.js` - Sync management UI component

### Modified Files
- `src/services/transactionService.js` - Added sync integration to transaction processing
- `screens/MaintenanceScreen.js` - Added sync management button and modal

## Setup Instructions

### 1. Backend Setup
Make sure your backend API is running with the sales endpoints available:
```bash
cd /path/to/simplepos_inventory
npm run dev
```

### 2. Configure API Settings
1. Open the simple-pos app
2. Go to the Maintenance screen
3. Tap the purple "Sync" button
4. Configure the following settings:
   - **API Base URL**: `http://YOUR_SERVER_IP:3000/api`
   - **Store ID**: Your store's ID (usually `1`)
   - **Sync Enabled**: Toggle on to enable automatic sync

### 3. Test Connection
1. In the Sync Manager, tap "Test Connection"
2. Verify you see "✅ Connected" status
3. If connection fails, check:
   - Network connectivity
   - Server is running
   - Correct IP address and port

### 4. Test Sync
1. Tap "Test Sync" to create a sample transaction
2. Check the sync status to see it was queued and processed
3. Verify the transaction appears in your backend API

## Configuration Options

### API Configuration
```javascript
{
  baseUrl: 'http://192.168.100.124:3000/api',    // Your server URL
  storeId: '1',                                   // Store identifier
  syncEnabled: true,                              // Enable/disable sync
  syncRetryAttempts: 3,                          // Max retry attempts
  syncRetryDelay: 5000,                          // Delay between retries (ms)
  maxOfflineTransactions: 100,                   // Max queued transactions
  requestTimeout: 30000                          // Request timeout (ms)
}
```

### Default Configuration
The app comes with sensible defaults that work for most setups. You only need to update the `baseUrl` and `storeId` for your environment.

## How It Works

### Transaction Flow
1. **Customer completes purchase** → Transaction processed locally in SQLite
2. **Sync triggered** → Transaction data formatted and queued for API sync
3. **API call made** → Data sent to backend sales endpoint
4. **Success handling** → Transaction marked as synced, removed from queue
5. **Failure handling** → Transaction marked for retry with exponential backoff

### Data Transformation
The app automatically transforms local transaction data to match the API format:

**Local Format:**
```javascript
{
  transactionId: "TXN123",
  cart: [
    { name: "Coffee", price: 75, quantity: 2 }
  ],
  paymentMethod: "cash",
  total: 150,
  received: 200,
  change: 50
}
```

**API Format:**
```javascript
{
  transaction_id: "TXN123",
  items: [
    { item_name: "Coffee", unit_price: 75, quantity: 2, total_price: 150 }
  ],
  payment_method: "cash",
  total_amount: 150,
  amount_received: 200,
  change_amount: 50
}
```

## Sync Management

### Sync Status Indicators
- **Pending**: Transactions waiting to be synced
- **Failed**: Transactions that failed after all retry attempts
- **Completed**: Successfully synced transactions
- **Total**: Total transactions in the queue

### Manual Actions
- **Sync Now**: Immediately process all pending transactions
- **Retry Failed**: Retry all failed transactions
- **Test Sync**: Create a test transaction to verify sync works
- **Clear Queue**: Remove all transactions from sync queue (use with caution)

## Troubleshooting

### Common Issues

**Connection Failed**
- Verify server is running on the correct port
- Check that your device and server are on the same network
- Ensure no firewall is blocking the connection
- Try accessing `http://YOUR_SERVER_IP:3000/health` in a browser

**Sync Stuck on Pending**
- Check network connectivity
- Verify API credentials/store ID
- Look at server logs for error messages
- Try manual sync from the sync manager

**Transactions Not Appearing in Backend**
- Verify correct store ID is configured
- Check that the backend database is properly set up
- Confirm the sales API endpoints are working
- Test with a simple curl command

### Reset Sync Configuration
If you need to reset the sync settings:
1. Open Sync Manager
2. Scroll to the bottom
3. Configure new settings and save
4. Or manually clear app data to reset everything

## Development Notes

### Adding Custom Data
To sync additional transaction data, modify the `transformTransactionForAPI` method in `syncService.js`:

```javascript
// Add custom fields to the API payload
return {
  transaction_id: transactionData.transactionId,
  // ... existing fields ...
  custom_field: transactionData.customData,
  store_location: 'Main Branch'
};
```

### Sync Events
The sync service emits console logs for monitoring:
- `✅ Transaction queued for sync to server`
- `✅ Transaction synced successfully`
- `❌ Failed to sync transaction`

You can enhance this with proper event emitters or analytics tracking.

## Security Considerations

- The API configuration is stored locally in AsyncStorage
- No sensitive data is logged to console in production
- API endpoints should use HTTPS in production environments
- Consider implementing API authentication tokens for production use

## Performance

- Sync operations run asynchronously and don't block the UI
- Failed transactions are retried with exponential backoff to avoid overwhelming the server
- The offline queue is limited to prevent excessive memory usage
- Database operations are optimized for mobile performance

## Next Steps

1. **Authentication**: Add API key/token authentication
2. **Encryption**: Encrypt sensitive data in transit and at rest
3. **Analytics**: Add sync performance monitoring
4. **Bulk Sync**: Implement batch sync for multiple transactions
5. **Conflict Resolution**: Handle duplicate transaction scenarios