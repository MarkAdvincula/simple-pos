import { useState, useEffect, useCallback } from 'react';
import databaseService from '../services/database';
import {
    calculateSummary,
    calculateTopSales,
    createItemCategoryMap,
    filterCompletedTransactions
} from '../utils/salesCalculations';
import { filterTransactionsByDate } from '../utils/dateUtils';

const LIMIT_SALES_FOR_PERFORMANCE = 1000;

/**
 * Custom hook for managing transaction data
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

    const loadSummaryData = useCallback(async (mapping) => {
        try {
            const allTransactions = await databaseService.getTransactions();
            const filteredTransactions = filterTransactionsByDate(
                allTransactions,
                dateFilter,
                selectedDay,
                customStartDate,
                customEndDate
            );
            const completedTransactions = filterCompletedTransactions(filteredTransactions);

            const summary = calculateSummary(
                completedTransactions,
                mapping,
                LIMIT_SALES_FOR_PERFORMANCE
            );

            setTotalSummary(summary);
        } catch (error) {
            console.error('Error loading summary:', error);
        }
    }, [dateFilter, selectedDay, customStartDate, customEndDate]);

    const loadTopSales = useCallback(async (mapping) => {
        try {
            const allTransactions = await databaseService.getTransactions();
            const filteredTransactions = filterTransactionsByDate(
                allTransactions,
                dateFilter,
                selectedDay,
                customStartDate,
                customEndDate
            );
            const completedTransactions = filterCompletedTransactions(filteredTransactions);
            const limitedTransactions = completedTransactions.slice(0, LIMIT_SALES_FOR_PERFORMANCE);

            const salesRanking = calculateTopSales(limitedTransactions, mapping, showAddOnsInTopSales);
            setTopSales(salesRanking);
        } catch (error) {
            console.error('Error loading top sales:', error);
        }
    }, [dateFilter, selectedDay, customStartDate, customEndDate, showAddOnsInTopSales]);

    const loadTransactions = useCallback(async (paginatedData) => {
        try {
            const allTransactions = await databaseService.getTransactions();
            const filteredTransactions = filterTransactionsByDate(
                allTransactions,
                dateFilter,
                selectedDay,
                customStartDate,
                customEndDate
            );
            const completedTransactions = filterCompletedTransactions(filteredTransactions);

            const formattedTransactions = paginatedData.map(transaction => ({
                ...transaction,
                transaction_datetime: new Date(transaction.transaction_datetime)
            }));

            return {
                transactions: formattedTransactions,
                totalCount: completedTransactions.length,
                allCompletedTransactions: completedTransactions
            };
        } catch (error) {
            console.error('Error loading transactions:', error);
            return {
                transactions: [],
                totalCount: 0,
                allCompletedTransactions: []
            };
        }
    }, [dateFilter, selectedDay, customStartDate, customEndDate]);

    const loadInitialData = useCallback(async () => {
        try {
            setLoading(true);
            console.log('Loading initial data...');

            // Load category mapping first
            const mapping = await loadCategoryMapping();

            // Load summary and top sales in parallel
            await Promise.all([
                loadSummaryData(mapping),
                loadTopSales(mapping)
            ]);
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
        refreshData
    };
};
