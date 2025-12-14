import * as SQLite from 'expo-sqlite';

class DatabaseService {
    constructor() {
        this.db = null;
        this.initialized = false;
        this.initPromise = null;
    }

    async init() {
        // Prevent multiple initializations
        if (this.initPromise) {
            return this.initPromise;
        }

        if (this.initialized) {
            return this.db;
        }

        this.initPromise = this._initDatabase();
        return this.initPromise;
    }

    async _initDatabase() {
        try {
            this.db = await SQLite.openDatabaseAsync('pos.db');
            await this.createTables();
            this.initialized = true;
            return this.db;
        } catch (error) {
            console.error('Failed to initialize database:', error);
            this.initPromise = null; // Reset so we can try again
            throw error;
        }
    }

    async createTables() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            // Create transactions table
            await this.db.execAsync(`
                CREATE TABLE IF NOT EXISTS transactions_tbl (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    transaction_datetime TEXT NOT NULL,
                    total_amount REAL NOT NULL,
                    payment_method TEXT,
                    status TEXT DEFAULT 'COMPLETED',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Add status column to existing table if it doesn't exist
            try {
                await this.db.execAsync(`
                    ALTER TABLE transactions_tbl
                    ADD COLUMN status TEXT DEFAULT 'COMPLETED'
                `);
            } catch (error) {
                // Column might already exist, ignore the error
                console.log('Status column might already exist:', error.message);
            }

            // Create transaction items table
            await this.db.execAsync(`
                CREATE TABLE IF NOT EXISTS transaction_items_tbl (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    transaction_id INTEGER NOT NULL,
                    item_name TEXT NOT NULL,
                    unit_price REAL NOT NULL,
                    quantity INTEGER NOT NULL,
                    line_total REAL NOT NULL,
                    FOREIGN KEY (transaction_id) REFERENCES transactions_tbl (id)
                );
            `);

            await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_name TEXT NOT NULL,
                display_order INTEGER DEFAULT 0
            );
            `);

            // Add display_order column to existing table if it doesn't exist
            try {
                await this.db.execAsync(`
                    ALTER TABLE categories
                    ADD COLUMN display_order INTEGER DEFAULT 0
                `);
            } catch (error) {
                // Column might already exist, ignore the error
                console.log('display_order column might already exist:', error.message);
            }
            /**
             * Items:
             * 
                'Espresso': [
                { name: 'Sea Salt Latte', price: 180 },
                { name: 'Orange Americano', price: 150 },
                { name: 'Cafe Latte', price: 150 },
                { name: 'Americano', price: 120 },
                ],
                'Brewed': [
                { name: 'Iced Vietnamese Latte', price: 120 },
                { name: 'Iced Vietnamese Latte', price: 150 }
                ],
             */

