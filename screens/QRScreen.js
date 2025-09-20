import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
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
  const isPhone = screenData.width < 768;

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
        try {
          await printerService.printReceipt(paymentData, cart);
        } catch (printError) {
          console.error('Print failed:', printError);
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
    }
  }

  

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
      <TouchableOpacity
          style={styles.backButton}
          onPress={configureQR}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>Change QR Image</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{`${method === 'Gcash' ? 'Gcash' : 'BPI'} Payment`}</Text>
        
        <View style={dynamicStyles.qrContainer}>
        {qrImage ? (
  <Image source={{uri: qrImage}} style={dynamicStyles.qrImage} />
) : (
  <Ionicons name="qr-code-outline" size={300} color="#6b7280" />
)}
        </View>
        
        <Text style={styles.instruction}>Scan QR Code to Pay</Text>
        <Text style={styles.totalAmount}>₱{total}</Text>
        <TouchableOpacity
                style={styles.completeButton}
                onPress={() => confirmPayment(false)}
                activeOpacity={0.8}
              >
                          <Ionicons name="cash" size={24} color="#ffffff" />

                <Text style={styles.completeButtonText}>Complete Payment</Text>
              </TouchableOpacity>
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() => confirmPayment(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={24} color="#ffffff" />
          <Text style={styles.cameraButtonText}>Take Receipt Photos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#1f2937',
  },
  

  instruction: {
    fontSize: 18,
    marginBottom: 8,
    color: '#1f2937',
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 32,
  },
  cameraButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  cameraButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'row',
    gap: 10
    
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default QRScreen;