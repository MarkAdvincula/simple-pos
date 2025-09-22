// ./src/services/apiConfig.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiConfigService {
  constructor() {
    // Default configuration
    this.defaultConfig = {
      // API Base URL - change this to your server's URL
      baseUrl: 'http://192.168.100.124:3000/api',
      // Store ID - should be configured per installation
      storeId: '1',
      // Sync settings
      syncEnabled: true,
      syncRetryAttempts: 3,
      syncRetryDelay: 5000, // 5 seconds
      // Offline queue settings
      maxOfflineTransactions: 100,
      // Timeout settings
      requestTimeout: 30000, // 30 seconds
    };
  }

  // Get current API configuration
  async getConfig() {
    try {
      const stored = await AsyncStorage.getItem('api_config');
      const storedConfig = stored ? JSON.parse(stored) : {};

      return {
        ...this.defaultConfig,
        ...storedConfig
      };
    } catch (error) {
      console.error('Error loading API config:', error);
      return this.defaultConfig;
    }
  }

  // Update API configuration
  async updateConfig(newConfig) {
    try {
      const currentConfig = await this.getConfig();
      const updatedConfig = {
        ...currentConfig,
        ...newConfig
      };

      await AsyncStorage.setItem('api_config', JSON.stringify(updatedConfig));
      return updatedConfig;
    } catch (error) {
      console.error('Error updating API config:', error);
      throw error;
    }
  }

  // Get API base URL
  async getBaseUrl() {
    const config = await this.getConfig();
    return config.baseUrl;
  }

  // Get store ID
  async getStoreId() {
    const config = await this.getConfig();
    return config.storeId;
  }

  // Check if sync is enabled
  async isSyncEnabled() {
    const config = await this.getConfig();
    return config.syncEnabled;
  }

  // Get sync retry settings
  async getSyncRetrySettings() {
    const config = await this.getConfig();
    return {
      attempts: config.syncRetryAttempts,
      delay: config.syncRetryDelay
    };
  }

  // Build API endpoint URL
  async buildUrl(endpoint) {
    const baseUrl = await this.getBaseUrl();
    const storeId = await this.getStoreId();

    // Replace {storeId} placeholder in endpoint
    const url = endpoint.replace('{storeId}', storeId);

    return `${baseUrl}${url}`;
  }

  // Test API connection
  async testConnection() {
    try {
      const baseUrl = await this.getBaseUrl();
      const healthUrl = baseUrl.replace('/api', '/health');

      const response = await fetch(healthUrl, {
        method: 'GET',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          status: data.status,
          database: data.database
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Connection failed'
      };
    }
  }

  // Reset to default configuration
  async resetConfig() {
    try {
      await AsyncStorage.removeItem('api_config');
      return this.defaultConfig;
    } catch (error) {
      console.error('Error resetting API config:', error);
      throw error;
    }
  }
}

// Create singleton instance
const apiConfigService = new ApiConfigService();

export default apiConfigService;