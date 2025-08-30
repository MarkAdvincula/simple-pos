import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import BluetoothClassic from 'react-native-bluetooth-classic';
import { Printer, PrinterConstants } from 'react-native-esc-pos-printer';

const PrintersScreen = ({ navigation }) => {
  const [bluetoothDevices, setBluetoothDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
  const [testingDevice, setTestingDevice] = useState(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    initializeBluetooth();
  }, []);

  const initializeBluetooth = async () => {
    console.log('Initializing Bluetooth...');
    
    // Step 1: Request permissions
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      console.log('Permissions not granted, but continuing...');
    }
    
    // Step 2: Check Bluetooth status
    await checkBluetoothStatus();
    
    // Step 3: Load paired devices immediately
    await loadPairedDevices();
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'android') {
      setPermissionsGranted(true);
      return true;
    }

    try {
      console.log('Requesting Bluetooth permissions...');
      
      // Request permissions in stages to avoid the null error
      const permissions = [];
      
      // Basic Bluetooth permissions (should always exist)
      permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      
      // Try to add Bluetooth permissions if they exist
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH) {
        permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH);
      }
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN) {
        permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN);
      }

      console.log('Requesting permissions:', permissions);
      const granted = await PermissionsAndroid.requestMultiple(permissions);
      console.log('Permission results:', granted);

      // For Android 12+, try newer permissions separately
      if (Platform.Version >= 31) {
        try {
          const newPermissions = [];
          if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN) {
            newPermissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
          }
          if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
            newPermissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
          }
          
          if (newPermissions.length > 0) {
            console.log('Requesting Android 12+ permissions:', newPermissions);
            const newGranted = await PermissionsAndroid.requestMultiple(newPermissions);
            console.log('Android 12+ permission results:', newGranted);
          }
        } catch (err) {
          console.log('Android 12+ permissions not available:', err.message);
        }
      }

      setPermissionsGranted(true);
      return true;
      
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert(
        'Permission Error',
        'Some permissions may not be available, but you can still try to scan for devices.',
        [{ text: 'Continue' }]
      );
      setPermissionsGranted(false);
      return false;
    }
  };

  const checkBluetoothStatus = async () => {
    try {
      console.log('Checking Bluetooth status...');
      const isEnabled = await BluetoothClassic.isBluetoothEnabled();
      console.log('Bluetooth enabled:', isEnabled);
      setIsBluetoothEnabled(isEnabled);
      
      if (!isEnabled) {
        Alert.alert(
          'Bluetooth Disabled',
          'Bluetooth is required to scan for printers. Would you like to enable it?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Enable', onPress: enableBluetooth },
          ]
        );
      }
    } catch (error) {
      console.error('Error checking Bluetooth status:', error);
      Alert.alert('Error', 'Could not check Bluetooth status. Make sure Bluetooth is enabled manually.');
    }
  };

  const enableBluetooth = async () => {
    try {
      console.log('Requesting to enable Bluetooth...');
      const enabled = await BluetoothClassic.requestBluetoothEnabled();
      setIsBluetoothEnabled(enabled);
      
      if (enabled) {
        Alert.alert('Success', 'Bluetooth enabled! You can now scan for devices.');
        await loadPairedDevices();
      } else {
        Alert.alert('Failed', 'Could not enable Bluetooth. Please enable it manually in settings.');
      }
    } catch (error) {
      console.error('Error enabling Bluetooth:', error);
      Alert.alert('Error', 'Could not enable Bluetooth. Please enable it manually in Android settings.');
    }
  };

  const loadPairedDevices = async () => {
    try {
      console.log('Loading paired devices...');
      const pairedDevices = await BluetoothClassic.getBondedDevices();
      console.log('Found paired devices:', pairedDevices.length);
      
      const deviceList = pairedDevices.map(device => ({
        id: device.address,
        name: device.name || 'Unknown Device',
        address: device.address,
        paired: true,
        discovered: false,
        rssi: null,
      }));
      
      setBluetoothDevices(deviceList);
      console.log('Paired devices loaded:', deviceList.length);
      
    } catch (error) {
      console.error('Error loading paired devices:', error);
    }
  };

  const scanForDevices = async () => {
    if (!isBluetoothEnabled) {
      Alert.alert('Bluetooth Disabled', 'Please enable Bluetooth first.');
      return;
    }

    setIsScanning(true);
    console.log('Starting Bluetooth device scan...');

    try {
      // First, reload paired devices
      await loadPairedDevices();

      // Start discovery
      const isDiscovering = await BluetoothClassic.startDiscovery();
      if (!isDiscovering) {
        Alert.alert('Scan Failed', 'Could not start Bluetooth discovery. Try again.');
        setIsScanning(false);
        return;
      }

      console.log('Discovery started successfully');

      // Listen for discovered devices
      const discoverySubscription = BluetoothClassic.onBluetoothDiscovered((device) => {
        console.log('Discovered device:', device);
        
        setBluetoothDevices(prevDevices => {
          // Check if device already exists
          const existingIndex = prevDevices.findIndex(d => d.address === device.address);
          
          if (existingIndex >= 0) {
            // Update existing device
            const updatedDevices = [...prevDevices];
            updatedDevices[existingIndex] = {
              ...updatedDevices[existingIndex],
              discovered: true,
              rssi: device.rssi || null,
            };
            return updatedDevices;
          } else {
            // Add new device
            return [...prevDevices, {
              id: device.address,
              name: device.name || 'Unknown Device',
              address: device.address,
              paired: false,
              discovered: true,
              rssi: device.rssi || null,
            }];
          }
        });
      });

      // Stop discovery after 15 seconds
      setTimeout(async () => {
        try {
          console.log('Stopping discovery...');
          await BluetoothClassic.cancelDiscovery();
          discoverySubscription.remove();
          setIsScanning(false);
          console.log('Discovery completed');
        } catch (error) {
          console.error('Error stopping discovery:', error);
          setIsScanning(false);
        }
      }, 15000);

    } catch (error) {
      console.error('Scan error:', error);
      setIsScanning(false);
      
      if (error.message.includes('Permission')) {
        Alert.alert(
          'Permission Required',
          'Location permission is required for Bluetooth scanning. Please grant the permission and try again.',
          [
            { text: 'Cancel' },
            { text: 'Request Permission', onPress: requestPermissions },
          ]
        );
      } else {
        Alert.alert('Scan Error', `Failed to scan for devices: ${error.message}`);
      }
    }
  };

  const testDeviceAsPrinter = async (device) => {
    setTestingDevice(device.address);
    console.log('Testing direct Bluetooth connection:', device);
  
    try {
      console.log('Step 1: Connecting via Bluetooth Classic...');
      
      // Connect directly using Bluetooth Classic
      const connection = await BluetoothClassic.connectToDevice(device.address);
      console.log('Step 2: Bluetooth connection established!');
      
      console.log('Step 3: Sending raw ESC/POS commands...');
      
      // Send raw ESC/POS commands as bytes
      const testData = 
        '\x1B\x40' +                    // ESC @ - Initialize printer
        'Good morning my cotton-picking neighbor!\n' +           // Test text
        'Direct Bluetooth Test\n' +     // More text
        `Device: ${device.name}\n` +    // Device info
        `Address: ${device.address}\n` + // Address info
        '\n\n\n' +                     // Line feeds
        '\x1D\x56\x00';                // GS V 0 - Full cut
  
      const result = await connection.write(testData);
      console.log('Step 4: Data sent successfully:', result);
      
      console.log('Step 5: Disconnecting...');
      await connection.disconnect();
      console.log('Step 6: Disconnected successfully');
  
      Alert.alert(
        '🎉 Direct Bluetooth Success!', 
        'Raw ESC/POS commands worked!\n\nYour Vozy P50 is working with direct Bluetooth connection.'
      );
  
    } catch (error) {
      console.error('Direct Bluetooth failed:', error);
      
      if (error.message.includes('not paired') || error.message.includes('not found')) {
        Alert.alert(
          'Pairing Issue',
          'Make sure the Vozy P50 is:\n• Turned on\n• Paired in Bluetooth settings\n• Not connected to another device'
        );
      } else {
        Alert.alert('Connection Failed', `Direct Bluetooth error: ${error.message}`);
      }
    } finally {
      setTestingDevice(null);
    }
  };

  const renderDevice = ({ item }) => {
    const isTesting = testingDevice === item.address;
    
    return (
      <View style={[
        styles.deviceItem,
        item.paired && styles.pairedDevice,
        item.discovered && !item.paired && styles.discoveredDevice
      ]}>
        <View style={styles.deviceInfo}>
          <Ionicons 
            name={item.paired ? "bluetooth" : "bluetooth-outline"} 
            size={24} 
            color={item.paired ? "#2563eb" : "#6b7280"} 
          />
          <View style={styles.deviceDetails}>
            <Text style={styles.deviceName}>{item.name}</Text>
            <Text style={styles.deviceAddress}>{item.address}</Text>
            <Text style={styles.deviceStatus}>
              {item.paired ? '📱 Paired' : '🔍 Discovered'}
              {item.rssi && ` • Signal: ${item.rssi}dBm`}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[
            styles.testButton,
            isTesting && styles.testingButton,
            !item.paired && styles.discoveredTestButton
          ]}
          onPress={() => testDeviceAsPrinter(item)}
          disabled={isTesting}
        >
          {isTesting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="print" size={16} color="#ffffff" />
              <Text style={styles.testButtonText}>Test Print</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Bluetooth Scanner</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Status Cards */}
        <View style={styles.statusContainer}>
          <View style={styles.statusCard}>
            <Ionicons 
              name={isBluetoothEnabled ? "bluetooth" : "bluetooth-outline"} 
              size={20} 
              color={isBluetoothEnabled ? "#16a34a" : "#dc2626"} 
            />
            <Text style={[
              styles.statusText,
              { color: isBluetoothEnabled ? "#16a34a" : "#dc2626" }
            ]}>
              Bluetooth {isBluetoothEnabled ? 'Enabled' : 'Disabled'}
            </Text>
            {!isBluetoothEnabled && (
              <TouchableOpacity style={styles.enableButton} onPress={enableBluetooth}>
                <Text style={styles.enableButtonText}>Enable</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          style={[
            styles.scanButton,
            (!isBluetoothEnabled || isScanning) && styles.scanButtonDisabled
          ]}
          onPress={scanForDevices}
          disabled={!isBluetoothEnabled || isScanning}
        >
          {isScanning ? (
            <>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.scanButtonText}>Scanning for devices...</Text>
            </>
          ) : (
            <>
              <Ionicons name="scan" size={20} color="#ffffff" />
              <Text style={styles.scanButtonText}>Scan for Bluetooth Devices</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Device List */}
        <View style={styles.deviceSection}>
          <Text style={styles.sectionTitle}>
            Found Devices ({bluetoothDevices.length})
          </Text>
          
          {bluetoothDevices.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bluetooth-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>
                {isScanning ? 'Scanning for devices...' : 'No devices found'}
              </Text>
              <Text style={styles.emptySubtext}>
                {isBluetoothEnabled 
                  ? 'Make sure your printer is discoverable and tap scan'
                  : 'Enable Bluetooth to scan for devices'
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={bluetoothDevices}
              renderItem={renderDevice}
              keyExtractor={(item) => item.address}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  enableButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  enableButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scanButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  scanButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  deviceSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  deviceItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pairedDevice: {
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  discoveredDevice: {
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceDetails: {
    marginLeft: 12,
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  deviceAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  deviceStatus: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  testButton: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  discoveredTestButton: {
    backgroundColor: '#f59e0b',
  },
  testingButton: {
    backgroundColor: '#6b7280',
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default PrintersScreen;