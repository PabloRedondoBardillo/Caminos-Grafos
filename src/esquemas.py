from pydantic import BaseModel
from typing import List

#Modelos de la base de datos
class ciudad(BaseModel):
    id: int
    nombre: str
    lat: float
    lon: float

class conexion(BaseModel):
    id: int
    lat1: float
    lon1: float
    lat2: float
    lon2: float
    coste: float

class mapaRespuesta(BaseModel):
    ciudades: List[ciudad]
    conexiones: List[conexion]