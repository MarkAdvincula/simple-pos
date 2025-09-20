// ./src/services/exportService.js
import { Alert, Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

class ExportService {
  // Generate CSV content from transactions data
  generateCSV(transactions, summary, topSales) {
    const headers = [
      'Transaction ID',
      'Date',
      'Time',
      'Payment Method',
      'Items',
      'Total Amount'
    ];

    let csvContent = headers.join(',') + '\n';

    // Add transaction data
    transactions.forEach(transaction => {
      const date = new Date(transaction.transaction_datetime);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString();

      // Format items as "ItemName (Qty x Price)"
      const itemsStr = transaction.items && transaction.items.length > 0
        ? transaction.items.map(item =>
            `"${item.item_name} (${item.quantity} x ₱${item.unit_price})"`
          ).join('; ')
        : 'No items';

      const row = [
        transaction.id,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${transaction.payment_method || 'Cash'}"`,
        itemsStr,
        transaction.total_amount
      ];

      csvContent += row.join(',') + '\n';
    });

    // Add summary section
    csvContent += '\n\nSUMMARY\n';
    csvContent += `Total Transactions,${summary.total_transactions}\n`;
    csvContent += `Total Sales,₱${summary.total_sales.toFixed(2)}\n`;
    csvContent += `Average Sale,₱${summary.average_sale.toFixed(2)}\n`;

    // Add top sales section
    if (topSales && topSales.length > 0) {
      csvContent += '\n\nTOP SALES\n';
      csvContent += 'Rank,Item Name,Quantity Sold,Revenue\n';
      topSales.forEach((item, index) => {
        csvContent += `${index + 1},"${item.name}",${item.totalQuantity},₱${item.totalRevenue.toFixed(2)}\n`;
      });
    }

    return csvContent;
  }

  // Generate basic Excel-compatible CSV (can be opened in Excel)
  generateExcelCSV(transactions, summary, topSales) {
    // Excel prefers UTF-8 BOM for proper character encoding
    const BOM = '\uFEFF';
    const csvContent = this.generateCSV(transactions, summary, topSales);
    return BOM + csvContent;
  }

  // Export to CSV file
  async exportToCSV(transactions, summary, topSales, dateFilter = 'all') {
    try {
      const csvContent = this.generateCSV(transactions, summary, topSales);
      const fileName = `sales_report_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`;

      // Create and share file
      return await this.createAndShareFile(csvContent, fileName, 'text/csv');

    } catch (error) {
      console.error('CSV export failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate actual Excel file
  generateExcelFile(transactions, summary, topSales) {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Transactions
    const transactionData = [];
    transactionData.push(['Transaction ID', 'Date', 'Time', 'Payment Method', 'Items', 'Total Amount']);

    transactions.forEach(transaction => {
      const date = new Date(transaction.transaction_datetime);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString();

      const itemsStr = transaction.items && transaction.items.length > 0
        ? transaction.items.map(item =>
            `${item.item_name} (${item.quantity} x ₱${item.unit_price})`
          ).join('; ')
        : 'No items';

      transactionData.push([
        transaction.id,
        dateStr,
        timeStr,
        transaction.payment_method || 'Cash',
        itemsStr,
        parseFloat(transaction.total_amount)
      ]);
    });

    const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
    XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transactions');

    // Sheet 2: Summary
    const summaryData = [
      ['Sales Summary'],
      [''],
      ['Total Transactions', summary.total_transactions],
      ['Total Sales', `₱${summary.total_sales.toFixed(2)}`],
      ['Average Sale', `₱${summary.average_sale.toFixed(2)}`]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Sheet 3: Top Sales
    if (topSales && topSales.length > 0) {
      const topSalesData = [];
      topSalesData.push(['Rank', 'Item Name', 'Quantity Sold', 'Revenue']);

      topSales.forEach((item, index) => {
        topSalesData.push([
          index + 1,
          item.name,
          item.totalQuantity,
          `₱${item.totalRevenue.toFixed(2)}`
        ]);
      });

      const topSalesSheet = XLSX.utils.aoa_to_sheet(topSalesData);
      XLSX.utils.book_append_sheet(workbook, topSalesSheet, 'Top Sales');
    }

    return workbook;
  }

  // Export to Excel file
  async exportToExcel(transactions, summary, topSales, dateFilter = 'all') {
    try {
      const workbook = this.generateExcelFile(transactions, summary, topSales);
      const fileName = `sales_report_${dateFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Write workbook to base64
      const excelData = XLSX.write(workbook, {
        type: 'base64',
        bookType: 'xlsx'
      });

      // Create and share file
      return await this.createAndShareExcelFile(excelData, fileName);

    } catch (error) {
      console.error('Excel export failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create and share CSV file
  async createAndShareFile(content, fileName, mimeType) {
    try {
      // Create file path in document directory
      const fileUri = FileSystem.documentDirectory + fileName;

      // Write content to file
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        // Share the file
        await Sharing.shareAsync(fileUri, {
          mimeType: mimeType,
          dialogTitle: `Export ${fileName}`,
          UTI: 'public.comma-separated-values-text'
        });

        return {
          success: true,
          message: `${fileName} exported successfully and ready to share!`
        };
      } else {
        // Fallback to showing file location
        return await this.showFileLocationAlert(fileUri, fileName);
      }

    } catch (error) {
      console.error('File creation/sharing failed:', error);
      // Fallback to old method
      return await this.showExportOptions(content, fileName, 'CSV');
    }
  }

  // Create and share Excel file
  async createAndShareExcelFile(base64Data, fileName) {
    try {
      // Create file path in document directory
      const fileUri = FileSystem.documentDirectory + fileName;

      // Write base64 data to file
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        // Share the file
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: `Export ${fileName}`,
          UTI: 'org.openxmlformats.spreadsheetml.sheet'
        });

        return {
          success: true,
          message: `${fileName} exported successfully and ready to share!`
        };
      } else {
        // Fallback to showing file location
        return await this.showFileLocationAlert(fileUri, fileName);
      }

    } catch (error) {
      console.error('Excel file creation/sharing failed:', error);
      return {
        success: false,
        error: 'Failed to create Excel file: ' + error.message
      };
    }
  }

  // Show file location when sharing is not available
  async showFileLocationAlert(fileUri, fileName) {
    return new Promise((resolve) => {
      Alert.alert(
        'Export Successful',
        `${fileName} has been saved to your device.\n\nFile location: ${fileUri}\n\nYou can find this file in your Documents folder.`,
        [
          {
            text: 'Open File Location',
            onPress: () => {
              // On mobile, we can't directly open file manager, but we can provide guidance
              Alert.alert(
                'File Location',
                `The file has been saved in your app's documents folder. You can access it through your device's file manager or by using apps that can browse app documents.`,
                [{ text: 'OK' }]
              );
              resolve({
                success: true,
                message: `${fileName} exported successfully to device storage!`
              });
            }
          },
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

  // Show export options to user (fallback method)
  async showExportOptions(content, fileName, format) {
    return new Promise((resolve) => {
      const truncatedContent = content.length > 500
        ? content.substring(0, 500) + '...\n[Content truncated for display]'
        : content;

      Alert.alert(
        `${format} Export Ready`,
        `File: ${fileName}\n\nYour data is ready for export. Choose an option:`,
        [
          {
            text: 'View Data',
            onPress: () => {
              Alert.alert(
                'Export Data',
                truncatedContent,
                [
                  { text: 'Close', style: 'cancel' },
                  {
                    text: 'Copy to Clipboard',
                    onPress: () => {
                      // Note: Clipboard functionality would need react-native-clipboard
                      // For now, just show success
                      resolve({
                        success: true,
                        message: `${format} data is ready. You can manually copy this data to create your ${fileName} file.`
                      });
                    }
                  }
                ]
              );
            }
          },
          {
            text: 'Email Data',
            onPress: () => {
              const emailBody = encodeURIComponent(content);
              const emailSubject = encodeURIComponent(`Sales Report - ${fileName}`);
              const emailUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;

              Linking.openURL(emailUrl).then(() => {
                resolve({
                  success: true,
                  message: `${format} export sent via email as ${fileName}`
                });
              }).catch(() => {
                resolve({
                  success: false,
                  error: 'Could not open email app'
                });
              });
            }
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({ success: false, error: 'Export cancelled' })
          }
        ]
      );
    });
  }

  // Get formatted date range text for filename
  getDateRangeText(dateFilter, customStartDate, customEndDate) {
    switch (dateFilter) {
      case 'today':
        return 'today';
      case 'week':
        return 'this_week';
      case 'month':
        return 'this_month';
      case 'custom':
        const start = customStartDate.toISOString().split('T')[0];
        const end = customEndDate.toISOString().split('T')[0];
        return `${start}_to_${end}`;
      default:
        return 'all_time';
    }
  }
}

// Create singleton instance
const exportService = new ExportService();

export default exportService;