-- Limpieza de Catálogo Voraz
DELETE FROM products WHERE store_id = 1;
DELETE FROM categories WHERE store_id = 1;

-- Inserción de Categorías
INSERT INTO categories (id, name, slug, store_id) VALUES 
(100, '🍔 Burgers', 'burgers', 1),
(101, '🍕 Pizzas', 'pizzas', 1),
(102, '🍟 Entradas', 'entradas', 1),
(103, '🥤 Bebidas', 'bebidas', 1),
(104, '🍰 Postres', 'postres', 1);

-- Inserción de Productos
INSERT INTO products (name, description, price, category_id, image_url, badge, store_id) VALUES
('Voraz Deluxe', 'Doble carne, cuádruple cheddar, bacon crocante, cebolla caramelizada y salsa Voraz.', 12500, 100, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', 'PREMIUM', 1),
('Smash Classic', 'Doble smash, doble cheddar, cebolla picada, pickles y mostaza.', 9800, 100, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80', 'MÁS VENDIDO', 1),
('Margherita Premium', 'Salsa de tomate casera, mozzarella fior di latte, albahaca fresca y AOVE.', 14000, 101, 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad50?w=800&q=80', 'RECOMENDADO', 1),
('Pepperoni Blast', 'Mozzarella, pepperoni americano picante y un toque de miel picante.', 15500, 101, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80', 'NUEVO', 1),
('Papas Trufadas', 'Papas triple cocción con aceite de trufa blanca, parmesano y perejil.', 7800, 102, 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=800&q=80', 'GOURMET', 1),
('Bastones de Mozzarella', '6 bastones artesanales con dip de pomodoro italiano.', 6500, 102, 'https://images.unsplash.com/photo-1531492746377-40be9216d79a?w=800&q=80', NULL, 1),
('Cerveza Artesanal IPA', 'Ipa de la casa, 500ml. Notas cítricas y amargor equilibrado.', 4200, 103, 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80', 'CRAFT', 1),
('Limonada con Menta', 'Limones frescos, menta, jengibre y almíbar natural. 500ml.', 3500, 103, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80', 'REFRESCANTE', 1),
('Volcán de Chocolate', 'Corazón fundido de chocolate belga con bocha de crema americana.', 6800, 104, 'https://images.unsplash.com/photo-1624353365286-3f8d62ffff51?w=800&q=80', 'SINFONÍA', 1),
('Cheesecake New York', 'Clásica receta NY con coulis de frutos rojos del bosque.', 7200, 104, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&q=80', 'PREMIUM', 1);
