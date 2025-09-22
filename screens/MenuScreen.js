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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScreen } from '../src/contexts/ScreenContext';
import databaseService from '../src/services/database';

const MenuScreen = ({ navigation }) => {
  const [cart, setCart] = useState([]);
  const [menu, setMenu] = useState({});
  const [loading, setLoading] = useState(true);
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
    }, [])
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
      height: isPhone ? (cart.length > 0 ? '40%' : '20%') : '100%',
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
      padding: isPhone ? 8 : 16,
      borderRadius: 8,
      height: isPhone ? 40 : 'auto',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkoutButtonText: {
      color: '#ffffff',
      fontSize: isPhone ? 12 : 18,
      fontWeight: 'bold',
    },
    clearButton: {
      backgroundColor: '#dc2626',
      padding: isPhone ? 4 : 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cartFooter: {
      borderTopWidth: 2,
      borderTopColor: '#e5e7eb',
      paddingTop: 16,
      backgroundColor: '#ffffff',
      gap: isPhone ? 10 : 20,
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
            <TouchableOpacity onPress={showSales}>
              <Ionicons name="podium-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity onPress={showPrinters}>
              <Ionicons name="receipt-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => navigation.navigate('ConfigQR')}>
              <Ionicons name="settings" size={20} color="gray" />
            </TouchableOpacity>
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
                <TouchableOpacity
                  style={dynamicStyles.checkoutButton}
                  onPress={handleProceedToPayment}
                  activeOpacity={0.8}
                >
                  <Text style={dynamicStyles.checkoutButtonText}>Proceed to Payment</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
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
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginBottom: 20,
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
});

export default MenuScreen;