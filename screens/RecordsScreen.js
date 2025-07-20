import { StyleSheet, Text, TouchableOpacity, View, ScrollView, FlatList } from 'react-native'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons';
import databaseService from '../src/services/database';

const RecordsScreen = ({ navigation }) => {
    const [items, setItems] = useState([]);
    const [expandedItems, setExpandedItems] = useState({});
    const [totalSummary, setTotalSummary] = useState({
        total_transactions: 0,
        total_sales: 0,
        average_sale: 0
    });
    const [topSales, setTopSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMoreData, setHasMoreData] = useState(true);

    const ITEMS_PER_PAGE = 20; // Pagination for better performance

    useEffect(() => {
        loadInitialData();
        
        // Add focus listener to refresh data when screen comes into focus
        const unsubscribe = navigation.addListener('focus', loadInitialData);
        return unsubscribe;
    }, [navigation]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            setPage(1);
            
            console.log('Loading initial data...');
            
            // Load summary and top sales (lightweight)
            await Promise.all([
                loadSummaryData(),
                loadTopSales(),
                loadTransactions(1, true) // Load first page of transactions
            ]);
            
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSummaryData = async () => {
        try {
            // Get summary without loading all transaction details
            const summary = await databaseService.getDailySummary(
                new Date().toISOString().split('T')[0]
            );
            
            // For overall summary, you might want to add a method to your database service
            // For now, we'll use a lighter approach
            const recentTransactions = await databaseService.getTransactions();
            const limitedTransactions = recentTransactions.slice(0, 100); // Limit for performance
            
            const totalSales = limitedTransactions.reduce((sum, transaction) => 
                sum + parseFloat(transaction.total_amount), 0
            );
            const averageSale = limitedTransactions.length > 0 ? 
                totalSales / limitedTransactions.length : 0;
            
            setTotalSummary({
                total_transactions: limitedTransactions.length,
                total_sales: totalSales,
                average_sale: averageSale
            });
        } catch (error) {
            console.error('Error loading summary:', error);
        }
    };

    const loadTopSales = async () => {
        try {
            // Load a limited set for performance
            const recentTransactions = await databaseService.getTransactions();
            const limitedTransactions = recentTransactions.slice(0, 200); // Limit dataset
            
            const salesRanking = calculateTopSales(limitedTransactions);
            setTopSales(salesRanking);
        } catch (error) {
            console.error('Error loading top sales:', error);
        }
    };

    const loadTransactions = async (pageNum = 1, isInitial = false) => {
        try {
            const allTransactions = await databaseService.getTransactions();
            
            // Implement client-side pagination
            const startIndex = (pageNum - 1) * ITEMS_PER_PAGE;
            const endIndex = startIndex + ITEMS_PER_PAGE;
            const pageTransactions = allTransactions.slice(startIndex, endIndex);
            
            const formattedTransactions = pageTransactions.map(transaction => ({
                ...transaction,
                transaction_datetime: new Date(transaction.transaction_datetime)
            }));
            
            if (isInitial) {
                setItems(formattedTransactions);
            } else {
                setItems(prev => [...prev, ...formattedTransactions]);
            }
            
            setHasMoreData(endIndex < allTransactions.length);
            console.log(`Loaded page ${pageNum}: ${formattedTransactions.length} transactions`);
            
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    };

    const loadMoreTransactions = useCallback(() => {
        if (!loading && hasMoreData) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadTransactions(nextPage, false);
        }
    }, [loading, hasMoreData, page]);

    // Memoize expensive calculations
    const calculateTopSales = useMemo(() => {
        return (transactions) => {
            const itemSales = {};
            
            // Optimize the calculation
            transactions.forEach(transaction => {
                if (transaction.items?.length > 0) {
                    transaction.items.forEach(item => {
                        const itemName = item.item_name;
                        const quantity = parseInt(item.quantity) || 0;
                        const revenue = parseFloat(item.line_total) || 0;
                        
                        if (itemSales[itemName]) {
                            itemSales[itemName].totalQuantity += quantity;
                            itemSales[itemName].totalRevenue += revenue;
                            itemSales[itemName].transactions += 1;
                        } else {
                            itemSales[itemName] = {
                                name: itemName,
                                totalQuantity: quantity,
                                totalRevenue: revenue,
                                transactions: 1,
                                averagePrice: parseFloat(item.unit_price) || 0
                            };
                        }
                    });
                }
            });

            return Object.values(itemSales)
                .sort((a, b) => b.totalQuantity - a.totalQuantity)
                .slice(0, 10);
        };
    }, []);

    const toggleAccordion = useCallback((transactionId) => {
        setExpandedItems(prev => ({
            ...prev,
            [transactionId]: !prev[transactionId]
        }));
    }, []);

    const formatCurrency = useCallback((amount) => {
        return parseFloat(amount).toLocaleString('en-US', { 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2 
        });
    }, []);

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
    }, [formatCurrency]);

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
                        {totalSummary.total_transactions > 0 
                            ? `${((item.transactions / totalSummary.total_transactions) * 100).toFixed(1)}%`
                            : '0%'
                        }
                    </Text>
                    <Text style={styles.rankingTransactions}>
                        {item.transactions} orders
                    </Text>
                </View>
            </View>
        );
    }, [totalSummary.total_transactions, formatCurrency]);

    const renderTransactionItem = useCallback(({ item, index }) => {
        const isExpanded = expandedItems[item.id];
        
        return (
            <View style={styles.transactionCard}>
                <TouchableOpacity 
                    style={styles.recordsContainer}
                    onPress={() => toggleAccordion(item.id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.transactionMainContent}>
                        <View style={styles.leftSection}>
                            <View style={styles.dateContainer}>
                                <Text style={styles.dateText}>
                                    {item.transaction_datetime.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric' 
                                    })}
                                </Text>
                                <Text style={styles.timeText}>
                                    {item.transaction_datetime.toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    })}
                                </Text>
                            </View>
                            <View style={styles.transactionInfo}>
                                <Text style={styles.transactionId}>ID: {item.id}</Text>
                                <Text style={styles.paymentMethod}>
                                    {item.payment_method || 'Cash'}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.rightSection}>
                            <Text style={styles.totalAmount}>
                                ₱{formatCurrency(item.total_amount)}
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
                        {renderTransactionItems(item.items)}
                    </View>
                )}
            </View>
        );
    }, [expandedItems, toggleAccordion, formatCurrency, renderTransactionItems]);

    const renderFooter = useCallback(() => {
        if (!hasMoreData) return null;
        
        return (
            <TouchableOpacity 
                style={styles.loadMoreButton} 
                onPress={loadMoreTransactions}
                disabled={loading}
            >
                <Text style={styles.loadMoreText}>
                    {loading ? 'Loading...' : 'Load More Transactions'}
                </Text>
            </TouchableOpacity>
        );
    }, [hasMoreData, loading, loadMoreTransactions]);

    if (loading && items.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Ionicons name="analytics-outline" size={48} color="#6b7280" />
                    <Text style={styles.loadingText}>Loading analytics...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} nestedScrollEnabled={true}>
                <View style={styles.contentContainer}>
                    {/* Header */}
                    <View style={styles.headerContainer}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="chevron-back" size={24} color="#1f2937" />
                        </TouchableOpacity>
                        <View style={styles.recordsHeader}>
                            <Text style={styles.recordsHeaderText}>Sales Analytics</Text>
                            <Text style={styles.recordsSubtext}>
                                {totalSummary.total_transactions} transactions • {topSales.length} items
                            </Text>
                        </View>
                    </View>

                    {totalSummary.total_transactions === 0 ? (
                        <View style={styles.emptyStateContainer}>
                            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
                            <Text style={styles.emptyStateText}>No transactions yet</Text>
                            <Text style={styles.emptyStateSubtext}>
                                Transactions will appear here after you make sales
                            </Text>
                        </View>
                    ) : (
                        <>
                            {/* Summary Section */}
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
                            </View>

                            {/* Top Sales - Using FlatList for better performance */}
                            <View style={styles.topSalesContainer}>
                                <View style={styles.topSalesHeader}>
                                    <Ionicons name="trophy" size={24} color="#f59e0b" />
                                    <Text style={styles.topSalesTitle}>Top Sales</Text>
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

                            {/* Transactions List - Using FlatList with pagination */}
                            <View style={styles.transactionsList}>
                                <Text style={styles.transactionsListTitle}>Recent Transactions</Text>
                                <FlatList
                                    data={items}
                                    renderItem={renderTransactionItem}
                                    keyExtractor={(item) => `transaction_${item.id}`}
                                    scrollEnabled={false}
                                    ListFooterComponent={renderFooter}
                                    removeClippedSubviews={true}
                                    maxToRenderPerBatch={10}
                                    updateCellsBatchingPeriod={50}
                                    windowSize={10}
                                    initialNumToRender={10}
                                />
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default RecordsScreen;

// Styles remain the same as before, plus these additions:
const styles = StyleSheet.create({
    // ... (all previous styles remain the same)
    
    loadMoreButton: {
        backgroundColor: '#e5e7eb',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 16,
    },
    loadMoreText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    
    // All other styles from the previous version...
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 16,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 16,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
    headerContainer: {
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
        marginBottom: 10,
        alignSelf: 'flex-start',
    },
    recordsHeader: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    recordsHeaderText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    recordsSubtext: {
        fontSize: 14,
        color: '#6b7280',
    },
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
        justifyContent: 'center',
        marginBottom: 20,
    },
    topSalesTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginLeft: 8,
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
    transactionsList: {
        marginBottom: 20,
    },
    transactionsListTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
        textAlign: 'center',
    },
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
    },
    transactionMainContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    dateContainer: {
        marginRight: 16,
        alignItems: 'center',
        minWidth: 60,
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
    transactionInfo: {
        flex: 1,
    },
    transactionId: {
        fontSize: 14,
        color: '#374151',
        marginBottom: 2,
    },
    paymentMethod: {
        fontSize: 12,
        color: '#6b7280',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        alignSelf: 'flex-start',
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