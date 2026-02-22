import { query } from '../config/db.js';

// Obtener todos los productos con su categoría
export const getMenu = async (req, res) => {
  try {
    const sql = `
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.price, 
        p.image_url, 
        c.name as category 
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
      ORDER BY p.category_id, p.price ASC
    `;
    
    const result = await query(sql);
    
    // Agrupar por categorías para el Frontend (UX Nivel Dios)
    // Esto transforma la lista plana en un objeto organizado
    const menu = result.rows;

    res.json({
      status: 'success',
      count: menu.length,
      data: menu
    });

  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ status: 'error', message: error.message, detail: error.detail || null, code: error.code || null });
  }
};