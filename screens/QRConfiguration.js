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
  Switch,
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
  const [printerRequired, setPrinterRequired] = useState(true);
  const { method } = route.params || {};

  useEffect(() => {
    loadQRImages();
    loadPrinterSetting();
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

  const loadPrinterSetting = async () => {
    try {
      const setting = await AsyncStorage.getItem('printer_required');
      if (setting !== null) {
        setPrinterRequired(JSON.parse(setting));
      }
    } catch (error) {
      console.log('Error loading printer setting:', error);
    }
  };

  const savePrinterSetting = async (value) => {
    try {
      await AsyncStorage.setItem('printer_required', JSON.stringify(value));
      setPrinterRequired(value);
    } catch (error) {
      console.log('Error saving printer setting:', error);
      Alert.alert('Error', 'Failed to save printer setting');
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
            <Ionicons name="qr-code" size={64} color="#9ca3af" />
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
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.maintenanceButton}
            onPress={() => navigation.navigate('Maintenance')}
            activeOpacity={0.7}
          >
            <Ionicons name="construct" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Upload and manage your payment QR codes
        </Text>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}

        <View style={styles.mainLayout}>
          {/* Left Column - Settings */}
          <View style={styles.leftColumn}>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>Printer Settings</Text>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="print" size={20} color="#6b7280" />
                  <View style={styles.settingText}>
                    <Text style={styles.settingLabel}>Require Printer for Checkout</Text>
                    <Text style={styles.settingDescription}>
                      Toggle this off if you want to allow checkout without a printer
                    </Text>
                  </View>
                </View>
                <Switch
                  value={printerRequired}
                  onValueChange={savePrinterSetting}
                  trackColor={{ false: '#e5e7eb', true: '#2563eb' }}
                  thumbColor={printerRequired ? '#ffffff' : '#ffffff'}
                />
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle" size={20} color="#2563eb" />
                <Text style={styles.infoTitle}>Storage Information</Text>
              </View>
              <Text style={styles.infoText}>
                QR codes are stored locally on your device. Make sure to backup your QR codes regularly.
              </Text>
            </View>
          </View>

          {/* Right Column - QR Cards */}
          <View style={styles.rightColumn}>
            {!method && (
              <View style={styles.qrCardsRow}>
                <View style={styles.qrCardWrapper}>
                  <QRCard paymentType="Gcash" qrUri={qrImages.Gcash} />
                </View>
                <View style={styles.qrCardWrapper}>
                  <QRCard paymentType="BPI" qrUri={qrImages.BPI} />
                </View>
              </View>
            )}

            {method === "Gcash" && (
              <View style={styles.qrCardCentered}>
                <QRCard paymentType="Gcash" qrUri={qrImages.Gcash} />
              </View>
            )}

            {method === "BPI" && (
              <View style={styles.qrCardCentered}>
                <QRCard paymentType="BPI" qrUri={qrImages.BPI} />
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
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding:30,
    backgroundColor: '#ffffff',
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
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  maintenanceButton: {
    backgroundColor: '#8b5cf6',
    padding: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f3f4f6',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  leftColumn: {
    width: 400,
    gap: 16,
  },
  rightColumn: {
    flex: 1,
  },
  qrCardsRow: {
    flexDirection: 'row',
    gap: 20,
    height: '50%',
  },
  qrCardWrapper: {
    flex: 1,
  },
  qrCardCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  qrCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: '100%',
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
    width: 160,
    height: 160,
    borderRadius: 8,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
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
  infoCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    marginTop: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginLeft: 28,
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
});

export default QRManagementScreen;