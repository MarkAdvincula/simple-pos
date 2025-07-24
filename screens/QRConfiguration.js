import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QRManagementScreen = ({ navigation, route }) => {
  const [qrImages, setQrImages] = useState({
    Gcash: null,
    BPI: null
  });
  const [loading, setLoading] = useState(false);
  const { method } = route.params;

  useEffect(() => {
    loadQRImages();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photo library to upload QR codes.',
        [{ text: 'OK' }]
      );
    }
  };

  const loadQRImages = async () => {
    try {
      setLoading(true);
      const gcashQR = await AsyncStorage.getItem('gcash_qr_image');
      const bpiQR = await AsyncStorage.getItem('bpi_qr_image');

      setQrImages({
        Gcash: gcashQR,
        BPI: bpiQR
      });
    } catch (error) {
      console.log('Error loading QR images:', error);
      Alert.alert('Error', 'Failed to load QR images');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (paymentType) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await saveQRImage(paymentType, result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const saveQRImage = async (paymentType, uri) => {
    try {
      setLoading(true);
      const storageKey = paymentType === 'Gcash' ? 'gcash_qr_image' : 'bpi_qr_image';
      await AsyncStorage.setItem(storageKey, uri);

      setQrImages(prev => ({
        ...prev,
        [paymentType]: uri
      }));

      Alert.alert('Success', `${paymentType} QR code updated successfully!`);
    } catch (error) {
      console.log('Error saving QR image:', error);
      Alert.alert('Error', 'Failed to save QR image');
    } finally {
      setLoading(false);
    }
  };

  const removeQRImage = async (paymentType) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to remove the ${paymentType} QR code?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const storageKey = paymentType === 'Gcash' ? 'gcash_qr_image' : 'bpi_qr_image';
              await AsyncStorage.removeItem(storageKey);

              setQrImages(prev => ({
                ...prev,
                [paymentType]: null
              }));

              Alert.alert('Success', `${paymentType} QR code removed successfully!`);
            } catch (error) {
              console.log('Error removing QR image:', error);
              Alert.alert('Error', 'Failed to remove QR image');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const QRCard = ({ paymentType, qrUri }) => (
    <View style={styles.qrCard}>
      <Text style={styles.cardTitle}>{paymentType} QR Code</Text>

      <View style={styles.qrPreview}>
        {qrUri ? (
          <Image source={{ uri: qrUri }} style={styles.previewImage} />
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="qr-code" size={80} color="#9ca3af" />
            <Text style={styles.placeholderText}>No QR code uploaded</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => pickImage(paymentType)}
          activeOpacity={0.8}
        >
          <Ionicons name="cloud-upload" size={20} color="#ffffff" />
          <Text style={styles.uploadButtonText}>
            {qrUri ? 'Update' : 'Upload'}
          </Text>
        </TouchableOpacity>

        {qrUri && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeQRImage(paymentType)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash" size={20} color="#ffffff" />
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack({ method })}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code Management</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Upload and manage your payment QR codes
        </Text>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
        {!method && (
          <>
            <QRCard paymentType="Gcash" qrUri={qrImages.Gcash} />
            <QRCard paymentType="BPI" qrUri={qrImages.BPI} />
          </>
        )}

        {method === "Gcash" && (
          <QRCard paymentType="Gcash" qrUri={qrImages.Gcash} />
        )}

        {method === "BPI" && (
          <QRCard paymentType="BPI" qrUri={qrImages.BPI} />
        )}



        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={20} color="#6b7280" />
          <Text style={styles.infoText}>
            QR codes are stored locally on your device. Make sure to backup your QR codes regularly.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  qrCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrPreview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  uploadButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  removeButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 40,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});

export default QRManagementScreen;