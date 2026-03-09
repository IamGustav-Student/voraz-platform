-- 1. Tabla de Influencers (Voraz Squad)
CREATE TABLE IF NOT EXISTS influencers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    social_handle VARCHAR(50) NOT NULL, -- ej: @santimaratea
    image_url TEXT,
    testimonial TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Videos (Recitales y Eventos)
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    youtube_id VARCHAR(20) NOT NULL, -- Solo el ID (ej: dQw4w9WgXcQ)
    thumbnail_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Datos de Prueba (Seeds)
INSERT INTO influencers (name, social_handle, image_url, testimonial) VALUES
('Santi M.', '@santimaratea', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&h=500&fit=crop', 'La Triple Cheese me cambió la vida. Literalmente es otro nivel.'),
('Paulina C.', '@paulinacocina', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&h=500&fit=crop', 'Chicos, la técnica del smash que tienen es impecable. 10/10.'),
('Martín D.', '@coscu', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&h=500&fit=crop', 'Nashe la hamburguesa. Buenardo mal.');

INSERT INTO videos (title, youtube_id, thumbnail_url) VALUES
('Voraz Fest 2025 - Aftermovie Oficial', 'LXb3EKWsInQ', 'https://images.unsplash.com/photo-1470229722913-7ea251b94d58?w=800&q=80'),
('Cómo hacemos la Smash Perfecta', 'p7g8G22hNlY', 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=800&q=80');