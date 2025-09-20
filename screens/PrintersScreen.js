import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
  SafeAreaView,
} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BluetoothClassic from 'react-native-bluetooth-classic';

const STORAGE_KEY = '@selected_printer';

const BluetoothPrinterManager = () => {
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [bleManager] = useState(new BleManager());
  const [devices, setDevices] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(null);

  useEffect(() => {
    initializeManager();
    
    // Cleanup BLE manager on unmount
    return () => {
      bleManager.destroy();
    };
  }, []);

  const initializeManager = async () => {
    await checkBluetoothState();
    await loadStoredPrinter();
  };

  const checkBluetoothState = async () => {
    try {
      const state = await bleManager.state();
      console.log('Bluetooth state:', state);
      
      if (state === 'PoweredOn') {
        setPermissionStatus('ready');
      } else {
        setPermissionStatus('disabled');
      }
    } catch (error) {
      console.error('Error checking Bluetooth state:', error);
      setPermissionStatus('error');
    }
  };

  // Load stored printer from AsyncStorage
  const loadStoredPrinter = async () => {
    try {
      const storedPrinter = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedPrinter) {
        const printerData = JSON.parse(storedPrinter);
        setSelectedPrinter(printerData);
        console.log('Loaded stored printer:', printerData);
      }
    } catch (error) {
      console.error('Error loading stored printer:', error);
    }
  };

  // Save selected printer to AsyncStorage
  const saveSelectedPrinter = async (printer) => {
    try {
      const printerData = {
        name: printer.displayName || printer.name,
        address: printer.id, // BLE uses device ID as address
        type: 'BLE',
        timestamp: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(printerData));
      setSelectedPrinter(printerData);
      console.log('Printer saved to storage:', printerData);
      
      Alert.alert(
        'Printer Selected',
        `${printerData.name} has been saved as your default printer.\n\nAddress: ${printerData.address}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving printer:', error);
      Alert.alert('Error', 'Failed to save printer selection');
    }
  };

  // Clear stored printer
  const clearStoredPrinter = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setSelectedPrinter(null);
      Alert.alert('Success', 'Stored printer cleared');
    } catch (error) {
      console.error('Error clearing printer:', error);
      Alert.alert('Error', 'Failed to clear stored printer');
    }
  };

  const requestBluetoothPermissions = async () => {
    if (Platform.OS !== 'android') {
      // On iOS, just start scanning - permissions are handled automatically
      startScanningForPrinters();
      return;
    }

    setIsLoading(true);

    try {
      const androidVersion = Platform.constants.Version;
      let permissionsToRequest;

      if (androidVersion >= 31) {
        // Android 12+ BLE permissions
        permissionsToRequest = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ];
      } else {
        // Older Android versions for BLE
        permissionsToRequest = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
      }

      const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);
      console.log('BLE Permission results:', granted);
      
      const allGranted = Object.values(granted).every(
        permission => permission === PermissionsAndroid.RESULTS.GRANTED
      );

      if (allGranted) {
        setPermissionStatus('granted');
        startScanningForPrinters();
      } else {
        setPermissionStatus('denied');
        Alert.alert(
          'Permission Required',
          'BLE permissions are required to scan for printers. Please enable them in Settings.',
          [
            { 
              text: 'Open Settings', 
              onPress: () => Linking.openSettings()
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting BLE permissions:', error);
      setPermissionStatus('error');
      Alert.alert('Error', 'Failed to request BLE permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const startScanningForPrinters = async () => {
    try {
      setIsScanning(true);
      setDevices([]);
      
      // Check if Bluetooth is enabled
      const state = await bleManager.state();
      if (state !== 'PoweredOn') {
        Alert.alert('Bluetooth Disabled', 'Please enable Bluetooth to scan for printers.');
        setIsScanning(false);
        return;
      }

      console.log('Starting BLE scan for printers...');
      
      // Start scanning for BLE devices
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          setIsScanning(false);
          return;
        }

        if (device) {
          console.log('Found BLE device:', {
            name: device.name,
            id: device.id,
            rssi: device.rssi,
            serviceUUIDs: device.serviceUUIDs
          });

          // Only show devices with actual names (likely to be printers/peripherals)
          if (device.name && device.name.trim() !== '') {
            setDevices(prevDevices => {
              // Avoid duplicates
              if (!prevDevices.find(d => d.id === device.id)) {
                return [...prevDevices, {
                  ...device,
                  displayName: device.name
                }];
              }
              return prevDevices;
            });
          }
        }
      });

      // Stop scanning after 15 seconds
      setTimeout(() => {
        bleManager.stopDeviceScan();
        setIsScanning(false);
        console.log('BLE scan completed');
      }, 15000);

    } catch (error) {
      console.error('Error starting BLE scan:', error);
      setIsScanning(false);
      Alert.alert('Error', 'Failed to start scanning for printers');
    }
  };

  // Test print function using stored printer
  const testPrint = async () => {
    if (!selectedPrinter) {
      Alert.alert('No Printer', 'Please select a printer first');
      return;
    }

    setIsPrinting(true);
    console.log('Testing print with printer:', selectedPrinter);

    try {
      // Connect to printer using Bluetooth Classic
      const connection = await BluetoothClassic.connectToDevice(selectedPrinter.address);
      console.log('Connected to printer for test');

      // Create test receipt
      const testReceipt = createTestReceipt();

      // Send to printer
      await connection.write(testReceipt);
      console.log('Test receipt sent to printer');

      // Disconnect
      await connection.disconnect();
      console.log('Printer disconnected');

      Alert.alert('Success', 'Test receipt printed successfully!');

    } catch (error) {
      console.error('Test printing failed:', error);
      Alert.alert('Print Error', `Failed to print: ${error.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  // Create test receipt data
  const createTestReceipt = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();

    let receiptText = '';

    // Initialize printer
    receiptText += '\x1B\x40'; // ESC @ - Initialize

    // Header
    receiptText += '\x1B\x61\x01'; // Center align
    receiptText += '================================\n';
    receiptText += '       TEST RECEIPT\n';
    receiptText += '     PRINTER CONNECTION\n';
    receiptText += '================================\n';
    receiptText += '\x1B\x61\x00'; // Left align
    receiptText += '\n';

    // Details
    receiptText += `Printer: ${selectedPrinter.name}\n`;
    receiptText += `Address: ${selectedPrinter.address}\n`;
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
  };

  // Print receipt function (same as your existing code but uses stored printer)
  const printReceipt = async (paymentData, cart) => {
    if (!selectedPrinter || isPrinting) {
      console.log('No printer selected or already printing');
      return;
    }

    setIsPrinting(true);
    console.log('Printing receipt for payment:', paymentData);

    try {
      // Connect to printer
      const connection = await BluetoothClassic.connectToDevice(selectedPrinter.address);
      console.log('Connected to printer for receipt');

      // Create receipt content
      const receiptData = createReceiptData(paymentData, cart);

      // Send receipt to printer
      await connection.write(receiptData);
      console.log('Receipt sent to printer');

      // Disconnect
      await connection.disconnect();
      console.log('Printer disconnected');

    } catch (error) {
      console.error('Printing failed:', error);
      // Don't show error alert - printing failure shouldn't block the payment flow
      // Just log it for debugging
    } finally {
      setIsPrinting(false);
    }
  };

  // Your existing createReceiptData function
  const createReceiptData = (paymentData, cart) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();

    let receiptText = '';

    // Initialize printer
    receiptText += '\x1B\x40'; // ESC @ - Initialize

    // Header
    receiptText += '\x1B\x61\x01'; // Center align
    receiptText += '================================\n';
    receiptText += '     CECILIA KITCHEN CAFE\n';
    receiptText += '     Thank you for your order!\n';
    receiptText += '================================\n';
    receiptText += '\x1B\x61\x00'; // Left align
    receiptText += '\n';

    // Date and time
    receiptText += `Date: ${dateStr}\n`;
    receiptText += `Time: ${timeStr}\n`;
    if (paymentData.transactionId) {
      receiptText += `Trans ID: ${paymentData.transactionId}\n`;
    }
    receiptText += '\n';

    // Items
    receiptText += '--------------------------------\n';
    receiptText += 'ITEMS:\n';
    receiptText += '--------------------------------\n';

    cart?.forEach(item => {
      const itemTotal = item.quantity * item.price;
      receiptText += `${item.name}\n`;
      receiptText += `  ${item.quantity} x P${item.price.toFixed(2)} = P${itemTotal.toFixed(2)}\n`;
    });

    receiptText += '--------------------------------\n';

    // Totals
    receiptText += `SUBTOTAL: P${paymentData.total.toFixed(2)}\n`;
    receiptText += `TOTAL: P${paymentData.total.toFixed(2)}\n`;
    receiptText += '\n';

    // Payment details
    receiptText += `Payment Method: ${paymentData.method}\n`;
    if (paymentData.method === 'Cash') {
      receiptText += `Amount Received: P${paymentData.received.toFixed(2)}\n`;
      receiptText += `Change: P${paymentData.change.toFixed(2)}\n`;
    }
    receiptText += '\n';

    // QR Code Section
    receiptText += '\x1B\x61\x01'; // Center align
    receiptText += '      Visit our website:\n';
    receiptText += addQRCode('https://ceciliakitchencafe.com');
    receiptText += '\n';
    receiptText += '    ceciliakitchencafe.com\n';
    receiptText += '\n';

    // Footer
    receiptText += '================================\n';
    receiptText += '      Visit us again soon!\n';
    receiptText += '================================\n';

    // Cut paper and add spacing
    receiptText += '\n\n\n';
    receiptText += '\x1D\x56\x00'; // Full cut

    return receiptText;
  };

  // ESC/POS QR Code command
  const addQRCode = (data) => {
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
  };

  const getStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
      case 'ready':
        return '#4CAF50';
      case 'denied':
        return '#F44336';
      case 'disabled':
        return '#FF5722';
      case 'error':
        return '#F44336';
      default:
        return '#2196F3';
    }
  };

  const getStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Permissions Granted';
      case 'ready':
        return 'Bluetooth Ready';
      case 'denied':
        return 'Permission Denied';
      case 'disabled':
        return 'Bluetooth Disabled';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Current Selected Printer */}
      {selectedPrinter && (
        <View style={styles.selectedPrinterContainer}>
          <Text style={styles.selectedPrinterTitle}>Selected Printer:</Text>
          <View style={styles.selectedPrinterInfo}>
            <Text style={styles.selectedPrinterName}>{selectedPrinter.name}</Text>
            <Text style={styles.selectedPrinterAddress}>{selectedPrinter.address}</Text>
            <Text style={styles.selectedPrinterType}>Type: {selectedPrinter.type}</Text>
          </View>
          <View style={styles.printerActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.testButton]}
              onPress={testPrint}
              disabled={isPrinting}
            >
              <Text style={styles.actionButtonText}>
                {isPrinting ? 'Printing...' : 'Test Print'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={clearStoredPrinter}
            >
              <Text style={styles.actionButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Scan Button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: getStatusColor() }]}
        onPress={requestBluetoothPermissions}
        disabled={isScanning}
      >
        <Text style={styles.buttonText}>
          {isScanning ? 'Scanning for printers...' : 'Scan for BLE Printers'}
        </Text>
      </TouchableOpacity>

      {/* Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status: </Text>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      {/* Devices List */}
      {devices.length > 0 && (
        <View style={styles.devicesList}>
          <Text style={styles.devicesTitle}>Found BLE Devices ({devices.length}):</Text>
          {devices
            .sort((a, b) => b.rssi - a.rssi)
            .map((device, index) => (
            <TouchableOpacity 
              key={device.id} 
              style={[
                styles.deviceItem,
                selectedPrinter?.address === device.id && styles.deviceItemSelected
              ]}
              onPress={() => saveSelectedPrinter(device)}
            >
              <View style={styles.deviceHeader}>
                <Text style={styles.deviceName}>{device.displayName}</Text>
                <Text style={styles.deviceRssi}>{device.rssi} dBm</Text>
              </View>
              <Text style={styles.deviceId}>{device.id}</Text>
              {device.serviceUUIDs && device.serviceUUIDs.length > 0 && (
                <Text style={styles.deviceServices}>
                  Services: {device.serviceUUIDs.join(', ')}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* No Devices Message */}
      {!isScanning && devices.length === 0 && permissionStatus === 'granted' && (
        <View style={styles.noDevicesContainer}>
          <Text style={styles.noDevicesText}>No BLE devices found</Text>
          <Text style={styles.noDevicesHint}>
            Make sure your printer is in pairing/discoverable mode and try again
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  selectedPrinterContainer: {
    backgroundColor: '#E8F5E8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  selectedPrinterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  selectedPrinterInfo: {
    marginBottom: 10,
  },
  selectedPrinterName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  selectedPrinterAddress: {
    fontSize: 14,
    color: '#388E3C',
    fontFamily: 'monospace',
  },
  selectedPrinterType: {
    fontSize: 12,
    color: '#66BB6A',
    fontStyle: 'italic',
  },
  printerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#4CAF50',
  },
  clearButton: {
    backgroundColor: '#FF5722',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  devicesList: {
    width: '100%',
  },
  devicesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  deviceItem: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    marginVertical: 5,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  deviceItemSelected: {
    backgroundColor: '#E8F5E8',
    borderLeftColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  deviceRssi: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deviceId: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  deviceServices: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  noDevicesContainer: {
    marginTop: 20,
    alignItems: 'center',
    padding: 20,
  },
  noDevicesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  noDevicesHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

// Export the printReceipt function for use in other components
export { BluetoothPrinterManager as default };

// Usage example for your payment screen:
// import BluetoothPrinterManager from './BluetoothPrinterManager';
// 
// // In your payment component:
// const printerManager = useRef(null);
// 
// const handlePaymentComplete = async (paymentData, cart) => {
//   // Process payment first
//   // Then print receipt
//   if (printerManager.current) {
//     await printerManager.current.printReceipt(paymentData, cart);
//   }
// };