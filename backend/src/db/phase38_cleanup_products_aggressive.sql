-- ============================================================
-- FASE 38: GastroRed — Hard Reset de Catálogo (Store 1)
-- ============================================================
-- Se limpia totalmente el catálogo del comercio base (ID 1)
-- y se re-inserta una semilla perfecta de 2 productos por sección.

DO $$
BEGIN
    -- 1. Limpieza total de Store 1
    DELETE FROM products WHERE store_id = 1;
    DELETE FROM categories WHERE store_id = 1;

    -- 2. Insertar Categorías Maestras
    INSERT INTO categories (id, name, slug, store_id) VALUES
    (1001, 'Smash Burgers', 'smash-1', 1),
    (1002, 'Clásicas',      'clasicas-1', 1),
    (1003, 'Crispy',        'crispy-1',   1),
    (1004, 'Veggie',        'veggie-1',   1),
    (1005, 'Entradas',      'entradas-1', 1),
    (1006, 'Bebidas',       'bebidas-1',  1),
    (1007, 'Postres',       'postres-1',  1)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;

    -- Ajustar el serial para no chocar con los IDs manuales
    PERFORM setval('categories_id_seq', (SELECT MAX(id) FROM categories));

    -- 3. Insertar Productos Maestros (2 por categoría)
    INSERT INTO products (name, description, price, category_id, image_url, badge, store_id) VALUES
    -- SMASH
    ('Burger (Triple)', 'Triple medallón smash, triple cheddar fundido, panceta ahumada, pickles y salsa especial. Con papas.', 24200, 1001, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80', 'ÍCONO', 1),
    ('Cheeseburger Doble', 'Doble medallón smash, doble cheddar americano, cebolla, pickles y mostaza. Con papas fritas.', 19000, 1001, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', 'CLÁSICO', 1),
    -- CLÁSICAS
    ('Royal', 'Carne a la parrilla, lechuga, tomate, cebolla y mayo. Con papas.', 20300, 1002, 'https://images.unsplash.com/photo-1571091655789-405eb7a3a3a8?w=800&q=80', NULL, 1),
    ('Classic', 'Doble carne, queso, lechuga, tomate y ketchup. Sin complicaciones. Con papas.', 20300, 1002, 'https://images.unsplash.com/photo-1549782337-b170f7b9a073?w=800&q=80', NULL, 1),
    -- CRISPY
    ('Crispy Chicken', 'Pechuga entera rebozada en panko crocante, lechuga y mayo de lima. Con papas.', 14800, 1003, 'https://images.unsplash.com/photo-1615557960916-5f4791effe9d?w=800&q=80', NULL, 1),
    ('Spicy Crispy Chicken', 'Como el crispy pero con salsa buffalo y jalapeños. Con papas.', 15800, 1003, 'https://images.unsplash.com/photo-1562967960-f0d23814849d?w=800&q=80', 'PICANTE', 1),
    -- VEGGIE
    ('Veggie Classic', 'Medallón de porotos y champiñones, queso suizo, lechuga, tomate y alioli. Con papas.', 15800, 1004, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80', 'VEGGIE', 1),
    ('Veggie Mush', 'Medallón de legumbres, champiñones salteados, queso, tomate y alioli. Con papas.', 16800, 1004, 'https://images.unsplash.com/photo-1520072959219-c595dc3f3a2a?w=800&q=80', 'NUEVO', 1),
    -- ENTRADOS
    ('Papas con Cheddar y Panceta', 'Papas fritas bañadas en salsa de cheddar fundido y panceta ahumada crujiente.', 14500, 1005, 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80', 'BEST SELLER', 1),
    ('Aros de Cebolla (12)', 'Rebozados en masa de cerveza artesanal. Crocantes y dorados. Con dip.', 12000, 1005, 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80', NULL, 1),
    -- BEBIDAS
    ('Coca Cola 500ml', 'La clásica bien helada. También disponible Zero.', 4500, 1006, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80', NULL, 1),
    ('Agua Mineral 500ml', 'Sin gas o con gas.', 2800, 1006, 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80', NULL, 1),
    -- POSTRES
    ('Chocotorta en Vaso', 'La clásica argentina con extra dulce de leche Havanna.', 7500, 1007, 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80', 'DULCE', 1),
    ('Cheesecake de Frutos Rojos', 'Base crocante de galletitas, crema suave de queso y coulis de frutos rojos.', 8200, 1007, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&q=80', 'PREMIUM', 1);

END $$;
