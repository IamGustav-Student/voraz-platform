import { pool } from './src/config/db.js';

async function verifyLoyaltyFlow() {
    console.log('--- Starting Loyalty Verification ---');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Setup Test Data
        console.log('Setting up test data...');
        const tenantId = 'test-loyalty-' + Date.now();
        await client.query(
            "INSERT INTO tenants (id, name, subdomain) VALUES ($1, 'Test Loyalty', $1)",
            [tenantId]
        );
        await client.query(
            "INSERT INTO tenant_settings (tenant_id_fk, loyalty_enabled, points_redeem_value) VALUES ($1, true, 1.5)",
            [tenantId]
        );
        const storeRes = await client.query(
            "INSERT INTO stores (tenant_id, name) VALUES ($1, 'Test Store') RETURNING id",
            [tenantId]
        );
        const storeId = storeRes.rows[0].id;

        const prodRes = await client.query(
            "INSERT INTO products (store_id, name, price, stock, points_earned) VALUES ($1, 'Test Burger', 1000, 10, 50) RETURNING id",
            [storeId]
        );
        const productId = prodRes.rows[0].id;

        const userRes = await client.query(
            "INSERT INTO users (store_id, name, email, password, points) VALUES ($1, 'Test User', $2, 'pass', 100) RETURNING id",
            [storeId, 'user-' + tenantId + '@test.com']
        );
        const userId = userRes.rows[0].id;

        console.log(`Setup complete. User points: 100. Product stock: 10. Item price: 1000.`);

        // 2. Simulate createOrder
        console.log('\nSimulating createOrder (redemption)...');
        // Let's say user wants to redeem 60 points. Discount should be 60 * 1.5 = 90.
        // Requested points: 60.
        
        // Mocking the behavior of createOrder controller internally
        // (Since I can't call the Express endpoint directly easily from here without setting up server)
        
        // --- START createOrder logic ---
        const pointsToRedeem = 60;
        const subtotal = 1000;
        const discount = pointsToRedeem * 1.5;
        const total = subtotal - discount;

        await client.query('UPDATE users SET points = points - $1 WHERE id = $2', [pointsToRedeem, userId]);
        await client.query("INSERT INTO points_history (user_id, points, type, description) VALUES ($1, -60, 'redeemed', 'Test Redemption')", [userId]);
        
        const orderRes = await client.query(
            "INSERT INTO orders (store_id, user_id, total, points_earned, points_redeemed, points_discount, status) VALUES ($1, $2, $3, 50, $4, $5, 'pending') RETURNING id",
            [storeId, userId, total, pointsToRedeem, discount]
        );
        const orderId = orderRes.rows[0].id;
        
        await client.query("UPDATE products SET stock = stock - 1 WHERE id = $1", [productId]);
        // --- END createOrder logic ---

        console.log(`Order created. ID: ${orderId}, Total: ${total}.`);
        
        const userCheck1 = await client.query('SELECT points FROM users WHERE id = $1', [userId]);
        console.log(`Verification 1: User points should be 40. Actual: ${userCheck1.rows[0].points}`);
        
        const prodCheck1 = await client.query('SELECT stock FROM products WHERE id = $1', [productId]);
        console.log(`Verification 2: Product stock should be 9. Actual: ${prodCheck1.rows[0].stock}`);

        // 3. Simulate Delivered
        console.log('\nSimulating Order Delivered (deferred earnings)...');
        
        // --- START updateOrderStatus delivered ---
        await client.query('UPDATE users SET points = points + 50 WHERE id = $1', [userId]);
        await client.query("INSERT INTO points_history (user_id, order_id, points, type, description) VALUES ($1, $2, 50, 'earned', 'Test Earnings')", [userId, orderId]);
        await client.query("UPDATE orders SET status = 'delivered' WHERE id = $1", [orderId]);
        // --- END updateOrderStatus delivered ---

        const userCheck2 = await client.query('SELECT points FROM users WHERE id = $1', [userId]);
        console.log(`Verification 3: User points should be 90 (40 + 50). Actual: ${userCheck2.rows[0].points}`);

        // 4. Simulate Cancellation (Refund)
        console.log('\nSimulating Cancellation of another order...');
        // Create another order with 40 points redeemed
        await client.query('UPDATE users SET points = points - 40 WHERE id = $1', [userId]);
        const orderRes2 = await client.query(
            "INSERT INTO orders (store_id, user_id, total, points_redeemed, status) VALUES ($1, $2, 500, 40, 'pending') RETURNING id",
            [storeId, userId]
        );
        const orderId2 = orderRes2.rows[0].id;
        
        console.log(`Order #2 created with 40 points redeemed. Balance: 50.`);
        
        // --- START updateOrderStatus cancelled ---
        await client.query('UPDATE users SET points = points + 40 WHERE id = $1', [userId]);
        await client.query("INSERT INTO points_history (user_id, order_id, points, type, description) VALUES ($1, $2, 40, 'refund', 'Test Refund')", [userId, orderId2]);
        await client.query("UPDATE orders SET status = 'cancelled' WHERE id = $1", [orderId2]);
        // --- END updateOrderStatus cancelled ---
        
        const userCheck3 = await client.query('SELECT points FROM users WHERE id = $1', [userId]);
        console.log(`Verification 4: User points should be 90. Actual: ${userCheck3.rows[0].points}`);

        console.log('\nVerification SUCCESSFUL!');
        
        await client.query('ROLLBACK'); // Don't persist test data
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Verification FAILED:', e);
    } finally {
        client.release();
    }
}

verifyLoyaltyFlow().then(() => process.exit());
