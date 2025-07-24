import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';

const CameraScreen = ({ route, navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const cameraRef = useRef(null);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Cannot save photo without permission');
          return;
        }
        const asset = await MediaLibrary.saveToLibraryAsync(photo.uri);
        Alert.alert(
          'Success',
          'Receipt photo captured and saved to Gallery!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Menu'),
            },
          ]
        );
      } catch (error) {
        Alert.alert('Error', `Failed to capture photo: ${error.message}`);
      }
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.title}>Capture Receipt</Text>
          </View>
          
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
            >
              <Ionicons name="camera" size={32} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backButton: {
    padding: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  captureButton: {
    backgroundColor: '#16a34a',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CameraScreen;