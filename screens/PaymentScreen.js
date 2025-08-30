import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import databaseService from '../src/services/database';
import { SafeAreaView } from 'react-native-safe-area-context';
import BluetoothClassic from 'react-native-bluetooth-classic';

const PaymentScreen = ({ route, navigation }) => {
  const { total, cart } = route.params;
  const [showCashKeypad, setShowCashKeypad] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({});
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [connectedPrinter, setConnectedPrinter] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const isPhone = screenData.width < 768;
  const isSmallPhone = screenData.width < 375;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', (result) => {
      setScreenData(result.window);
    });
    loadConnectedPrinter();
    return () => subscription?.remove();
  }, []);

  // Load saved printer from storage or use your Vozy P50
  const loadConnectedPrinter = async () => {
    // For now, we'll use your working Vozy P50
    // Later you can save/load from AsyncStorage
    const vozyPrinter = {
      address: '5A:4A:D4:66:D2:A4',
      name: 'VOZY P50'
    };
    setConnectedPrinter(vozyPrinter);
  };

  // Print receipt function using the working direct Bluetooth method
  const printReceipt = async (paymentData) => {
    if (!connectedPrinter || isPrinting) return;

    setIsPrinting(true);
    console.log('Printing receipt for payment:', paymentData);

    try {
      // Connect to printer
      const connection = await BluetoothClassic.connectToDevice(connectedPrinter.address);
      console.log('Connected to printer for receipt');

      // Create receipt content
      const receiptData = createReceiptData(paymentData);
      
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

  // Create ESC/POS receipt data with QR code
  const createReceiptData = (paymentData) => {
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
    
    cart.forEach(item => {
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
    
    // Create QR code data (you can customize this)
    const qrData = createQRData(paymentData);
    receiptText += addQRCode(qrData);
    
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

  // Create QR code data - links to your store website
  const createQRData = (paymentData) => {
    return 'https://ceciliakitchencafe.com';
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

  const dynamicStyles = StyleSheet.create({
    denominationButton: {
      width: '23%',
      backgroundColor: '#16a34a',
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      minHeight: isPhone ? 40 : 100,
    },
  });

  const handlePayment = (method) => {
    if (method === 'Gcash' || method === 'BPI') {
      navigation.navigate('QR', { total, method, cart });
    } else if (method === 'Cash') {
      setShowCashKeypad(true);
    } else {
      Alert.alert(
        'Payment Completed',
        `Payment method: ${method}\nTotal: ₱${total}\nTransaction completed!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Menu'),
          },
        ]
      );
    }
  };

  const handleDenominationPress = (value) => {
    const currentAmount = parseFloat(amountReceived) || 0;
    const newAmount = currentAmount + value;
    setAmountReceived(newAmount.toString());
  };

  const handleClearAmount = () => {
    setAmountReceived('');
  };

  const handleCashPayment = async () => {
    const originalReceivedAmount = parseFloat(amountReceived) || 0;
    const totalAmount = parseFloat(total);
    
    const receivedAmount = originalReceivedAmount === 0 ? totalAmount : originalReceivedAmount;
  
    if (originalReceivedAmount > 0 && originalReceivedAmount < totalAmount) {
      Alert.alert('Insufficient Amount', 'The amount received is less than the total.');
      return;
    }
  
    const change = receivedAmount - totalAmount;
  
    try {
      const transactionId = await databaseService.addTransaction(cart, 'cash');
      const paymentData = {
        method: 'Cash',
        total: totalAmount,
        received: receivedAmount,
        change: change,
        status: 'success',
        transactionId: transactionId
      };
      
      setPaymentDetails(paymentData);
      
      // Print receipt after successful payment
      if (connectedPrinter) {
        printReceipt(paymentData);
      }
      
    } catch (error) {
      setPaymentDetails({
        method: 'Cash',
        total: totalAmount,
        received: receivedAmount,
        change: change,
        status: 'error',
        error: error.message
      });
      console.error('Payment failed:', error);
    }
  
    setShowPaymentModal(true);
  };

  const renderDenominations = () => {
    const denominations = [
      { value: 1, label: '₱1' },
      { value: 5, label: '₱5' },
      { value: 10, label: '₱10' },
      { value: 20, label: '₱20' },
      { value: 50, label: '₱50' },
      { value: 100, label: '₱100' },
      { value: 200, label: '₱200'},
      { value: 500, label: '₱500' },
      { value: 1000, label: '₱1000' },
    ];

    return (
      <View style={styles.denominationContainer}>
        <Text style={styles.denominationTitle}>Select Peso Denominations</Text>
        <View style={styles.denominationGrid}>
          {denominations.map((denomination) => (
            <TouchableOpacity
              key={denomination.value}
              style={dynamicStyles.denominationButton}
              onPress={() => handleDenominationPress(denomination.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.denominationButtonText}>{denomination.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAmount}
            activeOpacity={0.7}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const receivedAmount = parseFloat(amountReceived) || 0;
  const totalAmount = parseFloat(total);
  const change = receivedAmount >= totalAmount ? receivedAmount - totalAmount : 0;

  const renderPaymentModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showPaymentModal}
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="checkmark-circle" size={60} color="#16a34a" />
            <Text style={styles.modalTitle}>Payment Completed!</Text>
            {isPrinting && (
              <View style={styles.printingIndicator}>
                <Ionicons name="print" size={20} color="#6b7280" />
                <Text style={styles.printingText}>Printing receipt...</Text>
              </View>
            )}
          </View>

          <View style={styles.modalBody}>
            <View style={styles.paymentDetailRow}>
              <Text style={styles.paymentDetailLabel}>Payment Method:</Text>
              <Text style={styles.paymentDetailValue}>{paymentDetails.method}</Text>
            </View>

            <View style={styles.paymentDetailRow}>
              <Text style={styles.paymentDetailLabel}>Total:</Text>
              <Text style={styles.paymentDetailValue}>₱{paymentDetails.total?.toFixed(2)}</Text>
            </View>

            <View style={styles.paymentDetailRow}>
              <Text style={styles.paymentDetailLabel}>Received:</Text>
              <Text style={styles.paymentDetailValue}>₱{paymentDetails.received?.toFixed(2)}</Text>
            </View>

            <View style={styles.paymentDetailRow}>
              <Text style={styles.paymentDetailLabel}>Change:</Text>
              <Text style={styles.changeAmount}>₱{paymentDetails.change?.toFixed(2)}</Text>
            </View>

            <Text style={styles.transactionComplete}>Transaction completed!</Text>
            
            {connectedPrinter && (
              <Text style={styles.printerStatus}>
                📄 Receipt printed to {connectedPrinter.name}
              </Text>
            )}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowPaymentModal(false);
                navigation.navigate('Menu');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.secondaryButton]}
              onPress={() => navigation.navigate('BluetoothScanner')}
              activeOpacity={0.8}
            >
              <Ionicons name="print" size={16} color="#2563eb" />
              <Text style={[styles.modalButtonText, styles.secondaryButtonText]}>
                Printer Settings
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (showCashKeypad) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Cash Payment</Text>

          <View style={styles.cashPaymentContainer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalText}>Total: ₱{total}</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Amount Received</Text>
              <TextInput
                style={styles.amountInput}
                value={amountReceived ? `₱${amountReceived}` : '₱0'}
                editable={false}
                placeholder="₱0"
              />
            </View>

            <View style={styles.calculationContainer}>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Received:</Text>
                <Text style={styles.calculationValue}>₱{receivedAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Total:</Text>
                <Text style={styles.calculationValue}>₱{totalAmount.toFixed(2)}</Text>
              </View>
              <View style={[styles.calculationRow, styles.changeRow]}>
                <Text style={styles.changeLabel}>Change:</Text>
                <Text style={[styles.changeValue, change >= 0 ? styles.positiveChange : styles.negativeChange]}>
                  ₱{change.toFixed(2)}
                </Text>
              </View>
            </View>

            {renderDenominations()}

            <View style={styles.cashButtonContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowCashKeypad(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.completeButton,
                  receivedAmount > 0 && receivedAmount < totalAmount && styles.disabledButton
                ]}
                onPress={handleCashPayment}
                disabled={receivedAmount > 0 && receivedAmount < totalAmount}
                activeOpacity={0.8}
              >
                <Text style={styles.completeButtonText}>
                  {receivedAmount === 0 ? 'Exact Payment' : 'Complete Payment'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {renderPaymentModal()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Choose Payment Method</Text>
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total: ₱{total}</Text>
        </View>

        {/* Printer Status */}
        {connectedPrinter && (
          <View style={styles.printerStatusCard}>
            <Ionicons name="print" size={20} color="#16a34a" />
            <Text style={styles.printerStatusText}>
              Printer: {connectedPrinter.name} Ready
            </Text>
          </View>
        )}

        <View style={styles.paymentOptions}>
          <TouchableOpacity
            style={[styles.paymentButton, { backgroundColor: '#2563eb' }]}
            onPress={() => handlePayment('Gcash')}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code" size={32} color="#ffffff" />
            <Text style={styles.paymentButtonText}>GCash</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentButton, { backgroundColor: '#dc2626' }]}
            onPress={() => handlePayment('BPI')}
            activeOpacity={0.8}
          >
            <Ionicons name="card" size={32} color="#ffffff" />
            <Text style={styles.paymentButtonText}>BPI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentButton, { backgroundColor: '#16a34a' }]}
            onPress={() => handlePayment('Cash')}
            activeOpacity={0.8}
          >
            <Ionicons name="cash" size={32} color="#ffffff" />
            <Text style={styles.paymentButtonText}>Cash</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentButton, { backgroundColor: '#8b5cf6' }]}
            onPress={() => navigation.navigate('BluetoothScanner')}
            activeOpacity={0.8}
          >
            <Ionicons name="print" size={32} color="#ffffff" />
            <Text style={styles.paymentButtonText}>Printer Settings</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 0.9,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1f2937',
  },
  totalContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  totalText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  printerStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  printerStatusText: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentOptions: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  paymentButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  backButton: {
    backgroundColor: '#6b7280',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Cash payment styles
  cashPaymentContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
  },
  amountInput: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f2937',
  },
  calculationContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calculationLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  calculationValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  changeRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  changeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  changeValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  positiveChange: {
    color: '#16a34a',
  },
  negativeChange: {
    color: '#dc2626',
  },
  // Denomination styles
  denominationContainer: {
    marginBottom: 24,
  },
  denominationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  denominationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  denominationButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent:'center',
    marginBottom: 8,
    maxWidth: 140,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cashButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  completeButton: {
    flex: 2,
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#16a34a',
    marginTop: 12,
  },
  printingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  printingText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  modalBody: {
    width: '100%',
    marginBottom: 24,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  paymentDetailLabel: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  paymentDetailValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  changeAmount: {
    fontSize: 24,
    color: '#16a34a',
    fontWeight: 'bold',
  },
  transactionComplete: {
    fontSize: 18,
    color: '#16a34a',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
  },
  printerStatus: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#2563eb',
    marginLeft: 4,
  },
});

export default PaymentScreen;