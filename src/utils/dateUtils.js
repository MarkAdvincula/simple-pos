/**
 * Date utility functions for filtering and formatting
 */

/**
 * Get date range based on filter type
 * @param {string} dateFilter - Filter type ('all', 'today', 'day', 'week', 'month', 'custom')
 * @param {Date} selectedDay - Selected day for 'day' filter
 * @param {Date} customStartDate - Custom start date for 'custom' filter
 * @param {Date} customEndDate - Custom end date for 'custom' filter
 * @returns {object|null} Object with startDate and endDate, or null for 'all'
 */
export const getDateRange = (dateFilter, selectedDay, customStartDate, customEndDate) => {
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
};

/**
 * Filter transactions by date range
 * @param {Array} transactions - Array of transactions
 * @param {string} dateFilter - Filter type
 * @param {Date} selectedDay - Selected day for 'day' filter
 * @param {Date} customStartDate - Custom start date for 'custom' filter
 * @param {Date} customEndDate - Custom end date for 'custom' filter
 * @returns {Array} Filtered transactions
 */
export const filterTransactionsByDate = (transactions, dateFilter, selectedDay, customStartDate, customEndDate) => {
    if (dateFilter === 'all') return transactions;

    const dateRange = getDateRange(dateFilter, selectedDay, customStartDate, customEndDate);
    if (!dateRange) return transactions;

    const { startDate, endDate } = dateRange;

    return transactions.filter(transaction => {
        const transactionDate = new Date(transaction.transaction_datetime);
        return transactionDate >= startDate && transactionDate <= endDate;
    });
};

/**
 * Get display text for current date filter
 * @param {string} dateFilter - Filter type
 * @param {Date} selectedDay - Selected day
 * @param {Date} customStartDate - Custom start date
 * @param {Date} customEndDate - Custom end date
 * @returns {string} Display text
 */
export const getFilterDisplayText = (dateFilter, selectedDay, customStartDate, customEndDate) => {
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
};

/**
 * Convert Date to ISO datetime format (YYYY-MM-DDTHH:MM:SS.mmmZ)
 * FIX: Use ISO format to match how transactions are stored in database
 * @param {Date} date - Date to convert
 * @returns {string} ISO formatted datetime string
 */
export const toSQLDateTime = (date) => {
    // Use ISO format since transactions are stored with toISOString()
    // This ensures proper comparison in SQLite BETWEEN clauses
    return date.toISOString();
};

/**
 * Get date range in SQL format for database queries
 * OPTIMIZED for direct use with database queries
 * @param {string} dateFilter - Filter type ('all', 'today', 'day', 'week', 'month', 'custom')
 * @param {Date} selectedDay - Selected day for 'day' filter
 * @param {Date} customStartDate - Custom start date for 'custom' filter
 * @param {Date} customEndDate - Custom end date for 'custom' filter
 * @returns {object} Object with startDate and endDate in SQL format
 */
export const getDateRangeFromFilter = (dateFilter, selectedDay, customStartDate, customEndDate) => {
    // For 'all' filter, use a very wide date range in ISO format
    if (dateFilter === 'all') {
        return {
            startDate: '2000-01-01T00:00:00.000Z',
            endDate: '2099-12-31T23:59:59.999Z'
        };
    }

    const dateRange = getDateRange(dateFilter, selectedDay, customStartDate, customEndDate);

    if (!dateRange) {
        // Default to wide range
        return {
            startDate: '2000-01-01T00:00:00.000Z',
            endDate: '2099-12-31T23:59:59.999Z'
        };
    }

    return {
        startDate: toSQLDateTime(dateRange.startDate),
        endDate: toSQLDateTime(dateRange.endDate)
    };
};
