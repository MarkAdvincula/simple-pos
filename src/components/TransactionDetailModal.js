// ./src/components/TransactionDetailModal.js
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TransactionDetailModal = ({
  visible,
  transaction,
  onClose,
  onStatusUpdate
}) => {
  const [selectedStatus, setSelectedStatus] = useState('');

  const statusOptions = [
    { value: 'COMPLETED', label: 'Completed', color: '#16a34a' },
    { value: 'VOID', label: 'Void', color: '#dc2626' },
    { value: 'HOUSE', label: 'House', color: '#2563eb' },
  ];

  useEffect(() => {
    if (transaction) {
      setSelectedStatus(transaction.status || 'COMPLETED');
    }
  }, [transaction]);

  if (!transaction) return null;

  const formatDateTime = (datetime) => {
    const date = new Date(datetime);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const { date, time } = formatDateTime(transaction.transaction_datetime);

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
  };

  const handleSave = () => {
    if (selectedStatus !== transaction.status) {
      Alert.alert(
        'Update Status',
        `Are you sure you want to change the status from "${transaction.status || 'COMPLETED'}" to "${selectedStatus}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update',
            style: 'default',
            onPress: () => onStatusUpdate(transaction.id, selectedStatus)
          }
        ]
      );
    } else {
      onClose();
    }
  };

  const getStatusColor = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.color : '#6b7280';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Transaction Details</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Transaction Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transaction Information</Text>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Transaction ID:</Text>
                <Text style={styles.value}>#{transaction.id}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Date:</Text>
                <Text style={styles.value}>{date}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Time:</Text>
                <Text style={styles.value}>{time}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Payment Method:</Text>
                <Text style={styles.value}>{transaction.payment_method}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Total Amount:</Text>
                <Text style={[styles.value, styles.totalAmount]}>
                  ₱{transaction.total_amount?.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Items Ordered</Text>
              {transaction.items && transaction.items.length > 0 ? (
                transaction.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.item_name}</Text>
                      <Text style={styles.itemDetails}>
                        {item.quantity}x ₱{item.unit_price?.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>
                      ₱{item.line_total?.toFixed(2)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noItems}>No items found</Text>
              )}
            </View>

            {/* Status Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transaction Status</Text>
              <Text style={styles.statusDescription}>
                Select the appropriate status for this transaction:
              </Text>

              <View style={styles.statusOptions}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusOption,
                      selectedStatus === option.value && {
                        backgroundColor: option.color,
                        borderColor: option.color,
                      }
                    ]}
                    onPress={() => handleStatusChange(option.value)}
                  >
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: option.color }
                    ]} />
                    <Text style={[
                      styles.statusLabel,
                      selectedStatus === option.value && styles.selectedStatusLabel
                    ]}>
                      {option.label}
                    </Text>
                    {selectedStatus === option.value && (
                      <Ionicons name="checkmark" size={20} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.statusHelp}>
                <Text style={styles.helpTitle}>Status Descriptions:</Text>
                <Text style={styles.helpText}>• <Text style={styles.helpBold}>Completed:</Text> Regular successful transaction</Text>
                <Text style={styles.helpText}>• <Text style={styles.helpBold}>Void:</Text> Cancelled/voided transaction</Text>
                <Text style={styles.helpText}>• <Text style={styles.helpBold}>House:</Text> Internal consumption (owner/staff/partner)</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                selectedStatus !== transaction.status && styles.saveButtonActive
              ]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>
                {selectedStatus !== transaction.status ? 'Update Status' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '98%',
    maxWidth: 700,
    height: '95%',
    maxHeight: '95%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 12,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  totalAmount: {
    fontSize: 18,
    color: '#16a34a',
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  noItems: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  statusDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  statusOptions: {
    gap: 12,
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    minHeight: 60,
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 16,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
  },
  selectedStatusLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  statusHelp: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  helpTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
    marginBottom: 4,
  },
  helpBold: {
    fontWeight: '600',
    color: '#374151',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 2,
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#6b7280',
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  saveButtonActive: {
    backgroundColor: '#2563eb',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default TransactionDetailModal;