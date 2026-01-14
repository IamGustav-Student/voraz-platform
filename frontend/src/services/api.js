// Si existe una variable de entorno, úsala. Si no, usa localhost.
const API_URL = 'https://voraz-platform-production-aa5d.up.railway.app/api';

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

// --- NOTICIAS (NUEVO) ---
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