import { useState, useCallback, useMemo } from 'react';
import databaseService from '../services/database';
import {
    calculateSummary,
    calculateTopSales,
    createItemCategoryMap
} from '../utils/salesCalculations';
import { getDateRangeFromFilter } from '../utils/dateUtils';

/**
 * OPTIMIZED: Custom hook for managing transaction data
 * - Uses database-level date filtering instead of loading all data
 * - Uses SQL aggregation for summary data instead of client-side calculation
 * - Removed the 1000 transaction limit
 * - Eliminated triple loading of transaction data
 */
export const useTransactionData = (dateFilter, selectedDay, customStartDate, customEndDate, showAddOnsInTopSales) => {
    const [items, setItems] = useState([]);
    const [totalSummary, setTotalSummary] = useState({
        total_transactions: 0,
        total_sales: 0,
        average_sale: 0,
        cups_sold: 0
    });
    const [topSales, setTopSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [itemToCategoryMap, setItemToCategoryMap] = useState({});

    // Memoize date range calculation
    const dateRange = useMemo(() => {
        return getDateRangeFromFilter(dateFilter, selectedDay, customStartDate, customEndDate);
    }, [dateFilter, selectedDay, customStartDate, customEndDate]);

    const loadCategoryMapping = useCallback(async () => {
        try {
            const categoriesWithItems = await databaseService.getCategoriesWithItems();
            const mapping = createItemCategoryMap(categoriesWithItems);
            setItemToCategoryMap(mapping);
            return mapping;
        } catch (error) {
            console.error('Error loading category mapping:', error);
            return {};
        }
    }, []);

    /**
     * OPTIMIZED: Load summary using SQL aggregation (no client-side processing)
     */
    const loadSummaryData = useCallback(async (mapping) => {
        try {
            const { startDate, endDate } = dateRange;

            // Use optimized SQL aggregation method
            const summary = await databaseService.getSummaryByDateRange(startDate, endDate);

            // Only need to load transactions for cups calculation if needed
            // For now, we'll use total_transactions as cups_sold
            setTotalSummary({
                total_transactions: summary.total_transactions,
                total_sales: summary.total_sales,
                average_sale: summary.average_sale,
                cups_sold: summary.cups_sold
            });
        } catch (error) {
            console.error('Error loading summary:', error);
        }
    }, [dateRange]);

    /**
     * OPTIMIZED: Load top sales using SQL aggregation
     */
    const loadTopSales = useCallback(async (mapping) => {
        try {
            const { startDate, endDate } = dateRange;

            // Use optimized SQL aggregation for top selling items
            const topItems = await databaseService.getTopSellingItems(startDate, endDate, 10);

            // Convert to the format expected by the UI
            const salesRanking = topItems.map(item => ({
                name: item.name,
                totalQuantity: item.quantity,
                totalRevenue: item.sales,
                transactions: item.transactionCount,
                category: mapping[item.name] || 'Uncategorized'
            }));

            setTopSales(salesRanking);
        } catch (error) {
            console.error('Error loading top sales:', error);
        }
    }, [dateRange, showAddOnsInTopSales]);

    /**
     * OPTIMIZED: Get transaction count for pagination (doesn't load all transactions)
     */
    const loadTransactions = useCallback(async (paginatedData) => {
        try {
            const { startDate, endDate } = dateRange;

            // Get total count using optimized query
            const totalCount = await databaseService.getTransactionCount({
                startDate,
                endDate,
                status: 'COMPLETED'
            });

            const formattedTransactions = paginatedData.map(transaction => ({
                ...transaction,
                transaction_datetime: new Date(transaction.transaction_datetime)
            }));

            return {
                transactions: formattedTransactions,
                totalCount: totalCount,
                allCompletedTransactions: [] // No longer needed - we use pagination
            };
        } catch (error) {
            console.error('Error loading transactions:', error);
            return {
                transactions: [],
                totalCount: 0,
                allCompletedTransactions: []
            };
        }
    }, [dateRange]);

    /**
     * OPTIMIZED: Load initial data without loading all transactions
     */
    const loadInitialData = useCallback(async () => {
        try {
            setLoading(true);
            console.log('Loading initial data with optimized queries...');

            // Load category mapping first
            const mapping = await loadCategoryMapping();

            // Load summary and top sales in parallel using SQL aggregation
            await Promise.all([
                loadSummaryData(mapping),
                loadTopSales(mapping)
            ]);

            console.log('Initial data loaded successfully');
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            setLoading(false);
        }
    }, [loadCategoryMapping, loadSummaryData, loadTopSales]);

    const refreshData = useCallback(async () => {
        await loadInitialData();
    }, [loadInitialData]);

    return {
        items,
        totalSummary,
        topSales,
        loading,
        itemToCategoryMap,
        setItems,
        loadInitialData,
        loadTransactions,
        refreshData,
        dateRange // Expose date range for use in other components
    };
};
