import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Modal component for export options
 */
const ExportModal = ({
    visible,
    onClose,
    onExportCSV,
    onExportExcel,
    filterDisplayText,
    totalTransactions,
    totalSales,
}) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.exportModalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Export Sales Report</Text>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.exportDescription}>
                        Export your sales data for the selected period: {filterDisplayText}
                    </Text>
                    <Text style={styles.exportInfo}>
                        {totalTransactions} completed transactions • Export includes ALL transaction statuses
                    </Text>
                    <Text style={styles.exportInfo}>
                        ₱{totalSales.toFixed(2)} total sales (completed only)
                    </Text>

                    <View style={styles.exportOptionsContainer}>
                        <TouchableOpacity
                            style={styles.exportOption}
                            onPress={onExportCSV}
                            activeOpacity={0.7}
                        >
                            <View style={styles.exportOptionIcon}>
                                <Ionicons name="document-text-outline" size={24} color="#2563eb" />
                            </View>
                            <View style={styles.exportOptionText}>
                                <Text style={styles.exportOptionTitle}>CSV Format</Text>
                                <Text style={styles.exportOptionSubtitle}>
                                    Compatible with spreadsheet apps and databases
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.exportOption}
                            onPress={onExportExcel}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.exportOptionIcon, { backgroundColor: '#dcfce7' }]}>
                                <Ionicons name="grid-outline" size={24} color="#059669" />
                            </View>
                            <View style={styles.exportOptionText}>
                                <Text style={styles.exportOptionTitle}>Excel Format</Text>
                                <Text style={styles.exportOptionSubtitle}>
                                    Optimized for Microsoft Excel and Google Sheets
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    exportModalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    modalCloseButton: {
        padding: 4,
    },
    exportDescription: {
        fontSize: 16,
        color: '#4b5563',
        textAlign: 'center',
        marginBottom: 8,
    },
    exportInfo: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
        fontWeight: '500',
    },
    exportOptionsContainer: {
        gap: 16,
    },
    exportOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 16,
    },
    exportOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    exportOptionText: {
        flex: 1,
    },
    exportOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    exportOptionSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 18,
    },
});

export default ExportModal;
