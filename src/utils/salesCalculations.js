/**
 * Sales calculation utilities
 */

/**
 * Calculate summary statistics from transactions
 * @param {Array} transactions - Array of completed transactions
 * @param {object} itemToCategoryMap - Mapping of item names to categories
 * @param {number} limit - Maximum number of transactions to process
 * @returns {object} Summary object with total_transactions, total_sales, average_sale, cups_sold
 */
export const calculateSummary = (transactions, itemToCategoryMap, limit = 1000) => {
    const limitedTransactions = transactions.slice(0, limit);

    const totalSales = limitedTransactions.reduce((sum, transaction) =>
        sum + parseFloat(transaction.total_amount), 0
    );
    const averageSale = limitedTransactions.length > 0 ?
        totalSales / limitedTransactions.length : 0;

    // Calculate cups sold (excluding add-ons)
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

    return {
        total_transactions: limitedTransactions.length,
        total_sales: totalSales,
        average_sale: averageSale,
        cups_sold: cupsSold
    };
};

/**
 * Calculate top sales ranking from transactions
 * @param {Array} transactions - Array of transactions
 * @param {object} itemToCategoryMap - Mapping of item names to categories
 * @param {boolean} includeAddOns - Whether to include add-on items
 * @returns {Array} Top 10 items sorted by quantity sold
 */
export const calculateTopSales = (transactions, itemToCategoryMap, includeAddOns = false) => {
    const itemSales = {};

    transactions.forEach(transaction => {
        if (transaction.items?.length > 0) {
            transaction.items.forEach(item => {
                const itemName = item.item_name;
                const categoryName = itemToCategoryMap[itemName];

                // Exclude if category starts with "Add" (case-insensitive), unless includeAddOns is true
                const shouldInclude = includeAddOns || !categoryName || !categoryName.toLowerCase().startsWith('add');

                if (shouldInclude) {
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
                }
            });
        }
    });

    return Object.values(itemSales)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10);
};

/**
 * Create item to category mapping from categories
 * @param {Array} categoriesWithItems - Array of category objects with items
 * @returns {object} Mapping of item names to category names
 */
export const createItemCategoryMap = (categoriesWithItems) => {
    const itemToCategoryMap = {};

    categoriesWithItems.forEach(category => {
        category.items.forEach(item => {
            itemToCategoryMap[item.item_name] = category.category_name;
        });
    });

    return itemToCategoryMap;
};

/**
 * Filter transactions to only completed ones
 * @param {Array} transactions - Array of transactions
 * @returns {Array} Array of completed transactions
 */
export const filterCompletedTransactions = (transactions) => {
    return transactions.filter(transaction =>
        !transaction.status || transaction.status.toUpperCase() === 'COMPLETED'
    );
};

/**
 * Format currency value
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
    return parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

/**
 * Get payment method color
 * @param {string} method - Payment method
 * @returns {string} Color code
 */
export const getPaymentMethodColor = (method) => {
    const methodLower = (method || 'cash').toLowerCase();
    if (methodLower.includes('gcash')) return '#007DFF';
    if (methodLower.includes('cash')) return '#4ade80';
    if (methodLower.includes('bpi')) return '#E31937';
    return '#6b7280';
};
