import React, { useState, useEffect } from 'react';
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

const MenuScreen = ({ navigation }) => {
  const [cart, setCart] = useState([]);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  // Update screen dimensions on orientation change
  useEffect(() => {
    const onChange = (result) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  // Determine if device is phone-sized
  const isPhone = screenData.width < 768; // Tablets typically > 768px
  const isSmallPhone = screenData.width < 375;

  const menu = {
    'Espresso': [
      { name: 'Sea Salt Latte', price: 180 },
      { name: 'Orange Americano', price: 150 },
      { name: 'Cafe Latte', price: 150 },
      { name: 'Americano', price: 120 },
    ],
    'Brewed': [
      { name: 'Iced Vietnamese Latte', price: 120 },
      { name: 'Iced Vietnamese Latte', price: 150 }
    ],
    'Non-coffee': [
      { name: 'Iced Tea', price: 100 }
    ],
    'Foods': [
      { name: 'Sandwich', price: 180 },
      { name: 'Half Sandwich', price: 99 },
      { name: 'Chicken Pesto', price: 199 }
    ]
  };

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.name === item.name);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.name === item.name
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemName) => {
    setCart(cart.filter(item => item.name !== itemName));
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleProceedToPayment = () => {
    navigation.navigate('Payment', { cart, total: getTotalPrice() });
  };

  const showSales = async () => {
    navigation.navigate('Records');
  };

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
        (screenData.width - 40) / 2 - 8 : // Phone: 2 columns
        screenData.width * 0.15, // Tablet: original size
      padding: isSmallPhone ? 8 : 12,
      borderRadius: 12,
      marginBottom: 8,
      marginRight: isPhone ? 0 : 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 2,
      borderColor: '#e5e7eb',
    },
    cartSection: {
      minWidth: isPhone ? '100%' : 350,
      height: isPhone ? '20%' : '100%',
      backgroundColor: '#ffffff',
      padding: 16,
      borderLeftWidth: isPhone ? 0 : 2,
      borderTopWidth: isPhone ? 2 : 0,
      borderColor: '#e5e7eb',
    },
    title: {
      fontSize: isSmallPhone ? 20 : 28,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#1f2937',
    },
    categoryTitle: {
      fontSize: isSmallPhone ? 18 : 24,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#374151',
    },
    itemName: {
      fontSize: isSmallPhone ? 10 : 12,
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: 8,
    },
    itemPrice: {
      fontSize: isSmallPhone ? 3 : 10,
      fontWeight: 'bold',
      color: '#2563eb',
    },
    checkoutButtonText: {
      color: '#ffffff',
      fontSize: isPhone ? 12 : 18,
      fontWeight: 'bold',
    },
    checkoutButton: {
      backgroundColor: '#2563eb',
      padding: isPhone ? 8 : 16,
      borderRadius: 8,
      height: isPhone ? 40 : 80,
      justifyContent: 'center'
    },
    clearButton: {
      width: 30,
      height: isPhone ? 20 : 40,
      backgroundColor: '#dc2626',
      padding: isPhone ? 4 : 8,
      borderRadius: 8,
      alignItems: 'center',
    },
    cartFooter: {
      borderTopWidth: 2,
      borderTopColor: '#e5e7eb',
      paddingTop: 16,
      backgroundColor: 'white',
      gap: 20,
      flexDirection: isPhone ? 'row' : 'column',
      justifyContent: 'space-between'
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
            <TouchableOpacity onPress={() => navigation.navigate("ConfigQR", '')}>
              <Ionicons name="settings" size={20} color="gray" />
            </TouchableOpacity>
          </View>

          {Object.entries(menu).map(([category, items]) => (
            <View key={category} style={styles.categoryContainer}>
              <Text style={dynamicStyles.categoryTitle}>{category}</Text>
              <View style={dynamicStyles.itemGrid}>
                {items.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={dynamicStyles.menuItem}
                    onPress={() => addToCart(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={dynamicStyles.itemName}>{item.name}</Text>
                    <Text style={dynamicStyles.itemPrice}>₱{item.price}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Cart Section */}
        <View style={[dynamicStyles.cartSection, isPhone && cart.length > 0 ? { height: '40%' } : {}]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <Text style={styles.cartTitle}>Order Summary</Text>
            {isPhone && cart.length > 0 && <TouchableOpacity
              style={dynamicStyles.clearButton}
              onPress={() => setCart([])}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-bin-sharp" size={10} color="white" />
            </TouchableOpacity>}
          </View>
          <View style={styles.cartContent}>
            <ScrollView
              style={styles.cartItems}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.cartItemsContent,
                isPhone ? { flexDirection: 'column-reverse' } : {}
              ]}>
              {cart.length === 0 ? (
                <Text style={styles.emptyCart}>No items in cart</Text>
              ) : (
                cart.map((item, index) => (
                  <View key={index} style={styles.cartItem}>
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
            {!isPhone && cart.length > 0 && (
              <TouchableOpacity
                style={{
                  backgroundColor: '#dc2626',
                  padding: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginVertical: 10,
                }}
                onPress={() => setCart([])}
                activeOpacity={0.8}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                  Clear Cart
                </Text>
              </TouchableOpacity>
            )}
            {cart.length > 0 && (
              <View style={dynamicStyles.cartFooter}>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}> ₱{getTotalPrice()}</Text>
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
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    gap: 2,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
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
    marginBottom: 16,
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



});

export default MenuScreen;