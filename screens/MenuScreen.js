import React, { useState } from 'react';
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
const { width } = Dimensions.get('window');

const MenuScreen = ({ navigation }) => {
  const [cart, setCart] = useState([]);

  const menu = {
    'Espresso': [
      { name: 'Sea Salt Latte', price: 180 },
      { name: 'Brown Butter Latte', price: 180 },
      { name: 'Orange Americano', price: 150 },
      { name: 'Cafe Latte', price: 150 },
      { name: 'Americano', price: 120 },
    ],
    'Brewed': [
      { name: 'Iced Vietnamese Latte', price: 120 }
    ],
    'Non-coffee': [
      { name: 'Iced Tea', price: 100 }
    ],
    'Foods': [
      { name: 'Sandwich', price: 180},
      { name: 'Half Sandwich', price: 100}
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
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>
        {/* Menu Section */}
        <ScrollView style={styles.menuSection} showsVerticalScrollIndicator={false}>
          <View style={{display:'flex', flexDirection:'row', justifyContent:'space-evenly', alignItems:'center',gap:2}}>
          <Text style={styles.title}>Cecilia POS</Text>
          <TouchableOpacity onPress={showSales}>
          <Ionicons name="podium-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("ConfigQR", '')}>
          <Ionicons name="settings" size={20} color="gray" />
          </TouchableOpacity>
          </View>
          
          {Object.entries(menu).map(([category, items]) => (
            <View key={category} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <View style={styles.itemGrid}>
                {items.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.menuItem}
                    onPress={() => addToCart(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPrice}>₱{item.price}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Cart Section */}
        <View style={styles.cartSection}>
          <Text style={styles.cartTitle}>Order Summary</Text>
          
          <View style={styles.cartContent}>
            <ScrollView 
              style={styles.cartItems} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.cartItemsContent}
            >
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

            {cart.length > 0 && (
              <View style={styles.cartFooter}>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>₱{getTotalPrice()}</Text>
                </View>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={()=>setCart([])}
                  activeOpacity={0.8}
                ><Ionicons name="trash-bin-sharp" size={10} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.checkoutButton}
                  onPress={handleProceedToPayment}
                  activeOpacity={0.8}
                >
                  <Text style={styles.checkoutButtonText}>Proceed to Payment</Text>
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
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  menuSection: {
    flex: 1,
    flexWrap: 'wrap',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f2937',
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#374151',
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    backgroundColor: '#ffffff',
    width: width * 0.42,
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  cartSection: {
    width: 320,
    backgroundColor: '#ffffff',
    padding: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#e5e7eb',
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
  },
  cartContent: {
    flex: 0.9,
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
  cartFooter: {
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    backgroundColor: '#ffffff',
    gap:20
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
  checkoutButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    width:30,
    backgroundColor: '#dc2626',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MenuScreen;