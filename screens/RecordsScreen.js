import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

// Hooks
import { useDateFilter } from '../src/hooks/useDateFilter';
import { useTransactionData } from '../src/hooks/useTransactionData';
import { usePagination } from '../src/hooks/usePagination';

// Components
import SalesSummaryCard from '../src/components/RecordsScreen/SalesSummaryCard';
import TopSalesRanking from '../src/components/RecordsScreen/TopSalesRanking';
import TransactionsList from '../src/components/RecordsScreen/TransactionsList';
import ControlsBar from '../src/components/RecordsScreen/ControlsBar';
import DateFilterModal from '../src/components/RecordsScreen/DateFilterModal';
import ExportModal from '../src/components/RecordsScreen/ExportModal';

// Services
import databaseService from '../src/services/database';
import exportService from '../src/services/exportService';
import printerService from '../src/services/printerService';

// Utils
import { filterTransactionsByDate } from '../src/utils/dateUtils';
import { filterCompletedTransactions } from '../src/utils/salesCalculations';

const ITEMS_PER_PAGE = 20;

const RecordsScreen = ({ navigation }) => {
    // Date filter hook
    const dateFilterHook = useDateFilter('today');

    // Transaction data hook
    const {
        items,
        totalSummary,
        topSales,
        loading,
        setItems,
        loadInitialData,
        loadTransactions,
    } = useTransactionData(
        dateFilterHook.dateFilter,
        dateFilterHook.selectedDay,
        dateFilterHook.customStartDate,
        dateFilterHook.customEndDate,
        false // showAddOnsInTopSales initial value
    );

    // Pagination hook
    const pagination = usePagination(ITEMS_PER_PAGE);

    // Local state
    const [showAddOnsInTopSales, setShowAddOnsInTopSales] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    // Load initial data on mount and when screen focuses
    useEffect(() => {
        loadInitialData();

        const unsubscribe = navigation.addListener('focus', loadInitialData);
        return unsubscribe;
    }, [navigation]);

    // Reload data when filters change
    useEffect(() => {
        if (!loading) {
            pagination.resetPagination();
            loadInitialData();
        }
    }, [
        dateFilterHook.dateFilter,
        dateFilterHook.selectedDay,
        dateFilterHook.customStartDate,
        dateFilterHook.customEndDate,
        showAddOnsInTopSales
    ]);

    // Load paginated transactions
    useEffect(() => {
        const loadPaginatedTransactions = async () => {
            const allTransactions = await databaseService.getTransactions();
            const filteredTransactions = filterTransactionsByDate(
                allTransactions,
                dateFilterHook.dateFilter,
                dateFilterHook.selectedDay,
                dateFilterHook.customStartDate,
                dateFilterHook.customEndDate
            );
            const completedTransactions = filterCompletedTransactions(filteredTransactions);

            const paginatedResult = pagination.getAllPagesData(completedTransactions);

            const formattedTransactions = paginatedResult.items.map(transaction => ({
                ...transaction,
                transaction_datetime: new Date(transaction.transaction_datetime)
            }));

            setItems(formattedTransactions);
            pagination.setHasMoreData(paginatedResult.hasMore);
        };

        if (!loading) {
            loadPaginatedTransactions();
        }
    }, [
        pagination.page,
        dateFilterHook.dateFilter,
        dateFilterHook.selectedDay,
        dateFilterHook.customStartDate,
        dateFilterHook.customEndDate,
        loading
    ]);

    // Handle load more transactions
    const handleLoadMore = useCallback(() => {
        if (!loading && pagination.hasMoreData) {
            pagination.loadNextPage();
        }
    }, [loading, pagination]);

    // Handle export CSV
    const handleExportCSV = useCallback(async () => {
        setIsExporting(true);
        setShowExportModal(false);

        try {
            const allTransactions = await databaseService.getTransactions();
            const filteredTransactions = filterTransactionsByDate(
                allTransactions,
                dateFilterHook.dateFilter,
                dateFilterHook.selectedDay,
                dateFilterHook.customStartDate,
                dateFilterHook.customEndDate
            );

            const dateRangeText = exportService.getDateRangeText(
                dateFilterHook.dateFilter,
                dateFilterHook.customStartDate,
                dateFilterHook.customEndDate,
                dateFilterHook.selectedDay
            );
            const result = await exportService.exportToCSV(
                filteredTransactions,
                totalSummary,
                topSales,
                dateRangeText
            );

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
    }, [
        dateFilterHook.dateFilter,
        dateFilterHook.customStartDate,
        dateFilterHook.customEndDate,
        dateFilterHook.selectedDay,
        totalSummary,
        topSales
    ]);

    // Handle export Excel
    const handleExportExcel = useCallback(async () => {
        setIsExporting(true);
        setShowExportModal(false);

        try {
            const allTransactions = await databaseService.getTransactions();
            const filteredTransactions = filterTransactionsByDate(
                allTransactions,
                dateFilterHook.dateFilter,
                dateFilterHook.selectedDay,
                dateFilterHook.customStartDate,
                dateFilterHook.customEndDate
            );

            const dateRangeText = exportService.getDateRangeText(
                dateFilterHook.dateFilter,
                dateFilterHook.customStartDate,
                dateFilterHook.customEndDate,
                dateFilterHook.selectedDay
            );
            const result = await exportService.exportToExcel(
                filteredTransactions,
                totalSummary,
                topSales,
                dateRangeText
            );

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
    }, [
        dateFilterHook.dateFilter,
        dateFilterHook.customStartDate,
        dateFilterHook.customEndDate,
        dateFilterHook.selectedDay,
        totalSummary,
        topSales
    ]);

    // Handle print summary
    const handlePrintSummary = useCallback(async () => {
        setIsPrinting(true);

        try {
            await printerService.loadStoredPrinter();

            const dateRangeText = exportService.getDateRangeText(
                dateFilterHook.dateFilter,
                dateFilterHook.customStartDate,
                dateFilterHook.customEndDate,
                dateFilterHook.selectedDay
            );
            const result = await printerService.printSummary(
                totalSummary,
                topSales,
                dateRangeText
            );

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
    }, [
        dateFilterHook.dateFilter,
        dateFilterHook.customStartDate,
        dateFilterHook.customEndDate,
        dateFilterHook.selectedDay,
        totalSummary,
        topSales
    ]);

    // Loading state
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

                    {/* Controls Bar */}
                    <ControlsBar
                        filterDisplayText={dateFilterHook.displayText()}
                        onFilterPress={() => dateFilterHook.setShowDateFilterModal(true)}
                        onEditPress={() => navigation.navigate('EditTransaction')}
                        onPrintPress={handlePrintSummary}
                        onExportPress={() => setShowExportModal(true)}
                        isPrinting={isPrinting}
                        isExporting={isExporting}
                        hasTransactions={totalSummary.total_transactions > 0}
                    />

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
                            {/* Sales Summary */}
                            <SalesSummaryCard totalSummary={totalSummary} />

                            {/* Top Sales Ranking */}
                            <TopSalesRanking
                                topSales={topSales}
                                totalTransactions={totalSummary.total_transactions}
                                showAddOns={showAddOnsInTopSales}
                                onToggleAddOns={() => setShowAddOnsInTopSales(!showAddOnsInTopSales)}
                            />

                            {/* Transactions List */}
                            <TransactionsList
                                transactions={items}
                                hasMoreData={pagination.hasMoreData}
                                onLoadMore={handleLoadMore}
                                loading={loading}
                            />
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Date Filter Modal */}
            <DateFilterModal
                visible={dateFilterHook.showDateFilterModal}
                dateFilter={dateFilterHook.dateFilter}
                selectedDay={dateFilterHook.selectedDay}
                customStartDate={dateFilterHook.customStartDate}
                customEndDate={dateFilterHook.customEndDate}
                showDayPicker={dateFilterHook.showDayPicker}
                showStartDatePicker={dateFilterHook.showStartDatePicker}
                showEndDatePicker={dateFilterHook.showEndDatePicker}
                onClose={() => dateFilterHook.setShowDateFilterModal(false)}
                onFilterChange={dateFilterHook.handleDateFilterChange}
                onDayConfirm={dateFilterHook.handleDayConfirm}
                onCustomDateConfirm={dateFilterHook.handleCustomDateConfirm}
                onDayChange={dateFilterHook.onDayChange}
                onStartDateChange={dateFilterHook.onStartDateChange}
                onEndDateChange={dateFilterHook.onEndDateChange}
                setShowDayPicker={dateFilterHook.setShowDayPicker}
                setShowStartDatePicker={dateFilterHook.setShowStartDatePicker}
                setShowEndDatePicker={dateFilterHook.setShowEndDatePicker}
            />

            {/* Export Modal */}
            <ExportModal
                visible={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExportCSV={handleExportCSV}
                onExportExcel={handleExportExcel}
                filterDisplayText={dateFilterHook.displayText()}
                totalTransactions={totalSummary.total_transactions}
                totalSales={totalSummary.total_sales}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
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
});

export default RecordsScreen;
