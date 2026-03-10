import { getDashboardStats } from './src/controllers/admin.controller.js';
import * as dbModule from './src/config/db.js';

// Mock the query function
const originalQuery = dbModule.query;
dbModule.query = async (text, params) => {
    console.log('--- QUERY CALLED ---');
    console.log('Query:', text);
    console.log('Params:', params);

    // Simulate real backend responses to avoid crashing initially
    if (text.includes('SELECT id FROM stores WHERE tenant_id')) {
        return { rows: [{ id: 4 }] }; // Mock store_id = 4
    }
    return { rows: [{ count: 10, revenue: 1000 }] };
};

const req = {
    tenant: { id: 'comercio4' },
    store: { id: 'comercio4' }
};

const res = {
    json: (data) => console.log('RESPONSE:', data),
    status: (code) => ({
        json: (data) => console.log(`RESPONSE [${code}]:`, data)
    })
};

getDashboardStats(req, res).then(() => {
    console.log('Test complete');
});
