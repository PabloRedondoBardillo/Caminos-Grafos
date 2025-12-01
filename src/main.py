import os
import psycopg2
import math
from fastapi import FastAPI, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()
app.mount("/static", StaticFiles(directory="src/static"), name="static")
templates = Jinja2Templates(directory="src/templates")

# --- 1. TU FÓRMULA MATEMÁTICA ---
def calcular_distancia(lat1, lon1, lat2, lon2):
    """
    Aquí es donde tú mandas. Por defecto te pongo la fórmula de Haversine
    (distancia real en una esfera), pero puedes cambiarla por lo que quieras.
    """
    # Convertir grados a radianes (necesario para funciones trigonométricas)
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Radio de la Tierra en Kilómetros
    R = 6371.0

    # Diferencias
    dlat = lat2 - lat1
    dlon = lon2 - lon1

    # Fórmula (Haversine)
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distancia = R * c
    
    # Redondeamos a 2 decimales
    return round(distancia, 2)

# --- 2. CONEXIÓN DB ---
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS")
    )

# --- 3. ENDPOINT PRINCIPAL ---
@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # QUERY EXPERTA: JOIN DOBLE
    # Unimos la tabla conexiones con ciudades DOS veces:
    # - Una vez (c1) para sacar datos del Origen
    # - Otra vez (c2) para sacar datos del Destino
    query = """
        SELECT 
            c1.nombre as origen, 
            c1.latitud as lat1, 
            c1.longitud as lon1,
            c2.nombre as destino, 
            c2.latitud as lat2, 
            c2.longitud as lon2
        FROM conexiones con
        JOIN ciudades c1 ON con.origen_id = c1.id
        JOIN ciudades c2 ON con.destino_id = c2.id
        ORDER BY c1.nombre;
    """
    cur.execute(query)
    resultados_raw = cur.fetchall()
    cur.close()
    conn.close()

    # --- PROCESAMIENTO EN PYTHON (BACKEND) ---
    datos_procesados = []
    
    for fila in resultados_raw:
        # Desempaquetamos la fila de la DB
        origen, lat1, lon1, destino, lat2, lon2 = fila
        
        # ¡AQUÍ CALCULAMOS TU FÓRMULA!
        km = calcular_distancia(lat1, lon1, lat2, lon2)
        
        # Guardamos todo en una lista bonita para el HTML
        datos_procesados.append({
            "origen": origen,
            "destino": destino,
            "coords_origen": f"({lat1}, {lon1})",
            "coords_destino": f"({lat2}, {lon2})",
            "distancia_km": km
        })

    return templates.TemplateResponse("index.html", {"request": request, "rutas": datos_procesados})


@app.get("/api/mapa")
def obtener_datos_mapa():
    conn = get_db_connection()
    cur = conn.cursor()
    
    # 1. Obtener todas las ciudades
    cur.execute("SELECT id, nombre, latitud, longitud FROM ciudades")
    ciudades = [{"id": row[0], "nombre": row[1], "lat": row[2], "lon": row[3]} for row in cur.fetchall()]
    
    # 2. Obtener todas las conexiones (pares de coordenadas)
    # Hacemos el JOIN para que el Frontend reciba directamente las coordenadas de inicio y fin
    cur.execute("""
        SELECT c1.latitud, c1.longitud, c2.latitud, c2.longitud
        FROM conexiones con
        JOIN ciudades c1 ON con.origen_id = c1.id
        JOIN ciudades c2 ON con.destino_id = c2.id
    """)
    conexiones = [{"lat1": row[0], "lon1": row[1], "lat2": row[2], "lon2": row[3]} for row in cur.fetchall()]
    
    cur.close()
    conn.close()
    
    return {"ciudades": ciudades, "conexiones": conexiones}



# --- (Opcional) Endpoint para añadir ---
@app.post("/add")
def add_city(request: Request):
    # (Lo he simplificado para centrarnos en el cálculo de distancias)
    return templates.TemplateResponse("index.html", {"request": request, "rutas": [], "mensaje": "Función desactivada en esta demo de distancias"})