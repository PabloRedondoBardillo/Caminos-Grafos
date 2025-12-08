from fastapi import APIRouter, Request, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from .database import conseguir_cursor
from .esquemas import mapaRespuesta

router = APIRouter()
templates = Jinja2Templates(directory="src/templates")

#Endpoint principal
@router.get("/", response_class=HTMLResponse)
def home(request: Request):
    
    #Conseguimos un cursosr de una conexion para poder ejecutar la query
    with conseguir_cursor() as cur:
        query = """
            SELECT * FROM vista_detalles_rutas ORDER BY origen
        """
        cur.execute(query)
        resultados_raw = cur.fetchall()

    #Procesamos los datos de la db
    datos_procesados = []
    for fila in resultados_raw:
        ide, origen, lat1, lon1, destino, lat2, lon2, km = fila        
        datos_procesados.append({
            "id": ide,
            "origen": origen,
            "destino": destino,
            "coords_origen": f"({lat1}, {lon1})",
            "coords_destino": f"({lat2}, {lon2})",
            "distancia_km": km
        })

    return templates.TemplateResponse("index.html", {"request": request, "rutas": datos_procesados})


#Endpoint para pasar toda la base de datos
@router.get("/api/mapa", response_model=mapaRespuesta)
def obtener_datos_mapa():
    try:
        with conseguir_cursor() as cur:
            #Ciudades
            cur.execute("SELECT id, nombre, latitud, longitud FROM ciudades")
            ciudades = [{"id": row[0], "nombre": row[1], "lat": row[2], "lon": row[3]} for row in cur.fetchall()]
    
            #Conxeiones
            query = """
                SELECT conexion_id, lat_origen, lon_origen, lat_destino, lon_destino, distancia_km
                FROM vista_detalles_rutas
            """
            cur.execute(query)
            conexiones = [{"id":row[0], "lat1": row[1], "lon1": row[2], "lat2": row[3], "lon2": row[4], "coste": row[5]} for row in cur.fetchall()]

            return {"ciudades": ciudades, "conexiones": conexiones}
    except Exception as error:
        print(f"Error en la API:{error}")
        raise HTTPException(status_code=500, detail="Error interno al procesar los datos de la construccion del mapa")