            await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cid INTEGER NOT NULL,
                item_name TEXT NOT NULL,
                price REAL NOT NULL,
                FOREIGN KEY (cid) REFERENCES categories (id)
            );
            `);

            // Create queued orders table
            await this.db.execAsync(`
                CREATE TABLE IF NOT EXISTS queued_orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    queue_name TEXT NOT NULL,
                    created_date TEXT NOT NULL,
                    created_time TEXT NOT NULL,
                    created_datetime TEXT NOT NULL,
                    item_count INTEGER NOT NULL,
                    total_amount REAL NOT NULL
                );
            `);

            // Create queued order items table
            await this.db.execAsync(`
                CREATE TABLE IF NOT EXISTS queued_order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    queue_id INTEGER NOT NULL,
                    item_name TEXT NOT NULL,
                    unit_price REAL NOT NULL,
                    quantity INTEGER NOT NULL,
                    line_total REAL NOT NULL,
                    FOREIGN KEY (queue_id) REFERENCES queued_orders (id)
                );
            `);


        } catch (error) {
            console.error('Error creating tables:', error);
            throw error;
        }
    }


    async initializeCategoryOrder() {
        await this.init();

        try {
            // Get all categories ordered by name (fallback for unordered ones)
            const categories = await this.db.getAllAsync(`
                SELECT id FROM categories ORDER BY category_name ASC
            `);

            // Update each category with proper display_order
            for (let i = 0; i < categories.length; i++) {
                await this.db.runAsync(
                    'UPDATE categories SET display_order = ? WHERE id = ?',
                    [i + 1, categories[i].id]
                );
            }
        } catch (error) {
            console.error('Error initializing category order:', error);
        }
    }

    async getCategoriesWithItems() {
        await this.init();

        try {
            // Initialize order if needed (first time or all zeros)
            const checkOrder = await this.db.getFirstAsync(`
                SELECT COUNT(*) as count FROM categories WHERE display_order > 0
            `);

            if (checkOrder?.count === 0) {
                await this.initializeCategoryOrder();
            }

            const categories = await this.db.getAllAsync(`
                SELECT id, category_name, display_order
                FROM categories
                ORDER BY display_order ASC, category_name ASC
            `);

            for (const category of categories) {
                const items = await this.db.getAllAsync(`
                    SELECT id, item_name, price
                    FROM items
                    WHERE cid = ?
                    ORDER BY item_name
                `, [category.id]);

                category.items = items;
            }

            return categories;
        } catch (error) {
            console.error('Error getting categories with items:', error);
            throw error;
        }
    }

    async addCategory(categoryName) {
        await this.init();

        try {
            // Get the max display_order and add 1
            const maxOrder = await this.db.getFirstAsync(
                'SELECT MAX(display_order) as max_order FROM categories'
            );
            const newOrder = (maxOrder?.max_order || 0) + 1;

            const result = await this.db.runAsync(
                'INSERT INTO categories (category_name, display_order) VALUES (?, ?)',
                [categoryName, newOrder]
            );
            return result.lastInsertRowId;
        } catch (error) {
            console.error('Error adding category:', error);
            throw error;
        }
    }

    async updateCategoryOrder(categoryId, newOrder) {
        await this.init();

        try {
            await this.db.runAsync(
                'UPDATE categories SET display_order = ? WHERE id = ?',
                [newOrder, categoryId]
            );
        } catch (error) {
            console.error('Error updating category order:', error);
            throw error;
        }
    }

    async moveCategoryUp(categoryId) {
        await this.init();

        try {
            const categories = await this.db.getAllAsync(
                'SELECT id, display_order FROM categories ORDER BY display_order ASC'
            );

            const currentIndex = categories.findIndex(c => c.id === categoryId);
            if (currentIndex > 0) {
                // Swap with previous category
                const currentOrder = categories[currentIndex].display_order;
                const prevOrder = categories[currentIndex - 1].display_order;

                await this.updateCategoryOrder(categoryId, prevOrder);
                await this.updateCategoryOrder(categories[currentIndex - 1].id, currentOrder);
            }
        } catch (error) {
            console.error('Error moving category up:', error);
            throw error;
        }
    }

    async moveCategoryDown(categoryId) {
        await this.init();

        try {
            const categories = await this.db.getAllAsync(
                'SELECT id, display_order FROM categories ORDER BY display_order ASC'
            );

            const currentIndex = categories.findIndex(c => c.id === categoryId);
            if (currentIndex < categories.length - 1 && currentIndex !== -1) {
                // Swap with next category
                const currentOrder = categories[currentIndex].display_order;
                const nextOrder = categories[currentIndex + 1].display_order;

                await this.updateCategoryOrder(categoryId, nextOrder);
                await this.updateCategoryOrder(categories[currentIndex + 1].id, currentOrder);
            }
        } catch (error) {
            console.error('Error moving category down:', error);
            throw error;
        }
    }
    
    async addItem(categoryId, itemName, price) {
        await this.init();
    
        try {
            const result = await this.db.runAsync(
                'INSERT INTO items (cid, item_name, price) VALUES (?, ?, ?)',
                [categoryId, itemName, price]
            );
            return result.lastInsertRowId;
        } catch (error) {
            console.error('Error adding item:', error);
            throw error;
        }
    }

    async updateItem(id, itemName, price) {
        await this.init();

        try {
            await this.db.runAsync(
                'UPDATE items SET item_name = ?, price = ? WHERE id = ?',
                [itemName, price, id]
            );
        } catch (error) {
            console.error('Error updating item:', error);
            throw error;
        }
    }

    async deleteItem(id) {
        await this.init();

        try {
            await this.db.runAsync(
                'DELETE FROM items WHERE id = ?',
                [id]
            );
        } catch (error) {
            console.error('Error deleting item:', error);
            throw error;
        }
    }

    async addTransaction(items, paymentMethod, status = 'COMPLETED') {
        await this.init(); // Ensure database is initialized

        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const datetime = new Date().toISOString();

        try {

            // Start transaction
            const result = await this.db.runAsync(
                'INSERT INTO transactions_tbl (transaction_datetime, total_amount, payment_method, status) VALUES (?, ?, ?, ?)',
                [datetime, totalAmount, paymentMethod, status]
            );

            const transactionId = result.lastInsertRowId;

            // Add items
            for (const item of items) {
                const lineTotal = item.price * item.quantity;
                await this.db.runAsync(
                    'INSERT INTO transaction_items_tbl (transaction_id, item_name, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?)',
                    [transactionId, item.name, item.price, item.quantity, lineTotal]
                );
            }

            return transactionId;
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    }

    async getTransactions() {
        await this.init(); // Ensure database is initialized

        try {
            
            const transactions = await this.db.getAllAsync(`
                SELECT
                    t.id,
                    t.transaction_datetime,
                    t.total_amount,
                    t.payment_method,
                    t.status,
                    t.created_at
                FROM transactions_tbl t
                ORDER BY t.transaction_datetime DESC
            `);


            // Get items for each transaction
            for (const transaction of transactions) {
                const items = await this.db.getAllAsync(`
                    SELECT item_name, unit_price, quantity, line_total
                    FROM transaction_items_tbl
                    WHERE transaction_id = ?
                `, [transaction.id]);
                
                transaction.items = items;
            }

            return transactions;
        } catch (error) {
            console.error('Error getting transactions:', error);
            throw error;
        }
    }

    async getTransactionById(id) {
        await this.init();

        try {
            const transaction = await this.db.getFirstAsync(`
                SELECT * FROM transactions_tbl WHERE id = ?
            `, [id]);

            if (transaction) {
                const items = await this.db.getAllAsync(`
                    SELECT item_name, unit_price, quantity, line_total
                    FROM transaction_items_tbl
                    WHERE transaction_id = ?
                `, [id]);
                
                transaction.items = items;
            }

            return transaction;
        } catch (error) {
            console.error('Error getting transaction by ID:', error);
            throw error;
        }
    }

    async getTransactionsByDate(date) {
        await this.init();

        const startDate = `${date} 00:00:00`;
        const endDate = `${date} 23:59:59`;

        try {
            const transactions = await this.db.getAllAsync(`
                SELECT
                    t.id,
                    t.transaction_datetime,
                    t.total_amount,
                    t.payment_method,
                    t.status
                FROM transactions_tbl t
                WHERE t.transaction_datetime BETWEEN ? AND ?
                ORDER BY t.transaction_datetime DESC
            `, [startDate, endDate]);

            for (const transaction of transactions) {
                const items = await this.db.getAllAsync(`
                    SELECT item_name, unit_price, quantity, line_total
                    FROM transaction_items_tbl
                    WHERE transaction_id = ?
                `, [transaction.id]);
                
                transaction.items = items;
            }

            return transactions;
        } catch (error) {
            console.error('Error getting transactions by date:', error);
            throw error;
        }
    }

    async getDailySummary(date) {
        await this.init();

        const startDate = `${date} 00:00:00`;
        const endDate = `${date} 23:59:59`;

        try {
            const summary = await this.db.getFirstAsync(`
                SELECT
                    COUNT(*) as total_transactions,
                    SUM(CASE WHEN status != 'VOID' THEN total_amount ELSE 0 END) as total_sales,
                    AVG(CASE WHEN status != 'VOID' THEN total_amount ELSE NULL END) as average_sale,
                    COUNT(CASE WHEN status = 'VOID' THEN 1 END) as void_count
                FROM transactions_tbl
                WHERE transaction_datetime BETWEEN ? AND ?
            `, [startDate, endDate]);

            return summary;
        } catch (error) {
            console.error('Error getting daily summary:', error);
            throw error;
        }
    }

    async deleteTransaction(id) {
        await this.init();

        try {
            await this.db.runAsync('DELETE FROM transaction_items_tbl WHERE transaction_id = ?', [id]);
            await this.db.runAsync('DELETE FROM transactions_tbl WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    }

    async voidTransaction(id) {
        await this.init();

        try {
            await this.db.runAsync(
                'UPDATE transactions_tbl SET status = ? WHERE id = ?',
                ['VOID', id]
            );
        } catch (error) {
            console.error('Error voiding transaction:', error);
            throw error;
        }
    }

    async updateTransactionStatus(id, status) {
        await this.init();

        try {
            await this.db.runAsync(
                'UPDATE transactions_tbl SET status = ? WHERE id = ?',
                [status, id]
            );
        } catch (error) {
            console.error('Error updating transaction status:', error);
            throw error;
        }
    }

    async deleteAllTransaction(){
      await this.init();

      try{
        await this.db.runAsync('DELETE * FROM transactions_tbl');
        await this.db.runAsync('DELETE * FROM transaction_items_tbl');
      } catch (error) {
        console.error('Error dropping items: ', error);
        throw error;
      }
    }

    // Method to check if database is ready
    isReady() {
        return this.initialized && this.db !== null;
    }

    async exportMenu() {
        await this.init();

        try {
            const categoriesWithItems = await this.getCategoriesWithItems();

            // Transform to exportable format
            const menuData = {
                version: "1.0",
                exportDate: new Date().toISOString(),
                categories: categoriesWithItems.map(category => ({
                    name: category.category_name,
                    items: category.items.map(item => ({
                        name: item.item_name,
                        price: item.price
                    }))
                }))
            };

            return menuData;
        } catch (error) {
            console.error('Error exporting menu:', error);
            throw error;
        }
    }

    async importMenu(menuData, replaceExisting = false) {
        await this.init();

        try {
            // Validate menu data structure
            if (!menuData || !menuData.categories || !Array.isArray(menuData.categories)) {
                throw new Error('Invalid menu data format');
            }

            // If replacing existing menu, clear all categories and items
            if (replaceExisting) {
                await this.db.runAsync('DELETE FROM items');
                await this.db.runAsync('DELETE FROM categories');
            }

            // Import categories and items
            for (const category of menuData.categories) {
                if (!category.name || !Array.isArray(category.items)) {
                    continue; // Skip invalid categories
                }

                // Check if category already exists
                let categoryId;
                const existingCategory = await this.db.getFirstAsync(
                    'SELECT id FROM categories WHERE category_name = ?',
                    [category.name]
                );

                if (existingCategory) {
                    categoryId = existingCategory.id;
                } else {
                    // Add new category
                    const result = await this.db.runAsync(
                        'INSERT INTO categories (category_name) VALUES (?)',
                        [category.name]
                    );
                    categoryId = result.lastInsertRowId;
                }

                // Add items to the category
                for (const item of category.items) {
                    if (!item.name || item.price === undefined) {
                        continue; // Skip invalid items
                    }

                    // Check if item already exists in this category
                    const existingItem = await this.db.getFirstAsync(
                        'SELECT id FROM items WHERE cid = ? AND item_name = ?',
                        [categoryId, item.name]
                    );

                    if (!existingItem) {
                        // Add new item
                        await this.db.runAsync(
                            'INSERT INTO items (cid, item_name, price) VALUES (?, ?, ?)',
                            [categoryId, item.name, item.price]
                        );
                    } else if (replaceExisting) {
                        // Update existing item if replacing
                        await this.db.runAsync(
                            'UPDATE items SET price = ? WHERE id = ?',
                            [item.price, existingItem.id]
                        );
                    }
                }
            }

            return {
                success: true,
                message: `Menu imported successfully. ${menuData.categories.length} categories processed.`
            };
        } catch (error) {
            console.error('Error importing menu:', error);
            throw error;
        }
    }

    async clearMenu() {
        await this.init();

        try {
            await this.db.runAsync('DELETE FROM items');
            await this.db.runAsync('DELETE FROM categories');
            return {
                success: true,
                message: 'Menu cleared successfully.'
            };
        } catch (error) {
            console.error('Error clearing menu:', error);
            throw error;
        }
    }

    // Queue management methods
    async addQueuedOrder(queueName, items, totalAmount) {
        await this.init();

        const now = new Date();
        const datetime = now.toISOString();
        const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const time = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }); // e.g., "3:00 PM"

        try {
            const result = await this.db.runAsync(
                'INSERT INTO queued_orders (queue_name, created_date, created_time, created_datetime, item_count, total_amount) VALUES (?, ?, ?, ?, ?, ?)',
                [queueName, date, time, datetime, items.length, totalAmount]
            );

            const queueId = result.lastInsertRowId;

            // Add items to queue
            for (const item of items) {
                const lineTotal = item.price * item.quantity;
                await this.db.runAsync(
                    'INSERT INTO queued_order_items (queue_id, item_name, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?)',
                    [queueId, item.name, item.price, item.quantity, lineTotal]
                );
            }

            return queueId;
        } catch (error) {
            console.error('Error adding queued order:', error);
            throw error;
        }
    }

    async getQueuedOrders() {
        await this.init();

        try {
            const queues = await this.db.getAllAsync(`
                SELECT * FROM queued_orders
                ORDER BY created_datetime DESC
            `);

            // Get items for each queue
            for (const queue of queues) {
                const items = await this.db.getAllAsync(`
                    SELECT item_name, unit_price, quantity, line_total
                    FROM queued_order_items
                    WHERE queue_id = ?
                `, [queue.id]);

                queue.items = items;
            }

            return queues;
        } catch (error) {
            console.error('Error getting queued orders:', error);
            throw error;
        }
    }

    async getQueuedOrderById(id) {
        await this.init();

        try {
            const queue = await this.db.getFirstAsync(`
                SELECT * FROM queued_orders WHERE id = ?
            `, [id]);

            if (queue) {
                const items = await this.db.getAllAsync(`
                    SELECT item_name, unit_price, quantity, line_total
                    FROM queued_order_items
                    WHERE queue_id = ?
                `, [id]);

                queue.items = items;
            }

            return queue;
        } catch (error) {
            console.error('Error getting queued order by ID:', error);
            throw error;
        }
    }

    async deleteQueuedOrder(id) {
        await this.init();

        try {
            await this.db.runAsync('DELETE FROM queued_order_items WHERE queue_id = ?', [id]);
            await this.db.runAsync('DELETE FROM queued_orders WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting queued order:', error);
            throw error;
        }
    }

    async getQueueCount() {
        await this.init();

        try {
            const result = await this.db.getFirstAsync(`
                SELECT COUNT(*) as count FROM queued_orders
            `);
            return result?.count || 0;
        } catch (error) {
            console.error('Error getting queue count:', error);
            return 0;
        }
    }

    // Method to close database (for cleanup)
    async close() {
        if (this.db) {
            await this.db.closeAsync();
            this.db = null;
            this.initialized = false;
            this.initPromise = null;
        }
    }
}

// Create a singleton instance
const databaseService = new DatabaseService();

export default databaseService;