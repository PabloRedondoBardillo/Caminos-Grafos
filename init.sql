-- init.sql

-- 1. CREAR TABLAS
CREATE TABLE IF NOT EXISTS ciudades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    latitud FLOAT,
    longitud FLOAT
);

CREATE TABLE IF NOT EXISTS conexiones (
    id SERIAL PRIMARY KEY,
    origen_id INTEGER REFERENCES ciudades(id),
    destino_id INTEGER REFERENCES ciudades(id),
    UNIQUE(origen_id, destino_id)
);

-- 2. INSERTAR CIUDADES (Les forzamos el ID para relacionarlas fácil)
INSERT INTO ciudades (id, nombre, latitud, longitud) VALUES
(1, 'Madrid', 40.4168, -3.7038),
(2, 'New-York', 40.7128, -74.0060),
(3, 'Tokyo', 35.6895, 139.6917),
(4, 'London', 51.5074, -0.1278),
(5, 'Paris', 48.8566, 2.3522),
(6, 'Buenos-Aires', -34.6037, -58.3816),
(7, 'Sydney', -33.8688, 151.2093),
(8, 'Cairo', 30.0444, 31.2357),
(9, 'Mexico-City', 19.4326, -99.1332),
(10, 'Beijing', 39.9042, 116.4074),
(11, 'Berlin', 52.5200, 13.4050),
(12, 'Rome', 41.9028, 12.4964),
(13, 'Amsterdam', 52.3676, 4.9041),
(14, 'Brussels', 50.8503, 4.3517),
(15, 'Vienna', 48.2082, 16.3738),
(16, 'Lisbon', 38.7223, -9.1393),
(17, 'Dublin', 53.3498, -6.2603),
(18, 'Athens', 37.9838, 23.7275),
(19, 'Warsaw', 52.2297, 21.0122),
(20, 'Stockholm', 59.3293, 18.0686),
(21, 'Prague', 50.0755, 14.4378),
(22, 'Zurich', 47.3769, 8.5417),
(23, 'Moscow', 55.7558, 37.6173),
(24, 'Los Angeles', 34.0522, -118.2437),
(25, 'Chicago', 41.8781, -87.6298),
(26, 'Toronto', 43.6510, -79.3470),
(27, 'Miami', 25.7617, -80.1918),
(28, 'San-Francisco', 37.7749, -122.4194),
(29, 'Washington-DC', 38.9072, -77.0369),
(30, 'Seattle', 47.6062, -122.3321),
(31, 'Boston', 42.3601, -71.0589),
(32, 'Montreal', 45.5017, -73.5673),
(33, 'Vancouver', 49.2827, -123.1207),
(34, 'Santiago', -33.4489, -70.6693),
(35, 'Lima', -12.0464, -77.0428),
(36, 'Bogota', 4.7110, -74.0721),
(37, 'Rio-de-Janeiro', -22.9068, -43.1729),
(38, 'Sao-Paulo', -23.5505, -46.6333),
(39, 'Caracas', 10.4806, -66.9036),
(40, 'Seoul', 37.5665, 126.9780),
(41, 'Shanghai', 31.2304, 121.4737),
(42, 'Hong-Kong', 22.3193, 114.1694),
(43, 'Bangkok', 13.7563, 100.5018),
(44, 'Mumbai', 19.0760, 72.8777),
(45, 'New-Delhi', 28.6139, 77.2090),
(46, 'Jakarta', -6.2088, 106.8456),
(47, 'Singapore', 1.3521, 103.8198),
(48, 'Kuala-Lumpur', 3.1390, 101.6869),
(49, 'Taipei', 25.0330, 121.5654),
(50, 'Manila', 14.5995, 120.9842),
(51, 'Dubai', 25.2048, 55.2708),
(52, 'Johannesburg', -26.2041, 28.0473),
(53, 'Lagos', 6.5244, 3.3792),
(54, 'Nairobi', -1.2921, 36.8219),
(55, 'Casablanca', 33.5731, -7.5898),
(56, 'Istanbul', 41.0082, 28.9784),
(57, 'Tel-Aviv', 32.0853, 34.7818),
(58, 'Melbourne', -37.8136, 144.9631),
(59, 'Auckland', -36.8485, 174.7633),
(60, 'Perth', -31.9505, 115.8605);

-- 3. INSERTAR RELACIONES (Usando los IDs de arriba)
INSERT INTO conexiones (origen_id, destino_id) VALUES 
(1, 5), (1, 6), (1, 4), (2, 4), (2, 3), (2, 9), (3, 7), (3, 10), (1, 11), (1, 12), (1, 16), (4, 17), (4, 13), (4, 11), (5, 14), (5, 22), (5, 12), (11, 21), (11, 19), (11, 23), (12, 18), (12, 56), (15, 21), (15, 20), (2, 25), (2, 27), (2, 29), (2, 26), 
(24, 2), (24, 28), (24, 30), (24, 3), (27, 36), (27, 39), (27, 6), (26, 32), (26, 33), (6, 34), (6, 38), (38, 37), (38, 35), (36, 35), (36, 9), (3, 40), (3, 41), (3, 49), (10, 41), (10, 23), (41, 42), (42, 47), (42, 50), (47, 48), (47, 46), (47, 7),
(44, 45), (44, 51), (51, 4), (51, 2), (51, 8), (8, 56), (8, 52), (52, 53), (52, 54), (56, 11), (56, 23), (7, 59), (7, 58), (60, 47);

-- 4. ARREGLAR EL CONTADOR DE IDs (IMPORTANTE)
SELECT setval('ciudades_id_seq', (SELECT MAX(id) FROM ciudades));