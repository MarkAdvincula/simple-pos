import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import databaseService from './database';

class MenuExportService {
  // Export menu as JSON file
  async exportMenuToJSON() {
    try {
      const menuData = await databaseService.exportMenu();
      const fileName = `menu_export_${new Date().toISOString().split('T')[0]}.json`;
      const jsonContent = JSON.stringify(menuData, null, 2);

      return await this.createAndShareFile(jsonContent, fileName, 'application/json');
    } catch (error) {
      console.error('Menu JSON export failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Export menu as CSV file
  async exportMenuToCSV() {
    try {
      const menuData = await databaseService.exportMenu();
      const csvContent = this.generateMenuCSV(menuData);
      const fileName = `menu_export_${new Date().toISOString().split('T')[0]}.csv`;

      return await this.createAndShareFile(csvContent, fileName, 'text/csv');
    } catch (error) {
      console.error('Menu CSV export failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate CSV content from menu data
  generateMenuCSV(menuData) {
    const headers = ['Category', 'Category Order', 'Item Name', 'Price', 'Option Groups'];
    let csvContent = headers.join(',') + '\n';

    // Create a map of option group IDs to names
    const optionGroupMap = {};
    if (menuData.optionGroups) {
      menuData.optionGroups.forEach(group => {
        optionGroupMap[group.id] = group.name;
      });
    }

    menuData.categories.forEach(category => {
      category.items.forEach(item => {
        // Get option group names
        let optionGroupsStr = '';
        if (item.optionGroupIds && item.optionGroupIds.length > 0) {
          const groupNames = item.optionGroupIds
            .map(id => optionGroupMap[id])
            .filter(name => name !== undefined);
          optionGroupsStr = groupNames.join('; ');
        }

        const row = [
          `"${category.name}"`,
          category.displayOrder || 0,
          `"${item.name}"`,
          item.price,
          `"${optionGroupsStr}"`
        ];
        csvContent += row.join(',') + '\n';
      });
    });

    return csvContent;
  }

  // Import menu from file
  async importMenuFromFile(replaceExisting = false) {
    try {
      // Pick a document
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return {
          success: false,
          error: 'Import cancelled'
        };
      }

      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);

      let menuData;
      try {
        menuData = JSON.parse(fileContent);
      } catch (parseError) {
        return {
          success: false,
          error: 'Invalid JSON file format'
        };
      }

      // Import menu data
      const importResult = await databaseService.importMenu(menuData, replaceExisting);

      return {
        success: true,
        message: importResult.message
      };

    } catch (error) {
      console.error('Menu import failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create and share file
  async createAndShareFile(content, fileName, mimeType) {
    try {
      // Create file path in document directory
      const fileUri = FileSystem.documentDirectory + fileName;

      // Write content to file
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Show options to user
      return await this.showExportOptions(fileUri, fileName, mimeType);

    } catch (error) {
      console.error('File creation/sharing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Show export options to user
  async showExportOptions(fileUri, fileName, mimeType) {
    return new Promise(async (resolve) => {
      const isAvailable = await Sharing.isAvailableAsync();

      const options = [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve({ success: false, error: 'Export cancelled' })
        }
      ];

      if (isAvailable) {
        options.push({
          text: 'Share File',
          onPress: async () => {
            try {
              await Sharing.shareAsync(fileUri, {
                mimeType: mimeType,
                dialogTitle: `Export ${fileName}`,
              });
              resolve({
                success: true,
                message: `${fileName} shared successfully! You can save it to your file manager from the share menu.`
              });
            } catch (error) {
              resolve({ success: false, error: 'Failed to share file' });
            }
          }
        });
      }

      options.push({
        text: 'Save to Downloads',
        onPress: async () => {
          const result = await this.saveToDownloads(fileUri, fileName);
          resolve(result);
        }
      });

      Alert.alert(
        'Export Complete',
        `${fileName} has been created successfully. Choose how you want to save it:`,
        options
      );
    });
  }

  // Save file to Downloads folder using MediaLibrary
  async saveToDownloads(fileUri, fileName) {
    try {
      if (Platform.OS === 'android') {
        // Request permissions for Android
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          return {
            success: false,
            error: 'Storage permission required to save to Downloads folder'
          };
        }

        // Save to media library (Downloads folder)
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        const album = await MediaLibrary.getAlbumAsync('Download');
        if (album == null) {
          await MediaLibrary.createAlbumAsync('Download', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }

        return {
          success: true,
          message: `${fileName} saved to Downloads folder! You can find it in your file manager.`
        };
      } else {
        // For iOS, save to app's Documents directory
        const documentsDir = FileSystem.documentDirectory + 'Downloads/';
        await FileSystem.makeDirectoryAsync(documentsDir, { intermediates: true });
        const newPath = documentsDir + fileName;

        await FileSystem.copyAsync({
          from: fileUri,
          to: newPath
        });

        return {
          success: true,
          message: `${fileName} saved to app Documents/Downloads folder! Path: ${newPath}`
        };
      }
    } catch (error) {
      console.error('Error saving to downloads:', error);
      return {
        success: true,
        message: `${fileName} saved to app storage! File location: ${fileUri}`
      };
    }
  }

  // Show file location when sharing is not available
  async showFileLocationAlert(fileUri, fileName) {
    return new Promise((resolve) => {
      Alert.alert(
        'Export Successful',
        `${fileName} has been saved to your device.\n\nFile location: ${fileUri}`,
        [
          {
            text: 'OK',
            onPress: () => resolve({
              success: true,
              message: `${fileName} exported successfully to device storage!`
            })
          }
        ]
      );
    });
  }

  // Clear entire menu with confirmation
  async clearMenuWithConfirmation() {
    return new Promise((resolve) => {
      Alert.alert(
        'Clear Menu',
        'This will delete ALL categories and items from your menu. This action cannot be undone.\n\nAre you sure you want to continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({ success: false, error: 'Operation cancelled' })
          },
          {
            text: 'Clear Menu',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await databaseService.clearMenu();
                resolve(result);
              } catch (error) {
                resolve({ success: false, error: error.message });
              }
            }
          }
        ]
      );
    });
  }

  // Show import options to user
  async showImportOptions() {
    return new Promise((resolve) => {
      Alert.alert(
        'Import Menu',
        'Choose how you want to import the menu:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({ success: false, error: 'Import cancelled' })
          },
          {
            text: 'Add to Existing',
            onPress: async () => {
              const result = await this.importMenuFromFile(false);
              resolve(result);
            }
          },
          {
            text: 'Replace All',
            style: 'destructive',
            onPress: async () => {
              const result = await this.importMenuFromFile(true);
              resolve(result);
            }
          }
        ]
      );
    });
  }
}

// Create singleton instance
const menuExportService = new MenuExportService();

export default menuExportService;