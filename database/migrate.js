/**
 * Safe database migration and sample data script
 * Runs idempotently without destroying existing data or tables
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
    console.log('Connecting to MySQL to verify schema...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'SpendSmart123',
        database: process.env.DB_NAME || 'cakehub'
    });

    try {
        console.log('Checking orders table columns...');
        const [orderCols] = await connection.query('SHOW COLUMNS FROM orders');
        const orderColNames = orderCols.map(c => c.Field);

        if (!orderColNames.includes('customer_name')) {
            await connection.query('ALTER TABLE orders ADD COLUMN customer_name VARCHAR(100) NULL AFTER user_id');
            console.log(' -> Added customer_name column to orders');
        }
        if (!orderColNames.includes('phone')) {
            await connection.query('ALTER TABLE orders ADD COLUMN phone VARCHAR(20) NULL AFTER customer_name');
            console.log(' -> Added phone column to orders');
        }
        if (!orderColNames.includes('delivery_address')) {
            await connection.query('ALTER TABLE orders ADD COLUMN delivery_address TEXT NULL AFTER phone');
            console.log(' -> Added delivery_address column to orders');
        }
        if (!orderColNames.includes('delivery_notes')) {
            await connection.query('ALTER TABLE orders ADD COLUMN delivery_notes TEXT NULL AFTER delivery_address');
            console.log(' -> Added delivery_notes column to orders');
        }
        if (!orderColNames.includes('payment_method')) {
            await connection.query("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'Cash on Delivery' AFTER total_amount");
            console.log(' -> Added payment_method column to orders');
        }

        console.log('Checking users table columns...');
        const [userCols] = await connection.query('SHOW COLUMNS FROM users');
        const userColNames = userCols.map(c => c.Field);
        if (!userColNames.includes('role')) {
            await connection.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'customer' AFTER phone");
            console.log(' -> Added role column to users');
        }

        // Check if admin user exists or set Vijay as admin or ensure sample admin
        const [admins] = await connection.query("SELECT * FROM users WHERE role = 'admin'");
        if (admins.length === 0) {
            // Update user with id 1 or vijay@gmail.com to be admin if exists
            await connection.query("UPDATE users SET role = 'admin' WHERE id = 1 OR email = 'vijay@gmail.com'");
            console.log(' -> Assigned admin role to initial user');
        }

        console.log('Checking unique constraint on cart...');
        const [cartIndexes] = await connection.query("SHOW INDEX FROM cart WHERE Key_name = 'uq_user_product'");
        if (cartIndexes.length === 0) {
            try {
                await connection.query('ALTER TABLE cart ADD CONSTRAINT uq_user_product UNIQUE (user_id, product_id)');
                console.log(' -> Added uq_user_product UNIQUE constraint to cart');
            } catch (idxErr) {
                console.log(' -> Cart index already exists or note:', idxErr.message);
            }
        }

        console.log('Checking sample products...');
        const [existingProducts] = await connection.query('SELECT COUNT(*) as cnt FROM products');
        console.log(`Current product count: ${existingProducts[0].cnt}`);

        // Add additional rich bakery products if less than 10
        const sampleProducts = [
            {
                name: 'Strawberry Shortcake',
                category: 'Cakes',
                price: 580.00,
                description: 'Fluffy sponge cake layered with fresh strawberries and whipped cream',
                image: 'strawberry-shortcake.jpg'
            },
            {
                name: 'Almond Biscotti',
                category: 'Cookies',
                price: 210.00,
                description: 'Twice-baked crunchy Italian almond biscuits, perfect with espresso',
                image: 'almond-biscotti.jpg'
            },
            {
                name: 'Mango Tart',
                category: 'Pastries',
                price: 175.00,
                description: 'Golden tart shell filled with vanilla custard and fresh ripe mango slices',
                image: 'mango-tart.jpg'
            },
            {
                name: 'Pain au Chocolat',
                category: 'Viennoiseries',
                price: 140.00,
                description: 'Flaky buttery pastry folded around rich dark chocolate batons',
                image: 'pain-au-chocolat.jpg'
            }
        ];

        for (const p of sampleProducts) {
            const [found] = await connection.query('SELECT id FROM products WHERE name = ?', [p.name]);
            if (found.length === 0) {
                await connection.query(
                    'INSERT INTO products (name, category, price, description, image) VALUES (?, ?, ?, ?, ?)',
                    [p.name, p.category, p.price, p.description, p.image]
                );
                console.log(` -> Inserted product: ${p.name}`);
            }
        }

        console.log('Database migration & check completed successfully!');
    } catch (error) {
        console.error('Migration error:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

if (require.main === module) {
    runMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = runMigration;
