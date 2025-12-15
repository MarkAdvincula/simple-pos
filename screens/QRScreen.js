import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import databaseService from '../src/services/database';
import printerService from '../src/services/printerService';
import { SafeAreaView } from 'react-native-safe-area-context'

const QRScreen = ({ route, navigation }) => {
  const [ loading, setLoading ] = useState(false);
  const { total, method, cart } = route.params;
  const [qrImage, setQrImage] = useState();
  const [paymentDetails, setPaymentDetails] = useState();
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [printerRequired, setPrinterRequired] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const isPhone = screenData.width < 768;

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

  useEffect( () => {
    loadQRImages();
    loadPrinterSetting();
  },[])


  const loadQRImages = async () => {
    let getQR;
    try {
      setLoading(true);
      if(method === "BPI"){
        getQR= await AsyncStorage.getItem('bpi_qr_image');
      }else {
        getQR = await AsyncStorage.getItem('gcash_qr_image');
      }

      setQrImage(getQR);

    } catch (error) {
      console.log('Error loading QR images:', error);
      Alert.alert('Error', 'Failed to load QR images');
    } finally {
      setLoading(false);
    }
  };

  const loadPrinterSetting = async () => {
    try {
      const isRequired = await printerService.isPrinterRequired();
      setPrinterRequired(isRequired);
    } catch (error) {
      console.error('Error loading printer setting:', error);
    }
  };

 
  const configureQR = () => {
    navigation.navigate('ConfigQR', {method});
  }

  const confirmPayment = async (camera) => {
    // Prevent multiple payment attempts
    if (isProcessingPayment) {
      return;
    }

    // Check if printer is required and not available
    if (printerRequired && !printerService.isPrinterAvailable()) {
      Alert.alert(
        'Printer Required',
        'A printer is required for checkout but none is connected. Please connect a printer in Printer Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Printer Settings', onPress: () => navigation.navigate('Printers') }
        ]
      );
      return;
    }

    setIsProcessingPayment(true);

    try{
      const transactionId = await databaseService.addTransaction(cart, method);
      const paymentData = {
        method: method,
        total: parseFloat(total),
        status: 'success',
        transactionId: transactionId
      };
      setPaymentDetails(paymentData);

      // Print receipt if printer is available and required
      if (printerRequired && printerService.isPrinterAvailable()) {
        setIsPrinting(true);
        try {
          await printerService.printReceipt(paymentData, cart);
        } catch (printError) {
          console.error('Print failed:', printError);
        } finally {
          setIsPrinting(false);
        }
      }

      camera ? navigation.navigate('Camera', { total }) : navigation.navigate('Menu', { total });
    }catch(error){
      setPaymentDetails({
        method: method,
        total: parseFloat(total),
        status: 'error',
        error: error.message
      });
      console.error('Payment failed:', error);
    } finally {
      setIsProcessingPayment(false);
    }
  }

  

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainLayout}>
        {/* Left Side - Content */}
        <View style={styles.leftColumn}>
          <TouchableOpacity
            style={styles.changeQRButton}
            onPress={configureQR}
            activeOpacity={0.8}
          >
            <Text style={styles.changeQRButtonText}>Change QR Image</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{`${method === 'Gcash' ? 'Gcash' : 'BPI'} Payment`}</Text>

          {/* Items List - 2 Columns */}
          {cart && cart.length > 0 && (
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Items to Purchase</Text>
              <ScrollView style={styles.itemsScrollView} nestedScrollEnabled={true}>
                <View style={styles.itemsGrid}>
                  {cart.map((item, index) => (
                    <View key={index} style={styles.cartItem}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.itemTotal}>₱{calculateItemTotal(item).toFixed(2)}</Text>
                      </View>

                      {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                        <View style={styles.optionsContainer}>
                          {Object.entries(item.selectedOptions).map(([groupName, choices], idx) => (
                            <Text key={idx} style={styles.optionText} numberOfLines={2}>
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
                </View>
              </ScrollView>
            </View>
          )}

          <View style={dynamicStyles.qrContainer}>
            {qrImage ? (
              <Image source={{uri: qrImage}} style={dynamicStyles.qrImage} />
            ) : (
              <Ionicons name="qr-code-outline" size={250} color="#6b7280" />
            )}
          </View>

          <Text style={styles.instruction}>Scan QR Code to Pay</Text>
          <Text style={styles.totalAmount}>₱{total}</Text>
        </View>

        {/* Right Side - Buttons */}
        <View style={styles.rightColumn}>
          <TouchableOpacity
            style={[
              styles.completeButton,
              (isProcessingPayment || isPrinting) && styles.buttonDisabled
            ]}
            onPress={() => confirmPayment(false)}
            activeOpacity={0.8}
            disabled={isProcessingPayment || isPrinting}
          >
            {isProcessingPayment || isPrinting ? (
              <ActivityIndicator size={32} color="#ffffff" />
            ) : (
              <Ionicons name="cash" size={32} color="#ffffff" />
            )}
            <Text style={styles.completeButtonText}>
              {isPrinting ? 'Printing...' : isProcessingPayment ? 'Processing...' : 'Complete Payment'}
            </Text>
          </TouchableOpacity>

          <View style={styles.secondaryButtonsRow}>
            <TouchableOpacity
              style={[
                styles.cameraIconButton,
                (isProcessingPayment || isPrinting) && styles.buttonDisabled
              ]}
              onPress={() => confirmPayment(true)}
              activeOpacity={0.8}
              disabled={isProcessingPayment || isPrinting}
            >
              {isProcessingPayment || isPrinting ? (
                <ActivityIndicator size={20} color="#ffffff" />
              ) : (
                <Ionicons name="camera" size={20} color="#ffffff" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const dynamicStyles = StyleSheet.create({
  qrContainer: {
    backgroundColor: '#f3f4f6',
    width: 300,
    height: 300,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  qrImage: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
 });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
  },
  leftColumn: {
    flex: 1,
    alignItems: 'center',
    paddingRight: 16,
  },
  rightColumn: {
    width: 250,
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f2937',
    textAlign: 'center',
  },
  changeQRButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  changeQRButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  itemsSection: {
    width: '100%',
    maxWidth: 600,
    marginBottom: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    maxHeight: 250,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  itemsScrollView: {
    maxHeight: 200,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  cartItem: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: '48%',
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  optionsContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 12,
    color: '#7c3aed',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  

  instruction: {
    fontSize: 16,
    marginBottom: 8,
    marginTop: 16,
    color: '#1f2937',
    textAlign: 'center',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 16,
    textAlign: 'center',
  },
  completeButton: {
    backgroundColor: '#16a34a',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
    minHeight: 140,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cameraIconButton: {
    backgroundColor: '#2563eb',
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },
});

export default QRScreen;