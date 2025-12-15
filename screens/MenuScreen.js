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

  // Option groups states
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemOptionGroups, setItemOptionGroups] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});

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
          id: item.id,
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




  const handleItemPress = async (item) => {
    try {
      // Check if item has option groups
      const optionGroups = await databaseService.getItemOptionGroups(item.id);

      if (optionGroups && optionGroups.length > 0) {
        // Item has option groups, show selection modal
        setSelectedItem(item);
        setItemOptionGroups(optionGroups);
        setSelectedOptions({});
        setShowOptionsModal(true);
      } else {
        // No option groups, add directly to cart
        addToCart(item);
      }
    } catch (error) {
      console.error('Error checking option groups:', error);
      // On error, just add to cart directly
      addToCart(item);
    }
  };

  const addToCart = useCallback((item, options = null) => {
    setCart(prevCart => {
      const cartItem = options
        ? { ...item, quantity: 1, selectedOptions: options }
        : { ...item, quantity: 1 };

      // If item has options, treat each combination as unique
      if (options) {
        return [...prevCart, cartItem];
      }

      // For items without options, check for existing and increment
      const existingItem = prevCart.find(cartItem =>
        cartItem.name === item.name && !cartItem.selectedOptions
      );

      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.name === item.name && !cartItem.selectedOptions
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, cartItem];
      }
    });
  }, []);

  const removeFromCart = useCallback((index) => {
    setCart(prevCart => prevCart.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const getTotalPrice = useMemo(() => {
    return cart.reduce((total, item) => {
      let itemTotal = item.price;

      // Add option prices if they exist
      if (item.selectedOptions) {
        Object.values(item.selectedOptions).forEach(choices => {
          choices.forEach(choice => {
            itemTotal += choice.price;
          });
        });
      }

      return total + (itemTotal * item.quantity);
    }, 0);
  }, [cart]);

  // Handle option choice selection
  const toggleOptionChoice = (groupId, choiceId, selectionType) => {
    setSelectedOptions(prev => {
      const newSelections = { ...prev };

      if (selectionType === 'single') {
        // For single select, replace the selection
        newSelections[groupId] = [choiceId];
      } else {
        // For multiple select, toggle the choice
        const currentSelections = newSelections[groupId] || [];
        if (currentSelections.includes(choiceId)) {
          newSelections[groupId] = currentSelections.filter(id => id !== choiceId);
        } else {
          newSelections[groupId] = [...currentSelections, choiceId];
        }
      }

      return newSelections;
    });
  };

  // Calculate total price with selected options
  const calculateTotalWithOptions = () => {
    if (!selectedItem) return 0;

    let total = selectedItem.price;

    // Add prices from selected options
    itemOptionGroups.forEach(group => {
      const selectedChoiceIds = selectedOptions[group.id] || [];
      selectedChoiceIds.forEach(choiceId => {
        const choice = group.choices.find(c => c.id === choiceId);
        if (choice && choice.price) {
          total += choice.price;
        }
      });
    });

    return total;
  };

  // Confirm and add to cart with options
  const confirmAddToCart = () => {
    // Validate required option groups
    const missingRequired = itemOptionGroups.filter(group => {
      return group.is_required === 1 && (!selectedOptions[group.id] || selectedOptions[group.id].length === 0);
    });

    if (missingRequired.length > 0) {
      Alert.alert(
        'Required Options',
        `Please select options for: ${missingRequired.map(g => g.name).join(', ')}`
      );
      return;
    }

    // Build options object with choice details
    const optionsWithDetails = {};
    itemOptionGroups.forEach(group => {
      const selectedChoiceIds = selectedOptions[group.id] || [];
      if (selectedChoiceIds.length > 0) {
        optionsWithDetails[group.name] = selectedChoiceIds.map(choiceId => {
          const choice = group.choices.find(c => c.id === choiceId);
          return {
            id: choice.id,
            name: choice.choice_name,
            price: choice.price || 0
          };
        });
      }
    });

    // Add to cart with options
    addToCart(selectedItem, optionsWithDetails);

    // Close modal and reset
    setShowOptionsModal(false);
    setSelectedItem(null);
    setItemOptionGroups([]);
    setSelectedOptions({});
  };

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
                      onPress={() => handleItemPress(item)}
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
                cart.map((item, index) => {
                  // Calculate item total including option prices
                  let itemTotal = item.price;
                  if (item.selectedOptions) {
                    Object.values(item.selectedOptions).forEach(choices => {
                      choices.forEach(choice => {
                        itemTotal += choice.price;
                      });
                    });
                  }
                  itemTotal *= item.quantity;

                  return (
                    <View key={`cart-${index}`} style={styles.cartItem}>
                      <View style={styles.cartItemDetails}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                          <View style={styles.optionsContainer}>
                            {Object.entries(item.selectedOptions).map(([groupName, choices], idx) => (
                              <Text key={idx} style={styles.optionText}>
                                • {choices.map(c => c.name).join(', ')}
                              </Text>
                            ))}
                          </View>
                        )}
                        <Text style={styles.cartItemQuantity}>
                          ₱{item.price}{item.selectedOptions ? ` (+₱${(itemTotal / item.quantity - item.price).toFixed(2)})` : ''} x {item.quantity}
                        </Text>
                      </View>
                      <View style={styles.cartItemRight}>
                        <Text style={styles.cartItemTotal}>₱{itemTotal.toFixed(2)}</Text>
                        <TouchableOpacity
                          onPress={() => removeFromCart(index)}
                          style={styles.removeButton}
                        >
                          <Ionicons name="close" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
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

      {/* Options Selection Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowOptionsModal(false);
          setSelectedItem(null);
          setItemOptionGroups([]);
          setSelectedOptions({});
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.optionsModalContent}>
            {/* Header */}
            <View style={styles.optionsModalHeader}>
              <View>
                <Text style={styles.optionsModalTitle}>
                  {selectedItem?.name}
                </Text>
                <Text style={styles.optionsModalBasePrice}>
                  Base Price: ₱{selectedItem?.price.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowOptionsModal(false);
                  setSelectedItem(null);
                  setItemOptionGroups([]);
                  setSelectedOptions({});
                }}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Option Groups */}
            <ScrollView style={styles.optionsScrollView} showsVerticalScrollIndicator={false}>
              {itemOptionGroups.map((group) => (
                <View key={group.id} style={styles.optionGroup}>
                  <View style={styles.optionGroupHeader}>
                    <Text style={styles.optionGroupName}>{group.name}</Text>
                    {group.is_required === 1 && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.optionGroupSubtext}>
                    {group.selection_type === 'single' ? 'Choose one' : 'Choose multiple'}
                  </Text>

                  {/* Choices */}
                  {group.choices.map((choice) => {
                    const isSelected = (selectedOptions[group.id] || []).includes(choice.id);
                    return (
                      <TouchableOpacity
                        key={choice.id}
                        style={styles.choiceItem}
                        onPress={() => toggleOptionChoice(group.id, choice.id, group.selection_type)}
                      >
                        <View style={styles.choiceLeft}>
                          {group.selection_type === 'single' ? (
                            <View style={[styles.radio, isSelected && styles.radioSelected]}>
                              {isSelected && <View style={styles.radioInner} />}
                            </View>
                          ) : (
                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                              {isSelected && (
                                <Ionicons name="checkmark" size={16} color="#ffffff" />
                              )}
                            </View>
                          )}
                          <Text style={styles.choiceName}>{choice.choice_name}</Text>
                        </View>
                        {choice.price > 0 && (
                          <Text style={styles.choicePrice}>
                            +₱{choice.price.toFixed(2)}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            {/* Footer */}
            <View style={styles.optionsModalFooter}>
              <View style={styles.optionsTotalContainer}>
                <Text style={styles.optionsTotalLabel}>Total:</Text>
                <Text style={styles.optionsTotalAmount}>
                  ₱{calculateTotalWithOptions().toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addToCartButton}
                onPress={confirmAddToCart}
              >
                <Text style={styles.addToCartButtonText}>Add to Cart</Text>
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
  optionsContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 11,
    color: '#7c3aed',
    fontStyle: 'italic',
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
  // Options Modal Styles
  optionsModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '95%',
    maxWidth: 600,
    height: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  optionsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  optionsModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 6,
  },
  optionsModalBasePrice: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  optionsScrollView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  optionGroup: {
    marginBottom: 28,
  },
  optionGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionGroupName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 10,
  },
  requiredBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requiredText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  optionGroupSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 14,
    fontWeight: '500',
  },
  choiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  choiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  choiceName: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
    fontWeight: '500',
  },
  choicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  optionsModalFooter: {
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  optionsTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  optionsTotalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  optionsTotalAmount: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  addToCartButton: {
    backgroundColor: '#2563eb',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  addToCartButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MenuScreen;