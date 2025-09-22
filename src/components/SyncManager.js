// ./src/components/SyncManager.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Switch,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import transactionService from '../services/transactionService';
import apiConfigService from '../services/apiConfig';

const SyncManager = ({ visible, onClose }) => {
  const [config, setConfig] = useState({});
  const [syncStatus, setSyncStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  useEffect(() => {
    if (visible) {
      loadConfig();
      loadSyncStatus();
    }
  }, [visible]);

  const loadConfig = async () => {
    try {
      const apiConfig = await apiConfigService.getConfig();
      setConfig(apiConfig);
    } catch (error) {
      console.error('Error loading config:', error);
      Alert.alert('Error', 'Failed to load configuration');
    }
  };

  const loadSyncStatus = async () => {
    try {
      const status = await transactionService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const saveConfig = async () => {
    try {
      setLoading(true);
      await apiConfigService.updateConfig(config);
      Alert.alert('Success', 'Configuration saved successfully');
    } catch (error) {
      console.error('Error saving config:', error);
      Alert.alert('Error', 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      setConnectionStatus(null);

      const result = await apiConfigService.testConnection();
      setConnectionStatus(result);

      if (result.success) {
        Alert.alert('✅ Connection Success',
          `Server is reachable!\nStatus: ${result.status}\nDatabase: ${result.database}`);
      } else {
        Alert.alert('❌ Connection Failed', result.error);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      Alert.alert('❌ Connection Failed', error.message);
    } finally {
      setTesting(false);
    }
  };

  const manualSync = async () => {
    try {
      setLoading(true);
      await transactionService.syncNow();
      await loadSyncStatus();
      Alert.alert('✅ Sync Complete', 'Manual sync completed successfully');
    } catch (error) {
      console.error('Error during manual sync:', error);
      Alert.alert('❌ Sync Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const retryFailedSyncs = async () => {
    try {
      setLoading(true);
      await transactionService.retryFailedSyncs();
      await loadSyncStatus();
      Alert.alert('✅ Retry Complete', 'Failed syncs have been retried');
    } catch (error) {
      console.error('Error retrying syncs:', error);
      Alert.alert('❌ Retry Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearQueue = async () => {
    Alert.alert(
      'Clear Sync Queue',
      'This will remove all pending transactions from the sync queue. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await transactionService.clearSyncQueue();
              await loadSyncStatus();
              Alert.alert('✅ Queue Cleared', 'Sync queue has been cleared');
            } catch (error) {
              console.error('Error clearing queue:', error);
              Alert.alert('❌ Clear Failed', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const testSync = async () => {
    try {
      setLoading(true);
      await transactionService.testSync();
      await loadSyncStatus();
      Alert.alert('✅ Test Created', 'Test transaction added to sync queue');
    } catch (error) {
      console.error('Error creating test sync:', error);
      Alert.alert('❌ Test Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Sync Management</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Sync Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sync Status</Text>
            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Pending</Text>
                <Text style={[styles.statusValue, { color: '#ff9500' }]}>
                  {syncStatus.pending || 0}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Failed</Text>
                <Text style={[styles.statusValue, { color: '#ff3b30' }]}>
                  {syncStatus.failed || 0}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Completed</Text>
                <Text style={[styles.statusValue, { color: '#34c759' }]}>
                  {syncStatus.completed || 0}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Total</Text>
                <Text style={styles.statusValue}>
                  {syncStatus.total || 0}
                </Text>
              </View>
            </View>
            {syncStatus.syncing && (
              <View style={styles.syncingIndicator}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.syncingText}>Syncing...</Text>
              </View>
            )}
          </View>

          {/* Configuration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuration</Text>

            <View style={styles.configItem}>
              <Text style={styles.configLabel}>API Base URL</Text>
              <TextInput
                style={styles.textInput}
                value={config.baseUrl || ''}
                onChangeText={(text) => setConfig({...config, baseUrl: text})}
                placeholder="http://192.168.1.100:3000/api"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Store ID</Text>
              <TextInput
                style={styles.textInput}
                value={config.storeId || ''}
                onChangeText={(text) => setConfig({...config, storeId: text})}
                placeholder="1"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Sync Enabled</Text>
              <Switch
                value={config.syncEnabled || false}
                onValueChange={(value) => setConfig({...config, syncEnabled: value})}
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveConfig}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save Configuration</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={testConnection}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons name="wifi" size={20} color="#007AFF" />
              )}
              <Text style={styles.actionButtonText}>Test Connection</Text>
            </TouchableOpacity>

            {connectionStatus && (
              <View style={[styles.connectionResult,
                connectionStatus.success ? styles.successResult : styles.errorResult]}>
                <Text style={styles.connectionResultText}>
                  {connectionStatus.success ? '✅ Connected' : '❌ Failed'}
                </Text>
                {connectionStatus.error && (
                  <Text style={styles.errorText}>{connectionStatus.error}</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={manualSync}
              disabled={loading}
            >
              <Ionicons name="sync" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Sync Now</Text>
            </TouchableOpacity>

            {syncStatus.failed > 0 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={retryFailedSyncs}
                disabled={loading}
              >
                <Ionicons name="refresh" size={20} color="#ff9500" />
                <Text style={[styles.actionButtonText, { color: '#ff9500' }]}>
                  Retry Failed ({syncStatus.failed})
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={testSync}
              disabled={loading}
            >
              <Ionicons name="flask" size={20} color="#34c759" />
              <Text style={[styles.actionButtonText, { color: '#34c759' }]}>
                Test Sync
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={clearQueue}
              disabled={loading}
            >
              <Ionicons name="trash" size={20} color="#ff3b30" />
              <Text style={[styles.actionButtonText, { color: '#ff3b30' }]}>
                Clear Queue
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: 'white',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  syncingIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  syncingText: {
    marginLeft: 5,
    color: '#007AFF',
  },
  configItem: {
    marginBottom: 15,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  configLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 10,
  },
  actionButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#007AFF',
  },
  connectionResult: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  successResult: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  errorResult: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  connectionResultText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 12,
    color: '#721c24',
    marginTop: 5,
  },
});

export default SyncManager;