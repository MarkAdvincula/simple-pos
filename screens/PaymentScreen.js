// ./screens/PaymentScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Services  
import transactionService from '../src/services/transactionService';
import printerService from '../src/services/printerService';

// Components
import PaymentModal from '../src/components/PaymentModal';
import PaymentCash from '../src/components/PaymentCash';

const PaymentScreen = ({ route, navigation }) => {
  const { total, cart } = route.params;
  const [showCashKeypad, setShowCashKeypad] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({});
  const [connectedPrinter, setConnectedPrinter] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    loadPrinter();
  }, []);

  const loadPrinter = async () => {
    try {
      const printer = await printerService.loadStoredPrinter();
      setConnectedPrinter(printer);
    } catch (error) {
      console.error('Error loading printer:', error);
    }
  };

  const handlePayment = (method) => {
    if (method === 'Gcash' || method === 'BPI') {
      navigation.navigate('QR', { total, method, cart });
    } else if (method === 'Cash') {
      setShowCashKeypad(true);
    } else {
      // Handle other payment methods
      processPayment(method);
    }
  };

  const handleCashPayment = async ({ received, change, isExactPayment }) => {
    const totalAmount = parseFloat(total);
    
    try {
      // Process transaction using transaction service
      const transactionResult = await transactionService.processCashTransaction(
        cart, 
        totalAmount, 
        received, 
        change
      );

      if (transactionResult.success) {
        // Create receipt data
        const receiptData = transactionService.createReceiptData(transactionResult, cart);
        setPaymentDetails(receiptData);
        
        // Print receipt after successful payment
        await printReceipt(receiptData);
      } else {
        // Handle transaction failure
        setPaymentDetails({
          method: 'Cash',
          total: totalAmount,
          received: received,
          change: change,
          status: 'error',
          error: transactionResult.error
        });
      }

    } catch (error) {
      console.error('Cash payment failed:', error);
      setPaymentDetails({
        method: 'Cash',
        total: totalAmount,
        received: received,
        change: change,
        status: 'error',
        error: error.message
      });
    }

    setShowCashKeypad(false);
    setShowPaymentModal(true);
  };

  const processPayment = async (method, additionalData = {}) => {
    try {
      // Process transaction using transaction service
      const transactionResult = await transactionService.processDigitalPayment(
        cart, 
        total, 
        method, 
        additionalData
      );

      if (transactionResult.success) {
        // Create receipt data
        const receiptData = transactionService.createReceiptData(transactionResult, cart);
        setPaymentDetails(receiptData);
        
        // Print receipt after successful payment
        await printReceipt(receiptData);
        
        setShowPaymentModal(true);
      } else {
        throw new Error(transactionResult.error || 'Transaction failed');
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
      Alert.alert('Payment Error', 'Failed to process payment. Please try again.');
    }
  };

  const printReceipt = async (paymentData) => {
    if (!printerService.isPrinterAvailable()) {
      console.log('No printer available for receipt printing');
      return;
    }

    setIsPrinting(true);
    
    try {
      const result = await printerService.printReceipt(paymentData, cart);
      if (!result.success) {
        console.error('Print failed:', result.error);
      }
    } catch (error) {
      console.error('Print error:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleModalClose = () => {
    setShowPaymentModal(false);
    navigation.navigate('Menu');
  };

  const handlePrinterSettings = () => {
    setShowPaymentModal(false);
    navigation.navigate('BluetoothScanner');
  };

  if (showCashKeypad) {
    return (
      <SafeAreaView style={styles.container}>
        <PaymentCash
          total={total}
          onBack={() => setShowCashKeypad(false)}
          onComplete={handleCashPayment}
        />
        <PaymentModal
          visible={showPaymentModal}
          paymentDetails={paymentDetails}
          isPrinting={isPrinting}
          connectedPrinter={connectedPrinter}
          onClose={handleModalClose}
          onPrinterSettings={handlePrinterSettings}
        />
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

      <PaymentModal
        visible={showPaymentModal}
        paymentDetails={paymentDetails}
        isPrinting={isPrinting}
        connectedPrinter={connectedPrinter}
        onClose={handleModalClose}
        onPrinterSettings={handlePrinterSettings}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
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
});

export default PaymentScreen;