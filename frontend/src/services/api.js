const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// --- PRODUCTOS ---
export const getMenu = async () => {
  try {
    const response = await fetch(`${API_URL}/products`);
    if (!response.ok) throw new Error('Error server');
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching menu:', error);
    return [];
  }
};

// --- COMUNIDAD ---
export const getInfluencers = async () => {
  try {
    const response = await fetch(`${API_URL}/community/influencers`);
    if (!response.ok) throw new Error('Error server');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching influencers:', error);
    return [];
  }
};

export const getVideos = async () => {
  try {
    const response = await fetch(`${API_URL}/community/videos`);
    if (!response.ok) throw new Error('Error server');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
};

// --- LOCALES ---
export const getStores = async () => {
  try {
    const response = await fetch(`${API_URL}/stores`);
    if (!response.ok) throw new Error('Error server');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching stores:', error);
    return [];
  }
};

// --- NOTICIAS ---
export const getNews = async () => {
  try {
    const response = await fetch(`${API_URL}/news`);
    if (!response.ok) throw new Error('Error server');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
};

// --- PEDIDOS ---
export const createOrder = async (payload, token) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
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
    const response = await fetch(`${API_URL}/orders/${id}`);
    if (!response.ok) throw new Error('Error server');
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
};

// --- PAGOS ---
export const createPaymentPreference = async (payload, token) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
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

// --- AUTH ---
export const registerUser = async (payload) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al registrarse');
  return data.data;
};

export const loginUser = async (payload) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al iniciar sesión');
  return data.data;
};

export const getMe = async (token) => {
  try {
    const response = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || null;
  } catch {
    return null;
  }
};

// --- USUARIOS ---
export const getPointsHistory = async (userId, token) => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/points`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || null;
  } catch {
    return null;
  }
};

export const getUserOrders = async (userId, token) => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/orders`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || [];
  } catch {
    return [];
  }
};

// --- CUPONES ---
export const validateCoupon = async (payload) => {
  try {
    const response = await fetch(`${API_URL}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Cupón inválido');
    return data.data;
  } catch (error) {
    throw error;
  }
};