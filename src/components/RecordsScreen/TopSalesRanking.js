import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/salesCalculations';

/**
 * Component to display top sales ranking
 */
const TopSalesRanking = ({ topSales, totalTransactions, showAddOns, onToggleAddOns }) => {
    const renderTopSalesItem = useCallback(({ item, index }) => {
        const isTopThree = index < 3;
        const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32'];

        return (
            <View style={[styles.rankingRow, isTopThree && styles.topThreeRow]}>
                <View style={styles.rankingLeft}>
                    <View style={[styles.rankingNumber, isTopThree && { backgroundColor: medalColors[index] }]}>
                        {isTopThree ? (
                            <Ionicons name="medal" size={16} color="#ffffff" />
                        ) : (
                            <Text style={styles.rankingNumberText}>{index + 1}</Text>
                        )}
                    </View>
                    <View style={styles.rankingItemInfo}>
                        <Text style={[styles.rankingItemName, isTopThree && styles.topThreeItemName]}>
                            {item.name}
                        </Text>
                        <View style={styles.rankingSubInfo}>
                            <Text style={styles.rankingQuantity}>
                                {item.totalQuantity} purchases
                            </Text>
                            <Text style={styles.rankingSeparator}>•</Text>
                            <Text style={styles.rankingRevenue}>
                                ₱{formatCurrency(item.totalRevenue)} revenue
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={styles.rankingRight}>
                    <Text style={styles.rankingPercentage}>
                        {totalTransactions > 0
                            ? `${((item.transactions / totalTransactions) * 100).toFixed(1)}%`
                            : '0%'
                        }
                    </Text>
                    <Text style={styles.rankingTransactions}>
                        {item.transactions} orders
                    </Text>
                </View>
            </View>
        );
    }, [totalTransactions]);

    return (
        <View style={styles.topSalesContainer}>
            <View style={styles.topSalesHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="trophy" size={24} color="#f59e0b" />
                    <Text style={styles.topSalesTitle}>Top Sales</Text>
                </View>
                <TouchableOpacity
                    onPress={onToggleAddOns}
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 5 }}
                >
                    <Ionicons
                        name={showAddOns ? "eye-off" : "eye"}
                        size={16}
                        color="#6b7280"
                        style={{ marginRight: 4 }}
                    />
                    <Text style={styles.toggleAddOnsText}>
                        {showAddOns ? "Hide" : "Show"} Add-ons
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={topSales}
                renderItem={renderTopSalesItem}
                keyExtractor={(item) => item.name}
                scrollEnabled={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                updateCellsBatchingPeriod={50}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    topSalesContainer: {
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
    topSalesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    topSalesTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginLeft: 8,
    },
    toggleAddOnsText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
    rankingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        borderRadius: 8,
        marginBottom: 4,
    },
    topThreeRow: {
        backgroundColor: '#fefce8',
        borderColor: '#fde047',
        borderWidth: 1,
    },
    rankingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rankingNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rankingNumberText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
    },
    rankingItemInfo: {
        flex: 1,
    },
    rankingItemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    topThreeItemName: {
        color: '#92400e',
        fontWeight: 'bold',
    },
    rankingSubInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rankingQuantity: {
        fontSize: 12,
        color: '#059669',
        fontWeight: '500',
    },
    rankingSeparator: {
        fontSize: 12,
        color: '#9ca3af',
        marginHorizontal: 6,
    },
    rankingRevenue: {
        fontSize: 12,
        color: '#2563eb',
        fontWeight: '500',
    },
    rankingRight: {
        alignItems: 'flex-end',
    },
    rankingPercentage: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#059669',
    },
    rankingTransactions: {
        fontSize: 11,
        color: '#6b7280',
        marginTop: 2,
    },
});

export default TopSalesRanking;
