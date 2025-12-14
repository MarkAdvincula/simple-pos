import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import databaseService from '../src/services/database';

const QueueScreen = ({ navigation }) => {
  const [queuedOrders, setQueuedOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadQueuedOrders();
    }, [])
  );

  const loadQueuedOrders = async () => {
    try {
      setLoading(true);
      const orders = await databaseService.getQueuedOrders();
      setQueuedOrders(orders);
    } catch (error) {
      console.error('Error loading queued orders:', error);
      Alert.alert('Error', 'Failed to load queued orders');
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (orders) => {
    const grouped = {};
    orders.forEach(order => {
      const date = order.created_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(order);
    });
    return grouped;
  };

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };


  const loadToCart = async (queue) => {
    try {
      // Transform queue items to cart format
      const cartItems = queue.items.map(item => ({
        name: item.item_name,
        price: item.unit_price,
        quantity: item.quantity,
      }));

      // Delete from queue
      await databaseService.deleteQueuedOrder(queue.id);

      // Navigate to Menu with cart items
      navigation.navigate('Menu', { loadedCart: cartItems });
    } catch (error) {
      console.error('Error loading to cart:', error);
      Alert.alert('Error', 'Failed to load order to cart');
    }
  };

  const proceedToPayment = async (queue) => {
    try {
      // Transform queue items to cart format
      const cartItems = queue.items.map(item => ({
        name: item.item_name,
        price: item.unit_price,
        quantity: item.quantity,
      }));

      // Delete from queue
      await databaseService.deleteQueuedOrder(queue.id);

      // Navigate directly to Payment
      navigation.navigate('Payment', {
        cart: cartItems,
        total: queue.total_amount,
      });
    } catch (error) {
      console.error('Error proceeding to payment:', error);
      Alert.alert('Error', 'Failed to proceed to payment');
    }
  };

  const groupedOrders = groupByDate(queuedOrders);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Queued Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : queuedOrders.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Queued Orders</Text>
            <Text style={styles.emptyText}>
              Queue orders from the menu to see them here
            </Text>
          </View>
        ) : (
          Object.keys(groupedOrders).map((date) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{formatDateHeader(date)}</Text>
              <View style={styles.cardGrid}>
                {groupedOrders[date].map((queue) => (
                  <View key={queue.id} style={styles.queueCard}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="person" size={20} color="#2563eb" />
                      <Text style={styles.queueName}>{queue.queue_name}</Text>
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.cardDetails}>
                        <View style={styles.detailRow}>
                          <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                          <Text style={styles.detailText}>
                            {new Date(queue.created_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Ionicons name="time-outline" size={14} color="#6b7280" />
                          <Text style={styles.detailText}>{queue.created_time}</Text>
                        </View>
                      </View>
                      <View style={styles.itemsList}>
                        {queue.items.map((item, idx) => (
                          <View key={idx} style={styles.itemRow}>
                            <Text style={styles.itemText} numberOfLines={1}>
                              {item.quantity}x {item.item_name}
                            </Text>
                            <Text style={styles.itemPrice}>₱{item.line_total}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <View style={styles.cardFooter}>
                      <View style={styles.footerLeft}>
                        <Ionicons name="cart-outline" size={14} color="#6b7280" />
                        <Text style={styles.itemCount}>{queue.item_count}</Text>
                      </View>
                      <View style={styles.footerButtons}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => loadToCart(queue)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="cart" size={16} color="#2563eb" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => proceedToPayment(queue)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="cash" size={16} color="#16a34a" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.totalAmount}>₱{queue.total_amount}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
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
  backButton: {
    padding: 8,
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  queueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: 280,
    minWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  queueName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  cardBody: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  cardDetails: {
    gap: 6,
    flex: 0,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemsList: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 6,
    gap: 3,
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  itemText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  itemPrice: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemCount: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2563eb',
  },
});

export default QueueScreen;
