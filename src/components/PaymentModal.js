// ./src/components/PaymentModal.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PaymentModal = ({ 
  visible, 
  paymentDetails, 
  isPrinting, 
  connectedPrinter, 
  onClose, 
  onPrinterSettings 
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
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

            {paymentDetails.received && (
              <View style={styles.paymentDetailRow}>
                <Text style={styles.paymentDetailLabel}>Received:</Text>
                <Text style={styles.paymentDetailValue}>₱{paymentDetails.received?.toFixed(2)}</Text>
              </View>
            )}

            {paymentDetails.change !== undefined && (
              <View style={styles.paymentDetailRow}>
                <Text style={styles.paymentDetailLabel}>Change:</Text>
                <Text style={styles.changeAmount}>₱{paymentDetails.change?.toFixed(2)}</Text>
              </View>
            )}

            <Text style={styles.transactionComplete}>Transaction completed!</Text>

            {connectedPrinter && (
              <Text style={styles.printerStatus}>
                Receipt printed to {connectedPrinter.name}
              </Text>
            )}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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

export default PaymentModal;