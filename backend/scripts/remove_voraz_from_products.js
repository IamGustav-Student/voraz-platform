import pg from 'pg';

const pool = new pg.Pool({
  user: 'voraz_admin',
  password: 'voraz_password_secure',
  host: 'localhost',
  port: 5433,
  database: 'voraz_db',
});

const cleanText = (text) => {
    if (!text) return text;
    // 1. Eliminar "Voraz" de forma insensible a mayúsculas, manejando espacios
    // Caso "Voraz Burger" -> "Burger"
    // Caso "especial Voraz." -> "especial."
    let cleaned = text.replace(/(?:\s*)voraz(?:\s*)/gi, ' ');
    
    // 2. Limpiar espacios dobles generados
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    
    // 3. Limpiar espacios antes de signos de puntuación (ej: "especial ." -> "especial.")
    cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1');
    
    return cleaned.trim();
};

const updateProducts = async () => {
    try {
        console.log('📦 Iniciando limpieza de productos...');
        
        // Obtener productos afectados
        const res = await pool.query("SELECT id, name, description FROM products WHERE name ILIKE '%voraz%' OR description ILIKE '%voraz%'");
        
        if (res.rows.length === 0) {
            console.log('✅ No hay productos que requieran limpieza.');
            return;
        }

        console.log(`📝 Procesando ${res.rows.length} productos...`);

        for (const row of res.rows) {
            const newName = cleanText(row.name);
            const newDesc = cleanText(row.description);

            console.log(`   - ID ${row.id}: [${row.name}] -> [${newName}]`);
            
            await pool.query(
                "UPDATE products SET name = $1, description = $2 WHERE id = $3",
                [newName, newDesc, row.id]
            );
        }

        console.log('\n✨ Limpieza completada con éxito.');
    } catch (error) {
        console.error('❌ Error catastrófico durante la limpieza:', error);
    } finally {
        await pool.end();
    }
};

updateProducts();
