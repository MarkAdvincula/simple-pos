// ./src/components/TransactionList.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TransactionList = ({ 
  transactions, 
  loading, 
  onRefresh, 
  onDeleteTransaction,
  showDeleteButton = false 
}) => {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleTransactionPress = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const handleDeleteTransaction = (transactionId) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeleteTransaction(transactionId);
            setShowDetailModal(false);
          }
        }
      ]
    );
  };

  const formatDateTime = (datetime) => {
    const date = new Date(datetime);
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const getPaymentMethodIcon = (method) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return 'cash-outline';
      case 'gcash':
        return 'qr-code-outline';
      case 'bpi':
        return 'card-outline';
      default:
        return 'wallet-outline';
    }
  };

  const getPaymentMethodColor = (method) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return '#16a34a';
      case 'gcash':
        return '#2563eb';
      case 'bpi':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const renderTransactionItem = ({ item }) => {
    const { date, time } = formatDateTime(item.transaction_datetime);
    const itemCount = item.items?.length || 0;
    
    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => handleTransactionPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <View style={styles.transactionMeta}>
              <Ionicons 
                name={getPaymentMethodIcon(item.payment_method)} 
                size={16} 
                color={getPaymentMethodColor(item.payment_method)}
              />
              <Text style={styles.paymentMethod}>
                {item.payment_method?.toUpperCase() || 'UNKNOWN'}
              </Text>
              <Text style={styles.itemCount}>• {itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
            </View>
            <Text style={styles.transactionId}>ID: {item.id}</Text>
          </View>
          <View style={styles.transactionAmount}>
            <Text style={styles.amount}>₱{item.total_amount?.toFixed(2)}</Text>
            <View style={styles.dateTimeContainer}>
              <Text style={styles.date}>{date}</Text>
              <Text style={styles.time}>{time}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedTransaction) return null;

    const { date, time } = formatDateTime(selectedTransaction.transaction_datetime);
    
    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Transaction Details</Text>
            {showDeleteButton && (
              <TouchableOpacity
                onPress={() => handleDeleteTransaction(selectedTransaction.id)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={20} color="#dc2626" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Transaction Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={styles.paymentMethodContainer}>
                  <Ionicons 
                    name={getPaymentMethodIcon(selectedTransaction.payment_method)} 
                    size={24} 
                    color={getPaymentMethodColor(selectedTransaction.payment_method)}
                  />
                  <Text style={styles.modalPaymentMethod}>
                    {selectedTransaction.payment_method?.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.modalAmount}>₱{selectedTransaction.total_amount?.toFixed(2)}</Text>
              </View>
              
              <View style={styles.summaryDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transaction ID:</Text>
                  <Text style={styles.detailValue}>{selectedTransaction.id}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{date}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time:</Text>
                  <Text style={styles.detailValue}>{time}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Items:</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction.items?.length || 0} item{selectedTransaction.items?.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* Items List */}
            <View style={styles.itemsCard}>
              <Text style={styles.sectionTitle}>Items</Text>
              {selectedTransaction.items?.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.item_name}</Text>
                    <Text style={styles.itemDetails}>
                      {item.quantity} × ₱{item.unit_price?.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>₱{item.line_total?.toFixed(2)}</Text>
                </View>
              ))}
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>₱{selectedTransaction.total_amount?.toFixed(2)}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No transactions found</Text>
      <Text style={styles.emptyText}>
        Transactions for the selected date will appear here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="refresh" size={32} color="#6b7280" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id.toString()}
        onRefresh={onRefresh}
        refreshing={loading}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={transactions.length === 0 ? styles.emptyContainer : undefined}
      />
      {renderDetailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  transactionItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 6,
  },
  itemCount: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  transactionId: {
    fontSize: 12,
    color: '#9ca3af',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 4,
  },
  dateTimeContainer: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  time: {
    fontSize: 11,
    color: '#9ca3af',
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  deleteButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalPaymentMethod: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#1f2937',
  },
  modalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  summaryDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  itemsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
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
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16a34a',
  },
});

export default TransactionList;