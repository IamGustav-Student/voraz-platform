import { pool } from './src/config/db.js';

const BASE_URL = 'http://localhost:3000/api';
// Use the official Voraz tenant for load testing its specific config 
// BUT using dummy data for the product to not affect real sales.
const TENANT_ID = 'voraz';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function setup() {
    console.log('--- SETUP ---');

    let storeResult = await pool.query("SELECT id FROM stores WHERE tenant_id = $1 LIMIT 1", [TENANT_ID]);
    if (!storeResult.rows.length) {
        throw new Error("No hay sucursal en " + TENANT_ID);
    }
    const storeId = storeResult.rows[0].id;

    let catResult = await pool.query("SELECT id FROM categories WHERE tenant_id = $1 LIMIT 1", [TENANT_ID]);
    if (!catResult.rows.length) {
         throw new Error("No hay cat");
    }
    const catId = catResult.rows[0].id;

    // Create or reset product
    let prodResult = await pool.query("SELECT id FROM products WHERE name = 'STRESS BURGER 2026' AND tenant_id = $1 LIMIT 1", [TENANT_ID]);
    let productId;
    if (prodResult.rows.length) {
        productId = prodResult.rows[0].id;
        await pool.query("UPDATE products SET stock = 100 WHERE id = $1", [productId]);
    } else {
        prodResult = await pool.query(
            "INSERT INTO products (name, description, price, category_id, store_id, tenant_id, stock, is_active) VALUES ('STRESS BURGER 2026', 'Burger for stress test', 5000, $1, $2, $3, 100, true) RETURNING id",
            [catId, storeId, TENANT_ID]
        );
        productId = prodResult.rows[0].id;
    }
    console.log(`Test Product ID: ${productId}, Setup Stock: 100, Store: ${storeId}`);
    return { productId, storeId };
}

async function runMenuTest() {
    console.log('\n--- TEST 1: 500 Usuarios concurrentes Menu ---');
    const start = Date.now();
    const reqs = Array(500).fill().map(() => fetch(`${BASE_URL}/products`, {
        headers: { 'x-tenant-id': TENANT_ID }
    }).then(r => r.status).catch(e => e.message));
    
    const results = await Promise.all(reqs);
    const end = Date.now();
    const counts = results.reduce((acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    console.log(`Tiempo para servir 500 menús: ${end - start}ms`);
    console.log(`Respuestas:`, counts);
}

async function runCheckoutTest(productId, storeId) {
    console.log('\n--- TEST 2: 50 Usuarios Checkout (Concurrency & Stock Validator) ---');
    console.log('Stock inicial = 100. Cada pedido pide 3 (Total = 150). Por lo tanto 33 deberian ser EXITOSOS (99 descontado) y 17 ERRORES de STOCK. Stock Final = 1.');
    
    // We send 50 requests all at exactly the same time.
    const payload = {
        customer_name: 'QA Stress VU',
        customer_phone: '1122334455',
        order_type: 'pickup',
        store_id: storeId,
        items: [{
            product_id: productId,
            product_name: 'STRESS BURGER 2026',
            product_price: 5000,
            quantity: 3,
            subtotal: 15000
        }],
        total: 15000
    };

    const start = Date.now();
    // Fire precisely in parallel doing Promise.all
    const reqs = Array(50).fill().map((_, i) => {
        const reqStart = Date.now();
        return fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'x-tenant-id': TENANT_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(async r => {
            let data;
            try { data = await r.json(); } catch(e) { data = await r.text(); }
            return { status: r.status, data, time: Date.now() - reqStart, reqId: i };
        }).catch(e => ({ status: 'error', data: e.message, time: Date.now() - reqStart, reqId: i }));
    });

    const results = await Promise.all(reqs);
    const end = Date.now();
    
    let success = 0;
    let fail = 0;
    let lockWaitTymings = [];
    let errors = [];

    results.forEach(r => {
        lockWaitTymings.push(r.time);
        if (r.status === 201) success++;
        else {
            fail++;
            if (r.status >= 500) {
                errors.push(`[${r.reqId}] Error 500: ${JSON.stringify(r.data)} | Time: ${r.time}ms`);
            } else if (r.status === 400 && typeof r.data?.message === 'string' && r.data.message.includes('Stock insuficiente')) {
                // Expected expected error
            } else {
                errors.push(`[${r.reqId}] Error ${r.status}: ${JSON.stringify(r.data)} | Time: ${r.time}ms`);
            }
        }
    });

    console.log(`Tiempo de Checkout Masivo: ${end - start}ms`);
    console.log(`Latencias (ms): Min: ${Math.min(...lockWaitTymings)}, Max: ${Math.max(...lockWaitTymings)}, Avg: ${Math.round(lockWaitTymings.reduce((a,b)=>a+b,0)/lockWaitTymings.length)}`);
    console.log(`Exitosos: ${success} (Esperado: 33)`);
    console.log(`Fallidos: ${fail} (Esperado: 17)`);
    if (errors.length > 0) {
        console.log(`Log de Errores Críticos / DB:`);
        errors.forEach(e => console.log(e));
    } else {
        console.log(`✅ No hubieron errores críticos. Solo 400s de Stock natural.`);
    }

    // Checking final stock
    const dbStock = await pool.query("SELECT stock FROM products WHERE id = $1", [productId]);
    console.log(`Stock Final Real en DB: ${dbStock.rows[0].stock} (Esperado: 1)`);
    
    if (dbStock.rows[0].stock < 0) {
        console.log('🚨 ALERTA: SOBREVENTA DETECTADA (Stock Negativo) 🚨');
    } else if (dbStock.rows[0].stock === 1) {
        console.log('✅ VALIDACION EXITOSA: Sin sobreventas, la BD bloqueó correctamente el Race Condition FOR UPDATE.');
    } else {
        console.log('⚠️ Stock no es 1, verificar por qué.');
    }
}

async function run() {
    try {
        const { productId, storeId } = await setup();
        await runMenuTest();
        await delay(1000);
        await runCheckoutTest(productId, storeId);
    } catch (e) {
        console.error('Master Error:', e);
    } finally {
        pool.end();
    }
}

run();
