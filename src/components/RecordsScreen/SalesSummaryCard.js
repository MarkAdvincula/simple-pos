import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from '../../utils/salesCalculations';

/**
 * Component to display sales summary card
 */
const SalesSummaryCard = ({ totalSummary }) => {
    return (
        <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Sales Summary</Text>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Transactions:</Text>
                <Text style={styles.summaryValue}>{totalSummary.total_transactions}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Sales:</Text>
                <Text style={[styles.summaryValue, styles.totalSalesValue]}>
                    ₱{formatCurrency(totalSummary.total_sales)}
                </Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Average Sale:</Text>
                <Text style={styles.summaryValue}>
                    ₱{formatCurrency(totalSummary.average_sale)}
                </Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}># of Cups Sold:</Text>
                <Text style={styles.summaryValue}>{totalSummary.cups_sold}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    summaryContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
        textAlign: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    summaryLabel: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '600',
    },
    totalSalesValue: {
        fontSize: 16,
        color: '#059669',
    },
});

export default SalesSummaryCard;
