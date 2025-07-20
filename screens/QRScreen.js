import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import databaseService from '../src/services/database';

const QRScreen = ({ route, navigation }) => {
  const [ loading, setLoading ] = useState(false);
  const { total, method, cart } = route.params;
  const [qrImage, setQrImage] = useState();
  const [paymentDetails, setPaymentDetails] = useState();

  useEffect( () => {
    loadQRImages();
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

 
  const configureQR = () => {
    navigation.navigate('ConfigQR', {method});
  }

  const confirmPayment = async (camera) => {
    camera ? navigation.navigate('Camera', { total }) : navigation.navigate('Menu', { total })

    try{
      const transactionId = await databaseService.addTransaction(cart, method);
      setPaymentDetails({
        method: method,
        total: totalAmount,
        received: receivedAmount,
        change: change,
        status: 'success',
        transactionId: transactionId
      });
    }catch(error){
      setPaymentDetails({
        method: method,
        total: totalAmount,
        received: receivedAmount,
        change: change,
        status: 'error',
        error: error.message
      });
      console.error('Payment failed:', error)
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
        
        <View style={styles.qrContainer}>
        {!method ? (<Ionicons name="qr-code" size={500} color="#6b7280" />) :
         (<Image source={{uri: qrImage}}  style={styles.qrImage} />)}
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
  qrContainer: {
    backgroundColor: '#f3f4f6',
    width: 500,
    height: 500,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  qrImage: {
    width: 500,
    height: 500,
    resizeMode: 'contain',
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