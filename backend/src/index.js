import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { query } from './config/db.js';

// IMPORTAR RUTAS
import productsRoutes from './routes/products.routes.js';
import communityRoutes from './routes/community.routes.js';
import storesRoutes from './routes/stores.routes.js';
import newsRoutes from './routes/news.routes.js'; // <--- NUEVO

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares ---
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// --- Rutas Base ---
app.get('/', (req, res) => {
  res.json({ message: '🍔 API de Voraz funcionando correctamente' });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await query('SELECT NOW()');
    res.json({ status: 'success', time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Rutas de la API ---
app.use('/api/products', productsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/news', newsRoutes); // <--- NUEVA RUTA

// --- Iniciar Servidor ---
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
});