from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from .rutas import router
from .database import cerrar_conexion


app = FastAPI()

#Configuracion del proyecto inicial
app.mount("/static", StaticFiles(directory="src/static"), name="static")

app.include_router(router)

@app.on_event("shutdown")
def cerrar():
    cerrar_conexion()
