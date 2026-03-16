const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();

const getStoreDomain = () => {
  if (typeof window !== 'undefined') return window.location.hostname;
  return import.meta.env.VITE_STORE_DOMAIN || 'localhost';
};

// Headers base con store-domain para todas las requests (multi-tenant)
const baseHeaders = {
  'Content-Type': 'application/json',
  'x-store-domain': getStoreDomain(),
};

export const getMenu = async () => {
  try {
    const response = await fetch(`${API_URL}/products`, { headers: baseHeaders });
    if (!response.ok) throw new Error('Error server');
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching menu:', error);
    return [];
  }
};

export const getPromos = async () => {
  try {
    const response = await fetch(`${API_URL}/promos`, { headers: baseHeaders });
    if (!response.ok) throw new Error('Error server');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching promos:', error);
    return [];
  }
};

export const getVideos = async () => {
  try {
    const response = await fetch(`${API_URL}/community/videos`, { headers: baseHeaders });
    if (!response.ok) throw new Error('Error server');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
};

export const getStores = async () => {
  try {
    const response = await fetch(`${API_URL}/stores`, { headers: baseHeaders });
    if (!response.ok) throw new Error('Error server');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching stores:', error);
    return [];
  }
};

export const getNews = async () => {
  try {
    const response = await fetch(`${API_URL}/news`, { headers: baseHeaders });
    if (!response.ok) throw new Error('Error server');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
};

export const createOrder = async (payload, token) => {
  try {
    const headers = { ...baseHeaders };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_URL}/orders`, { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Error al crear pedido');
    return data.data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

export const getOrderById = async (id) => {
  try {
    const response = await fetch(`${API_URL}/orders/${id}`, { headers: baseHeaders });
    if (!response.ok) throw new Error('Error server');
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
};

export const createPaymentPreference = async (payload, token) => {
  try {
    const headers = { ...baseHeaders };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_URL}/payments/preference`, { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Error al crear preferencia');
    return data.data;
  } catch (error) {
    console.error('Error creating payment preference:', error);
    throw error;
  }
};

export const registerUser = async (payload) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al registrarse');
  return data.data;
};

export const loginUser = async (payload) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al iniciar sesión');
  return data.data;
};

export const getMe = async (token) => {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { ...baseHeaders, Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || null;
  } catch {
    return null;
  }
};

export const getPointsHistory = async (userId, token) => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/points`, {
      headers: { ...baseHeaders, Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || null;
  } catch {
    return null;
  }
};

export const getUserOrders = async (userId, token) => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/orders`, {
      headers: { ...baseHeaders, Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || [];
  } catch {
    return [];
  }
};

// ── ADMIN API ──────────────────────────────────────────────────────────────
const adminHeaders = (token) => ({ ...baseHeaders, Authorization: `Bearer ${token}` });

export const adminFetch = async (path, token, options = {}) => {
  const res = await fetch(`${API_URL}/admin${path}`, {
    ...options,
    headers: { ...adminHeaders(token), ...(options.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error en petición admin');
  return data.data ?? data;
};

export const getTenantSettings = async () => {
  try {
    const response = await fetch(`${API_URL}/settings`, { headers: baseHeaders });
    if (!response.ok) return { cash_on_delivery: true };
    const data = await response.json();
    return data.data || { cash_on_delivery: true };
  } catch {
    return { cash_on_delivery: true };
  }
};

export const getMPConfig = async () => {
  try {
    const response = await fetch(`${API_URL}/payments/public-key`, { headers: baseHeaders });
    if (!response.ok) return { configured: false };
    const data = await response.json();
    // demo_mode: true significa que NO hay credenciales configuradas
    return { configured: !data.data?.demo_mode, sandbox: data.data?.sandbox };
  } catch {
    return { configured: false };
  }
};


export const validateCoupon = async (payload) => {
  try {
    const response = await fetch(`${API_URL}/coupons/validate`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Cupón inválido');
    return data.data;
  } catch (error) {
    throw error;
  }
};

// ── RECUPERACIÓN DE CONTRASEÑA ─────────────────────────────────────────────

export const forgotPassword = async (email) => {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al enviar solicitud');
  return data;
};

export const resetPassword = async (token, new_password) => {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify({ token, new_password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al restablecer contraseña');
  return data;
};