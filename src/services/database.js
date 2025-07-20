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
            console.log('Initializing database...');
            this.db = await SQLite.openDatabaseAsync('pos.db');
            await this.createTables();
            this.initialized = true;
            console.log('Database initialized successfully');
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
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            `);

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

            console.log('Tables created successfully');
        } catch (error) {
            console.error('Error creating tables:', error);
            throw error;
        }
    }

    async addTransaction(items, paymentMethod) {
        await this.init(); // Ensure database is initialized

        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const datetime = new Date().toISOString();

        try {
            console.log('Adding transaction...', { totalAmount, paymentMethod });

            // Start transaction
            const result = await this.db.runAsync(
                'INSERT INTO transactions_tbl (transaction_datetime, total_amount, payment_method) VALUES (?, ?, ?)',
                [datetime, totalAmount, paymentMethod]
            );

            const transactionId = result.lastInsertRowId;
            console.log('Transaction created with ID:', transactionId);

            // Add items
            for (const item of items) {
                const lineTotal = item.price * item.quantity;
                await this.db.runAsync(
                    'INSERT INTO transaction_items_tbl (transaction_id, item_name, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?)',
                    [transactionId, item.name, item.price, item.quantity, lineTotal]
                );
            }

            console.log('Transaction and items added successfully');
            return transactionId;
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    }

    async getTransactions() {
        await this.init(); // Ensure database is initialized

        try {
            console.log('Fetching transactions...');
            
            const transactions = await this.db.getAllAsync(`
                SELECT 
                    t.id,
                    t.transaction_datetime,
                    t.total_amount,
                    t.payment_method,
                    t.created_at
                FROM transactions_tbl t
                ORDER BY t.transaction_datetime DESC
            `);

            console.log('Found transactions:', transactions.length);

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
                    t.payment_method
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
                    SUM(total_amount) as total_sales,
                    AVG(total_amount) as average_sale
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