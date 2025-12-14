import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScreen } from '../src/contexts/ScreenContext';
import databaseService from '../src/services/database';

const MenuScreen = ({ navigation, route }) => {
  const [cart, setCart] = useState([]);
  const [menu, setMenu] = useState({});
  const [loading, setLoading] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [queueName, setQueueName] = useState('');
  const screenDataRef = useRef(Dimensions.get('window'));
  const {isPhone, isSmallPhone,isLargeTablet} = useScreen();

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', (result) => {
      screenDataRef.current = result.window;
    });
    return () => subscription?.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMenuFromDatabase();
      loadQueueCount();

      // Handle loaded cart from Queue screen
      if (route.params?.loadedCart) {
        setCart(route.params.loadedCart);
        // Clear the param to prevent reloading on next focus
        navigation.setParams({ loadedCart: undefined });
      }
    }, [route.params?.loadedCart])
  );

  const loadMenuFromDatabase = async () => {
    try {
      setLoading(true);
      const categoriesData = await databaseService.getCategoriesWithItems();

      // Transform database data to match menu format
      const transformedMenu = {};
      categoriesData.forEach(category => {
        transformedMenu[category.category_name] = category.items.map(item => ({
          name: item.item_name,
          price: item.price
        }));
      });

      setMenu(transformedMenu);
    } catch (error) {
      console.error('Error loading menu from database:', error);
      // Fallback to empty menu if database fails
      setMenu({});
    } finally {
      setLoading(false);
    }
  };

  const loadQueueCount = async () => {
    try {
      const count = await databaseService.getQueueCount();
      setQueueCount(count);
    } catch (error) {
      console.error('Error loading queue count:', error);
    }
  };

  const handleQueueOrder = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before queueing');
      return;
    }
    setShowQueueModal(true);
  };

  const saveQueue = async () => {
    if (!queueName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for this queue');
      return;
    }

    try {
      await databaseService.addQueuedOrder(queueName.trim(), cart, getTotalPrice);
      setShowQueueModal(false);
      setQueueName('');
      clearCart();
      loadQueueCount();
      Alert.alert('Success', 'Order queued successfully');
    } catch (error) {
      console.error('Error saving queue:', error);
      Alert.alert('Error', 'Failed to queue order');
    }
  };

  const showQueues = () => {
    navigation.navigate('Queue');
  };




  const addToCart = useCallback((item) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.name === item.name);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.name === item.name
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  }, []);

  const removeFromCart = useCallback((itemName) => {
    setCart(prevCart => prevCart.filter(item => item.name !== itemName));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const getTotalPrice = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  const handleProceedToPayment = useCallback(() => {
    navigation.navigate('Payment', { cart, total: getTotalPrice });
  }, [cart, getTotalPrice, navigation]);

  const showSales = useCallback(() => {
    navigation.navigate('Records');
  }, [navigation]);

  const showPrinters = useCallback(() => {
    navigation.navigate('Printers');
  }, [navigation]);

  // Dynamic styles based on screen size
  const dynamicStyles = StyleSheet.create({
    mainContainer: {
      flex: 1,
      flexDirection: isPhone ? 'column' : 'row',
    },
    menuSection: {
      flex: isPhone ? 0.6 : 1,
      padding: isSmallPhone ? 12 : 16,
    },
    itemGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: isPhone ? 'space-between' : 'flex-start',
    },
    menuItem: {
      backgroundColor: '#ffffff',
      width: isPhone ?
        (screenData.width - 40) / 2 - 8 :
        isLargeTablet ? 200 : screenData.width * 0.15,
      height: 100,
      padding: isSmallPhone ? 8 : 5,
      borderRadius: 12,
      marginRight: isPhone ? 0 : 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 2,
      borderColor: '#e5e7eb',
      justifyContent:'center',
      alignItems: 'center',
    },
    cartSection: {
      minWidth: isPhone ? '100%' : 350,
      height: isPhone ? (cart.length > 0 ? '40%' : '20%') : '95%',
      backgroundColor: '#ffffff',
      padding: 16,
      borderLeftWidth: isPhone ? 0 : 2,
      borderTopWidth: isPhone ? 2 : 0,
      borderColor: '#e5e7eb',
    },
    title: {
      fontSize: isSmallPhone ? 20 : 28,
      fontWeight: 'bold',
      color: '#1f2937',
    },
    categoryTitle: {
      fontSize: isSmallPhone ? 18 : 24,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#374151',
    },
    itemName: {
      fontSize: isSmallPhone ? 10 : 15,
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: 8,
      textAlign:'center'
    },
    itemPrice: {
      fontSize: isSmallPhone ? 8 : 10, // Fixed from 3 to 8
      fontWeight: 'bold',
      color: '#2563eb',
    },
    checkoutButton: {
      backgroundColor: '#2563eb',
      padding: isPhone ? 8 : 12,
      borderRadius: 8,
      height: isPhone ? 40 : 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkoutButtonText: {
      color: '#ffffff',
      fontSize: isPhone ? 12 : 16,
      fontWeight: 'bold',
    },
    clearButton: {
      backgroundColor: '#dc2626',
      padding: isPhone ? 4 : 10,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cartFooter: {
      borderTopWidth: 2,
      borderTopColor: '#e5e7eb',
      paddingTop: 12,
      backgroundColor: '#ffffff',
      gap: isPhone ? 10 : 12,
      flexDirection: isPhone ? 'row' : 'column',
      justifyContent: 'space-between',
      alignItems: isPhone ? 'center' : 'stretch',
    },
    loadingText: {
      fontSize: 16,
      color: '#6b7280',
      textAlign: 'center',
    },
    emptyMenuTitle: {
      fontSize: isPhone ? 18 : 24,
      fontWeight: 'bold',
      color: '#374151',
      marginTop: 16,
      textAlign: 'center',
    },
    emptyMenuText: {
      fontSize: isPhone ? 14 : 16,
      color: '#6b7280',
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 24,
      paddingHorizontal: 20,
    },
    goToMaintenanceButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#2e7d32',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
    },
    goToMaintenanceText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={dynamicStyles.mainContainer}>
        {/* Menu Section */}
        <ScrollView style={dynamicStyles.menuSection} showsVerticalScrollIndicator={false}>
          <View style={styles.headerContainer}>
            <Text style={dynamicStyles.title}>Cecilia POS</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={showSales}
                activeOpacity={0.7}
              >
                <Ionicons name="analytics" size={18} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.headerButton,
                  queueCount === 0 && styles.headerButtonDisabled
                ]}
                onPress={showQueues}
                activeOpacity={0.7}
                disabled={queueCount === 0}
              >
                <Ionicons
                  name="list"
                  size={18}
                  color={queueCount === 0 ? '#d1d5db' : '#6b7280'}
                />
                {queueCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{queueCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={showPrinters}
                activeOpacity={0.7}
              >
                <Ionicons name="print" size={18} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => navigation.navigate('ConfigQR')}
                activeOpacity={0.7}
              >
                <Ionicons name="settings" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={dynamicStyles.loadingText}>Loading menu...</Text>
            </View>
          ) : Object.keys(menu).length === 0 ? (
            <View style={styles.emptyMenuContainer}>
              <Ionicons name="restaurant-outline" size={64} color="#9ca3af" />
              <Text style={dynamicStyles.emptyMenuTitle}>No Menu Items</Text>
              <Text style={dynamicStyles.emptyMenuText}>
                Add categories and items in the Maintenance screen to get started.
              </Text>
              <TouchableOpacity
                style={dynamicStyles.goToMaintenanceButton}
                onPress={() => navigation.navigate('Maintenance')}
              >
                <Ionicons name="settings-outline" size={20} color="white" />
                <Text style={dynamicStyles.goToMaintenanceText}>Go to Maintenance</Text>
              </TouchableOpacity>
            </View>
          ) : (
            Object.entries(menu).map(([category, items]) => (
              <View key={category} style={styles.categoryContainer}>
                <Text style={dynamicStyles.categoryTitle}>{category}</Text>
                <View style={dynamicStyles.itemGrid}>
                  {items.map((item, index) => (
                    <TouchableOpacity
                      key={`${category}-${index}`}
                      style={dynamicStyles.menuItem}
                      onPress={() => addToCart(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={dynamicStyles.itemName}>{item.name}</Text>
                      <Text style={dynamicStyles.itemPrice}>P{item.price.toFixed(2)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Cart Section */}
        <View style={dynamicStyles.cartSection}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Order Summary</Text>
            {isPhone && cart.length > 0 && (
              <TouchableOpacity
                style={[dynamicStyles.clearButton, { width: 30, height: 20 }]}
                onPress={clearCart}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-bin-sharp" size={10} color="white" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.cartContent}>
            <ScrollView
              style={styles.cartItems}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.cartItemsContent,
                isPhone && { flexDirection: 'column-reverse' }
              ]}
            >
              {cart.length === 0 ? (
                <Text style={styles.emptyCart}>No items in cart</Text>
              ) : (
                cart.map((item, index) => (
                  <View key={`cart-${index}`} style={styles.cartItem}>
                    <View style={styles.cartItemDetails}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemQuantity}>
                        ₱{item.price} x {item.quantity}
                      </Text>
                    </View>
                    <View style={styles.cartItemRight}>
                      <Text style={styles.cartItemTotal}>₱{item.price * item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => removeFromCart(item.name)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="close" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Clear button for tablets */}
            {!isPhone && cart.length > 0 && (
              <TouchableOpacity
                style={[dynamicStyles.clearButton, { marginVertical: 10 }]}
                onPress={clearCart}
                activeOpacity={0.8}
              >
                <Text style={styles.clearButtonText}>Clear Cart</Text>
              </TouchableOpacity>
            )}

            {/* Cart Footer */}
            {cart.length > 0 && (
              <View style={dynamicStyles.cartFooter}>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>₱{getTotalPrice}</Text>
                </View>
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={[dynamicStyles.checkoutButton, { flex: 1 }]}
                    onPress={handleProceedToPayment}
                    activeOpacity={0.8}
                  >
                    <Text style={dynamicStyles.checkoutButtonText}>Proceed to Payment</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.queueButton}
                    onPress={handleQueueOrder}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={20} color="#2563eb" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Queue Name Modal */}
      <Modal
        visible={showQueueModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQueueModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Queue Order</Text>
            <Text style={styles.modalSubtitle}>Enter a name for this order</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Mark"
              value={queueName}
              onChangeText={setQueueName}
              autoFocus={true}
              onSubmitEditing={saveQueue}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowQueueModal(false);
                  setQueueName('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={saveQueue}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryContainer: {
    marginBottom: 24,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cartContent: {
    flex: 1,
  },
  cartItems: {
    flex: 1,
  },
  cartItemsContent: {
    paddingBottom: 16,
  },
  emptyCart: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 32,
    fontSize: 16,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cartItemDetails: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cartItemQuantity: {
    fontSize: 12,
    color: '#6b7280',
  },
  cartItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
    color: '#1f2937',
  },
  removeButton: {
    padding: 4,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyMenuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  queueButton: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: 48,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: 340,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonSave: {
    backgroundColor: '#2563eb',
  },
  modalButtonTextCancel: {
    color: '#374151',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonTextSave: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MenuScreen;