import { StyleSheet, Text, TouchableOpacity, View, ScrollView, FlatList, Modal, Alert } from 'react-native'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import databaseService from '../src/services/database';
import exportService from '../src/services/exportService';
import printerService from '../src/services/printerService';

const RecordsScreen = ({ navigation }) => {

    const LIMIT_SALES_FOR_PERFORMANCE = 1000;

    const [items, setItems] = useState([]);
    const [expandedItems, setExpandedItems] = useState({});
    const [totalSummary, setTotalSummary] = useState({
        total_transactions: 0,
        total_sales: 0,
        average_sale: 0,
        cups_sold: 0
    });
    const [topSales, setTopSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMoreData, setHasMoreData] = useState(true);

    // Date filter states
    const [dateFilter, setDateFilter] = useState('today'); // 'all', 'today', 'day', 'week', 'month', 'custom'
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showDayPicker, setShowDayPicker] = useState(false);
    const [selectedDay, setSelectedDay] = useState(new Date());
    const [customStartDate, setCustomStartDate] = useState(new Date());
    const [customEndDate, setCustomEndDate] = useState(new Date());
    const [showDateFilterModal, setShowDateFilterModal] = useState(false);

    // Export states
    const [isExporting, setIsExporting] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);

    // Print states
    const [isPrinting, setIsPrinting] = useState(false);

    const ITEMS_PER_PAGE = 20; // Pagination for better performance

    useEffect(() => {
        loadInitialData();

        // Add focus listener to refresh data when screen comes into focus
        const unsubscribe = navigation.addListener('focus', loadInitialData);
        return unsubscribe;
    }, [navigation]);

    // Reload data when date filter changes
    useEffect(() => {
        if (!loading) {
            loadInitialData();
        }
    }, [dateFilter, selectedDay, customStartDate, customEndDate]);

    // Date filter helper functions
    const getDateRange = useCallback(() => {
        const now = new Date();
        let startDate, endDate;

        switch (dateFilter) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                endDate = new Date(now.setHours(23, 59, 59, 999));
                break;
            case 'day':
                startDate = new Date(selectedDay);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(selectedDay);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                startDate = startOfWeek;
                endDate = endOfWeek;
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'custom':
                startDate = new Date(customStartDate);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(customEndDate);
                endDate.setHours(23, 59, 59, 999);
                break;
            default:
                return null;
        }

        return { startDate, endDate };
    }, [dateFilter, selectedDay, customStartDate, customEndDate]);

    const filterTransactionsByDate = useCallback((transactions) => {
        if (dateFilter === 'all') return transactions;

        const dateRange = getDateRange();
        if (!dateRange) return transactions;

        const { startDate, endDate } = dateRange;

        return transactions.filter(transaction => {
            const transactionDate = new Date(transaction.transaction_datetime);
            return transactionDate >= startDate && transactionDate <= endDate;
        });
    }, [dateFilter, getDateRange]);

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
            // Get all transactions and apply date filter
            const allTransactions = await databaseService.getTransactions();
            const filteredTransactions = filterTransactionsByDate(allTransactions);
            // Filter to only show COMPLETED transactions in summary
            const completedTransactions = filteredTransactions.filter(transaction =>
                !transaction.status || transaction.status.toUpperCase() === 'COMPLETED'
            );
            const limitedTransactions = completedTransactions.slice(0, LIMIT_SALES_FOR_PERFORMANCE); // Limit for performance

            const totalSales = limitedTransactions.reduce((sum, transaction) =>
                sum + parseFloat(transaction.total_amount), 0
            );
            const averageSale = limitedTransactions.length > 0 ?
                totalSales / limitedTransactions.length : 0;

            // Calculate cups sold (excluding add-ons)
            // Load categories to create item-to-category mapping
            const categoriesWithItems = await databaseService.getCategoriesWithItems();
            const itemToCategoryMap = {};

            categoriesWithItems.forEach(category => {
                category.items.forEach(item => {
                    itemToCategoryMap[item.item_name] = category.category_name;
                });
            });

            // Count quantities excluding items from categories starting with "Add"
            let cupsSold = 0;
            limitedTransactions.forEach(transaction => {
                if (transaction.items && transaction.items.length > 0) {
                    transaction.items.forEach(item => {
                        const categoryName = itemToCategoryMap[item.item_name];
                        // Exclude if category starts with "Add" (case-insensitive)
                        if (!categoryName || !categoryName.toLowerCase().startsWith('add')) {
                            cupsSold += parseInt(item.quantity) || 0;
                        }
                    });
                }
            });

            setTotalSummary({
                total_transactions: limitedTransactions.length,
                total_sales: totalSales,
                average_sale: averageSale,
                cups_sold: cupsSold
            });
        } catch (error) {
            console.error('Error loading summary:', error);
        }
    };

    const loadTopSales = async () => {
        try {
            // Load a limited set for performance and apply date filter
            const allTransactions = await databaseService.getTransactions();
            const filteredTransactions = filterTransactionsByDate(allTransactions);
            // Filter to only show COMPLETED transactions in top sales
            const completedTransactions = filteredTransactions.filter(transaction =>
                !transaction.status || transaction.status.toUpperCase() === 'COMPLETED'
            );
            const limitedTransactions = completedTransactions.slice(0, LIMIT_SALES_FOR_PERFORMANCE); // Limit dataset

            const salesRanking = calculateTopSales(limitedTransactions);
            setTopSales(salesRanking);
        } catch (error) {
            console.error('Error loading top sales:', error);
        }
    };

    const loadTransactions = async (pageNum = 1, isInitial = false) => {
        try {
            const allTransactions = await databaseService.getTransactions();
            const filteredTransactions = filterTransactionsByDate(allTransactions);
            // Filter to only show COMPLETED transactions in the list
            const completedTransactions = filteredTransactions.filter(transaction =>
                !transaction.status || transaction.status.toUpperCase() === 'COMPLETED'
            );

            // Implement client-side pagination on filtered data
            const startIndex = (pageNum - 1) * ITEMS_PER_PAGE;
            const endIndex = startIndex + ITEMS_PER_PAGE;
            const pageTransactions = completedTransactions.slice(startIndex, endIndex);

            const formattedTransactions = pageTransactions.map(transaction => ({
                ...transaction,
                transaction_datetime: new Date(transaction.transaction_datetime)
            }));

            if (isInitial) {
                setItems(formattedTransactions);
            } else {
                setItems(prev => [...prev, ...formattedTransactions]);
            }

            setHasMoreData(endIndex < completedTransactions.length);
            console.log(`Loaded page ${pageNum}: ${formattedTransactions.length} transactions (COMPLETED only)`);

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

    // Date filter functions
    const getFilterDisplayText = useCallback(() => {
        switch (dateFilter) {
            case 'today':
                return 'Today';
            case 'day':
                return selectedDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            case 'week':
                return 'This Week';
            case 'month':
                return 'This Month';
            case 'custom':
                return `${customStartDate.toLocaleDateString()} - ${customEndDate.toLocaleDateString()}`;
            default:
                return 'All Time';
        }
    }, [dateFilter, selectedDay, customStartDate, customEndDate]);

    const handleDateFilterChange = useCallback((filter) => {
        setDateFilter(filter);
        setPage(1);
        if (filter !== 'custom' && filter !== 'day') {
            setShowDateFilterModal(false);
        }
    }, []);

    const handleCustomDateConfirm = useCallback(() => {
        setDateFilter('custom');
        setPage(1);
        setShowDateFilterModal(false);
    }, []);

    const handleDayConfirm = useCallback(() => {
        setDateFilter('day');
        setPage(1);
        setShowDateFilterModal(false);
    }, []);

    const onDayChange = useCallback((event, selectedDate) => {
        setShowDayPicker(false);
        if (selectedDate) {
            setSelectedDay(selectedDate);
        }
    }, []);

    const onStartDateChange = useCallback((event, selectedDate) => {
        setShowStartDatePicker(false);
        if (selectedDate) {
            setCustomStartDate(selectedDate);
        }
    }, []);

    const onEndDateChange = useCallback((event, selectedDate) => {
        setShowEndDatePicker(false);
        if (selectedDate) {
            setCustomEndDate(selectedDate);
        }
    }, []);

    // Export functions
    const handleExportCSV = useCallback(async () => {
        setIsExporting(true);
        setShowExportModal(false);

        try {
            // Get all transactions with current filter (includes ALL statuses for export)
            const allTransactions = await databaseService.getTransactions();
            const filteredTransactions = filterTransactionsByDate(allTransactions);

            const dateRangeText = exportService.getDateRangeText(dateFilter, customStartDate, customEndDate);
            const result = await exportService.exportToCSV(filteredTransactions, totalSummary, topSales, dateRangeText);

            if (result.success) {
                Alert.alert('Export Successful', result.message);
            } else {
                Alert.alert('Export Failed', result.error);
            }
        } catch (error) {
            console.error('Export error:', error);
            Alert.alert('Export Failed', 'An error occurred while exporting data.');
        } finally {
            setIsExporting(false);
        }
    }, [dateFilter, customStartDate, customEndDate, totalSummary, topSales, filterTransactionsByDate]);

    const handleExportExcel = useCallback(async () => {
        setIsExporting(true);
        setShowExportModal(false);

        try {
            // Get all transactions with current filter (includes ALL statuses for export)
            const allTransactions = await databaseService.getTransactions();
            const filteredTransactions = filterTransactionsByDate(allTransactions);

            const dateRangeText = exportService.getDateRangeText(dateFilter, customStartDate, customEndDate);
            const result = await exportService.exportToExcel(filteredTransactions, totalSummary, topSales, dateRangeText);

            if (result.success) {
                Alert.alert('Export Successful', result.message);
            } else {
                Alert.alert('Export Failed', result.error);
            }
        } catch (error) {
            console.error('Export error:', error);
            Alert.alert('Export Failed', 'An error occurred while exporting data.');
        } finally {
            setIsExporting(false);
        }
    }, [dateFilter, customStartDate, customEndDate, totalSummary, topSales, filterTransactionsByDate]);

    // Print summary function
    const handlePrintSummary = useCallback(async () => {
        setIsPrinting(true);

        try {
            // Initialize printer if needed
            await printerService.loadStoredPrinter();

            const dateRangeText = exportService.getDateRangeText(dateFilter, customStartDate, customEndDate);
            const result = await printerService.printSummary(totalSummary, topSales, dateRangeText);

            if (result.success) {
                Alert.alert('Print Successful', 'Sales summary has been printed.');
            } else {
                Alert.alert('Print Failed', result.error || 'Could not print summary. Please check your printer connection.');
            }
        } catch (error) {
            console.error('Print error:', error);
            Alert.alert('Print Failed', 'An error occurred while printing the summary.');
        } finally {
            setIsPrinting(false);
        }
    }, [dateFilter, customStartDate, customEndDate, totalSummary, topSales]);

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

                    {/* Date Filter & Export Controls */}
                    <View style={styles.controlsContainer}>
                        <TouchableOpacity
                            style={styles.dateFilterButton}
                            onPress={() => setShowDateFilterModal(true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="calendar-outline" size={20} color="#2563eb" />
                            <Text style={styles.dateFilterText}>
                                {getFilterDisplayText()}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#2563eb" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => navigation.navigate('EditTransaction')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="cog-outline" size={18} color="#ffffff" />
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.printButton,
                                (isPrinting || totalSummary.total_transactions === 0) && styles.printButtonDisabled
                            ]}
                            onPress={handlePrintSummary}
                            activeOpacity={0.8}
                            disabled={isPrinting || totalSummary.total_transactions === 0}
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
                                (isExporting || totalSummary.total_transactions === 0) && styles.exportButtonDisabled
                            ]}
                            onPress={() => setShowExportModal(true)}
                            activeOpacity={0.8}
                            disabled={isExporting || totalSummary.total_transactions === 0}
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
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}># of Cups Sold:</Text>
                                    <Text style={styles.summaryValue}>{totalSummary.cups_sold}</Text>
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

            {/* Date Filter Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showDateFilterModal}
                onRequestClose={() => setShowDateFilterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter by Date</Text>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowDateFilterModal(false)}
                            >
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterOptionsContainer}>
                            {[
                                { key: 'all', label: 'All Time', icon: 'infinite-outline' },
                                { key: 'today', label: 'Today', icon: 'today-outline' },
                                { key: 'day', label: 'Select Day', icon: 'calendar-outline' },
                                { key: 'week', label: 'This Week', icon: 'calendar-outline' },
                                { key: 'month', label: 'This Month', icon: 'calendar-outline' },
                                { key: 'custom', label: 'Custom Range', icon: 'options-outline' }
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[
                                        styles.filterOption,
                                        dateFilter === option.key && styles.filterOptionActive
                                    ]}
                                    onPress={() => handleDateFilterChange(option.key)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={option.icon}
                                        size={20}
                                        color={dateFilter === option.key ? '#2563eb' : '#6b7280'}
                                    />
                                    <Text style={[
                                        styles.filterOptionText,
                                        dateFilter === option.key && styles.filterOptionTextActive
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {dateFilter === option.key && (
                                        <Ionicons name="checkmark" size={20} color="#2563eb" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {dateFilter === 'day' && (
                            <View style={styles.customDateContainer}>
                                <Text style={styles.customDateLabel}>Select Day</Text>

                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => setShowDayPicker(true)}
                                >
                                    <Ionicons name="calendar" size={16} color="#6b7280" />
                                    <Text style={styles.dateButtonText}>
                                        {selectedDay.toLocaleDateString()}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.confirmCustomDateButton}
                                    onPress={handleDayConfirm}
                                >
                                    <Text style={styles.confirmCustomDateText}>Apply Day</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {dateFilter === 'custom' && (
                            <View style={styles.customDateContainer}>
                                <Text style={styles.customDateLabel}>Select Date Range</Text>

                                <View style={styles.dateRangeContainer}>
                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => setShowStartDatePicker(true)}
                                    >
                                        <Ionicons name="calendar" size={16} color="#6b7280" />
                                        <Text style={styles.dateButtonText}>
                                            From: {customStartDate.toLocaleDateString()}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => setShowEndDatePicker(true)}
                                    >
                                        <Ionicons name="calendar" size={16} color="#6b7280" />
                                        <Text style={styles.dateButtonText}>
                                            To: {customEndDate.toLocaleDateString()}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={styles.confirmCustomDateButton}
                                    onPress={handleCustomDateConfirm}
                                >
                                    <Text style={styles.confirmCustomDateText}>Apply Date Range</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Date Pickers */}
            {showDayPicker && (
                <DateTimePicker
                    value={selectedDay}
                    mode="date"
                    display="default"
                    onChange={onDayChange}
                />
            )}

            {showStartDatePicker && (
                <DateTimePicker
                    value={customStartDate}
                    mode="date"
                    display="default"
                    onChange={onStartDateChange}
                />
            )}

            {showEndDatePicker && (
                <DateTimePicker
                    value={customEndDate}
                    mode="date"
                    display="default"
                    onChange={onEndDateChange}
                />
            )}

            {/* Export Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showExportModal}
                onRequestClose={() => setShowExportModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.exportModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Export Sales Report</Text>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowExportModal(false)}
                            >
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.exportDescription}>
                            Export your sales data for the selected period: {getFilterDisplayText()}
                        </Text>
                        <Text style={styles.exportInfo}>
                            {totalSummary.total_transactions} completed transactions • Export includes ALL transaction statuses
                        </Text>
                        <Text style={styles.exportInfo}>
                            ₱{totalSummary.total_sales.toFixed(2)} total sales (completed only)
                        </Text>

                        <View style={styles.exportOptionsContainer}>
                            <TouchableOpacity
                                style={styles.exportOption}
                                onPress={handleExportCSV}
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
                                onPress={handleExportExcel}
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

    // Controls Container (Date Filter & Export)
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

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        maxHeight: '80%',
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

    // Filter Options
    filterOptionsContainer: {
        paddingVertical: 20,
    },
    filterOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#f9fafb',
        gap: 12,
    },
    filterOptionActive: {
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    filterOptionText: {
        fontSize: 16,
        color: '#6b7280',
        flex: 1,
        fontWeight: '500',
    },
    filterOptionTextActive: {
        color: '#2563eb',
        fontWeight: '600',
    },

    // Custom Date Range
    customDateContainer: {
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 20,
    },
    customDateLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 16,
        textAlign: 'center',
    },
    dateRangeContainer: {
        gap: 12,
        marginBottom: 20,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        gap: 8,
    },
    dateButtonText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    confirmCustomDateButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    confirmCustomDateText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },

    // Edit Button Styles
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

    // Print Button Styles
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

    // Export Button Styles
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

    // Export Modal Styles
    exportModalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        maxHeight: '70%',
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