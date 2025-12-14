import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, getPaymentMethodColor } from '../../utils/salesCalculations';

/**
 * Component to display a single transaction card with expandable details
 */
const TransactionCard = ({ transaction, isExpanded, onToggle }) => {
    const paymentColor = getPaymentMethodColor(transaction.payment_method);

    const formatItemsSummary = (items) => {
        if (!items || items.length === 0) return 'No items';
        return items.map(item => item.item_name).join(', ');
    };

    const renderTransactionItems = useCallback((transactionItems) => {
        if (!transactionItems?.length) {
            return (
                <View style={styles.noItemsContainer}>
                    <Text style={styles.noItemsText}>No items found</Text>
                </View>
            );
        }

        return (
            <View style={styles.itemsContainer}>
                <Text style={styles.itemsHeader}>Items:</Text>
                {transactionItems.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.item_name}</Text>
                            <Text style={styles.itemDetails}>
                                {item.quantity}x @ ₱{formatCurrency(item.unit_price)}
                            </Text>
                        </View>
                        <Text style={styles.itemTotal}>₱{formatCurrency(item.line_total)}</Text>
                    </View>
                ))}
            </View>
        );
    }, []);

    return (
        <View style={styles.transactionCard}>
            <TouchableOpacity
                style={styles.recordsContainer}
                onPress={onToggle}
                activeOpacity={0.7}
            >
                <View style={styles.transactionMainContent}>
                    <View style={styles.leftSection}>
                        <View style={styles.dateContainer}>
                            <Text style={styles.dateText}>
                                {transaction.transaction_datetime.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                })} ID: {transaction.id}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                <Text style={styles.timeText}>
                                    {transaction.transaction_datetime.toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    })}{' '}
                                </Text>
                                <Text style={{
                                    backgroundColor: paymentColor,
                                    color: '#ffffff',
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: '500'
                                }}>
                                    {transaction.payment_method || 'Cash'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.middleSection}>
                        <Text
                            style={styles.itemsSummaryText}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                        >
                            {formatItemsSummary(transaction.items)}
                        </Text>
                    </View>

                    <View style={styles.rightSection}>
                        <Text style={styles.totalAmount}>
                            ₱{formatCurrency(transaction.total_amount)}
                        </Text>
                        <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={20}
                            color="#666"
                        />
                    </View>
                </View>
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.expandedSection}>
                    {renderTransactionItems(transaction.items)}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    transactionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    recordsContainer: {
        padding: 16,
        borderRadius: 8,
    },
    transactionMainContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    middleSection: {
        flex: 1,
        marginHorizontal: 12,
        justifyContent: 'center',
    },
    dateContainer: {
        alignItems: 'flex-start',
    },
    dateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    timeText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    itemsSummaryText: {
        fontSize: 11,
        color: '#6b7280',
        marginTop: 4,
        lineHeight: 16,
    },
    rightSection: {
        alignItems: 'flex-end',
        flexDirection: 'row',
        alignItems: 'center',
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: '600',
        color: '#059669',
        marginRight: 8,
    },
    expandedSection: {
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    itemsContainer: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 12,
    },
    itemsHeader: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
    },
    itemDetails: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    itemTotal: {
        fontSize: 14,
        fontWeight: '500',
        color: '#059669',
    },
    noItemsContainer: {
        padding: 20,
        alignItems: 'center',
    },
    noItemsText: {
        color: '#6b7280',
        fontStyle: 'italic',
    },
});

export default TransactionCard;
