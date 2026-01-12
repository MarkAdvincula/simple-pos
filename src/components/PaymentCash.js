// ./src/components/PaymentCash.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useScreen } from '../contexts/ScreenContext';

const PaymentCash = ({ total, cart = [], onBack, onComplete, isPrinting = false, isProcessingPayment = false }) => {
  const [amountReceived, setAmountReceived] = useState('');
  const { isLargeTablet } = useScreen();

  // Helper function to calculate item total with options
  const calculateItemTotal = (item) => {
    let total = item.price;
    if (item.selectedOptions) {
      Object.values(item.selectedOptions).forEach(choices => {
        choices.forEach(choice => {
          total += choice.price;
        });
      });
    }
    return total * item.quantity;
  };

  const handleDenominationPress = (value) => {
    const currentAmount = parseFloat(amountReceived) || 0;
    const newAmount = currentAmount + value;
    setAmountReceived(newAmount.toString());
  };

  const handleClearAmount = () => {
    setAmountReceived('');
  };

  const handleComplete = () => {
    const originalReceivedAmount = parseFloat(amountReceived) || 0;
    const totalAmount = parseFloat(total);
    const receivedAmount = originalReceivedAmount === 0 ? totalAmount : originalReceivedAmount;

    if (originalReceivedAmount > 0 && originalReceivedAmount < totalAmount) {
      return; // This should be handled by the disabled state
    }

    const change = receivedAmount - totalAmount;
    
    onComplete({
      received: receivedAmount,
      change: change,
      isExactPayment: originalReceivedAmount === 0
    });
  };

  const renderDenominations = () => {
    const denominations = [
      { value: 1, label: '₱1' },
      { value: 5, label: '₱5' },
      { value: 10, label: '₱10' },
      { value: 20, label: '₱20' },
      { value: 50, label: '₱50' },
      { value: 100, label: '₱100' },
      { value: 200, label: '₱200' },
      { value: 500, label: '₱500' },
      { value: 1000, label: '₱1000' },
    ];

    return (
      <View style={styles.denominationContainer}>
        <View style={[styles.denominationGrid, isLargeTablet && styles.tabletGrid]}>
          {denominations.map((denomination) => (
            <TouchableOpacity
              key={denomination.value}
              style={[styles.denominationButton, isLargeTablet && styles.tabletButton]}
              onPress={() => handleDenominationPress(denomination.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.denominationButtonText}>{denomination.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.clearButton, isLargeTablet && styles.tabletClearButton]}
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
  const isInsufficientAmount = receivedAmount > 0 && receivedAmount < totalAmount;

  const PaymentInfo = () => (
    <>
      <View style={[styles.totalContainer, isLargeTablet && styles.tabletTotalContainer]}>
        <Text style={styles.totalText}>Total: ₱{total}</Text>
      </View>

      {/* Items List */}
      {cart && cart.length > 0 && (
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items to Purchase</Text>
          <ScrollView style={styles.itemsList} nestedScrollEnabled={true}>
            {cart.map((item, index) => (
              <View key={index} style={styles.cartItem}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemTotal}>₱{calculateItemTotal(item).toFixed(2)}</Text>
                </View>

                {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                  <View style={styles.optionsContainer}>
                    {Object.entries(item.selectedOptions).map(([groupName, choices], idx) => (
                      <Text key={idx} style={styles.optionText}>
                        • {choices.map(c => `${c.name}${c.price > 0 ? ` (+₱${c.price.toFixed(2)})` : ''}`).join(', ')}
                      </Text>
                    ))}
                  </View>
                )}

                <Text style={styles.itemQuantity}>
                  ₱{item.price.toFixed(2)} x {item.quantity}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

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
    </>
  );

  const ActionButtons = () => {
    const isDisabled = isInsufficientAmount || isPrinting || isProcessingPayment;
    const buttonText = isPrinting ? 'Printing...' :
                      isProcessingPayment ? 'Processing...' :
                      receivedAmount === 0 ? 'Exact Payment' : 'Complete Payment';

    return (
      <View style={styles.cashButtonContainer}>
        <TouchableOpacity
          style={[
            styles.backButton,
            (isPrinting || isProcessingPayment) && styles.disabledButton
          ]}
          onPress={onBack}
          activeOpacity={0.8}
          disabled={isPrinting || isProcessingPayment}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.completeButton,
            isDisabled && styles.disabledButton
          ]}
          onPress={handleComplete}
          disabled={isDisabled}
          activeOpacity={0.8}
        >
          <View style={styles.completeButtonContent}>
            {(isPrinting || isProcessingPayment) && (
              <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.completeButtonText}>
              {buttonText}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLargeTablet) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Cash Payment</Text>
        <View style={styles.tabletLayout}>
          <View style={styles.leftColumn}>
            <PaymentInfo />
          </View>
          <View style={styles.rightColumn}>
            {renderDenominations()}
            <ActionButtons />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cash Payment</Text>
      <ScrollView style={styles.phoneLayout}>
        <PaymentInfo />
        {renderDenominations()}
        <ActionButtons />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1f2937',
  },
  phoneLayout: {
    flex: 1,
  },
  tabletLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  leftColumn: {
    flex: 0.6,
    justifyContent: 'space-evenly',
  },
  rightColumn: {
    flex: 0.4,
    justifyContent: 'space-between',
  },
  totalContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  tabletTotalContainer: {
    marginBottom: 30,
    padding: 20,
  },
  totalText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  itemsSection: {
    marginBottom: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  itemsList: {
    maxHeight: 200,
  },
  cartItem: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  optionsContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 11,
    color: '#7c3aed',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  itemQuantity: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
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
  denominationContainer: {
    marginBottom: 24,
  },
  denominationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tabletGrid: {
    marginBottom: 30,
    flex: 1,
  },
  denominationButton: {
    width: '23%',
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 80,
  },
  tabletButton: {
    width: '30%',
    padding: 20,
    minHeight: 100,
    marginBottom: 15,
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
    justifyContent: 'center',
    marginBottom: 8,
    width: '23%',
    minHeight: 80,
  },
  tabletClearButton: {
    width: '30%',
    padding: 20,
    minHeight: 100,
    marginBottom: 15,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cashButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
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
  completeButton: {
    flex: 2,
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
});

export default PaymentCash;