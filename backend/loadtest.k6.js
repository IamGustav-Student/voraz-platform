import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// Métricas personalizadas
const menuSuccessRate = new Rate('menu_success_rate');
const checkoutSuccessRate = new Rate('checkout_success_rate');
const overstockErrors = new Counter('overstock_errors'); // 5xx o 400 inesperados

export const options = {
  scenarios: {
    menu_load: {
      executor: 'constant-vus',
      vus: 500, // 500 usuarios viendo el menú
      duration: '30s',
      exec: 'getMenu',
    },
    checkout_rush: {
      executor: 'per-vu-iterations',
      vus: 50, // 50 usuarios finalizando compra
      iterations: 3, // Intentan comprar repetidas veces para vaciar stock
      maxDuration: '30s',
      startTime: '5s', // Espera a que la carga del menú empiece
      exec: 'submitCheckout',
    },
  },
  thresholds: {
    menu_success_rate: ['rate>0.95'],        // 95% de éxito en menú
    http_req_duration: ['p(95)<2000'],       // 95% de peticiones en menos de 2s
  },
};

const BASE_URL = 'http://localhost:3000/api';
const TENANT_ID = 'test_tenant'; // tenant aislado para no afectar Voraz
const TEST_STORE_ID = 1; // Ajustar a ID real
const TEST_PRODUCT_ID = 1; // Ajustar a ID real de "STRESS BURGER" - Stock: 100

export function getMenu() {
  const res = http.get(`${BASE_URL}/products`, {
    headers: { 'x-tenant-id': TENANT_ID },
  });
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
  });
  menuSuccessRate.add(success);
  sleep(1);
}

export function submitCheckout() {
  const payload = JSON.stringify({
    customer_name: 'Tester VU',
    customer_phone: '1122334455',
    order_type: 'pickup',
    store_id: TEST_STORE_ID,
    items: [
      {
        product_id: TEST_PRODUCT_ID,
        product_name: 'STRESS BURGER',
        product_price: 5000,
        quantity: 1, // Cada pedido pide 1 unidad
        subtotal: 5000,
      }
    ],
    total: 5000,
  });

  const res = http.post(`${BASE_URL}/orders`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT_ID,
    },
  });

  const success = check(res, {
    'status is 201': (r) => r.status === 201,
  });
  
  if (res.status === 400 && String(res.body).includes('Stock insuficiente')) {
    // Esto es un rechazo normal por falta de stock. No es un error crítico.
    checkoutSuccessRate.add(false);
  } else if (!success) {
    // Si da 500 o responde otra cosa (como un error de bloqueo en PG), es un error grave.
    overstockErrors.add(1);
    console.log(`[Error Crítico de Integridad] VU ${__VU} Falló: HTTP ${res.status}. Body: ${res.body}`);
  } else {
    checkoutSuccessRate.add(true);
  }
}
