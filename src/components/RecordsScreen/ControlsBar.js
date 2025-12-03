import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Component for the control buttons (Date Filter, Edit, Print, Export)
 */
const ControlsBar = ({
    filterDisplayText,
    onFilterPress,
    onEditPress,
    onPrintPress,
    onExportPress,
    isPrinting,
    isExporting,
    hasTransactions
}) => {
    return (
        <View style={styles.controlsContainer}>
            <TouchableOpacity
                style={styles.dateFilterButton}
                onPress={onFilterPress}
                activeOpacity={0.8}
            >
                <Ionicons name="calendar-outline" size={20} color="#2563eb" />
                <Text style={styles.dateFilterText}>
                    {filterDisplayText}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#2563eb" />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.editButton}
                onPress={onEditPress}
                activeOpacity={0.8}
            >
                <Ionicons name="cog-outline" size={18} color="#ffffff" />
                <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.printButton,
                    (isPrinting || !hasTransactions) && styles.printButtonDisabled
                ]}
                onPress={onPrintPress}
                activeOpacity={0.8}
                disabled={isPrinting || !hasTransactions}
            >
                {isPrinting ? (
                    <>
                        <Ionicons name="hourglass-outline" size={18} color="#9ca3af" />
                        <Text style={styles.printButtonTextDisabled}>Printing...</Text>
                    </>
                ) : (
                    <>
                        <Ionicons name="print-outline" size={18} color="#ffffff" />
                        <Text style={styles.printButtonText}>Print</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.exportButton,
                    (isExporting || !hasTransactions) && styles.exportButtonDisabled
                ]}
                onPress={onExportPress}
                activeOpacity={0.8}
                disabled={isExporting || !hasTransactions}
            >
                {isExporting ? (
                    <>
                        <Ionicons name="hourglass-outline" size={18} color="#9ca3af" />
                        <Text style={styles.exportButtonTextDisabled}>Exporting...</Text>
                    </>
                ) : (
                    <>
                        <Ionicons name="download-outline" size={18} color="#ffffff" />
                        <Text style={styles.exportButtonText}>Export</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 16,
        gap: 8,
    },
    dateFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    dateFilterText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    editButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
    },
    printButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f59e0b',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    printButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
    },
    printButtonTextDisabled: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9ca3af',
    },
    printButtonDisabled: {
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#059669',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        minWidth: 120,
        justifyContent: 'center',
    },
    exportButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
    },
    exportButtonTextDisabled: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9ca3af',
    },
    exportButtonDisabled: {
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
});

export default ControlsBar;
