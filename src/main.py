from fastapi import FastAPI

app = FastAPI(title="Caminos")

@app.get("/")
async def root():
    return "Aplicación en pleno funcionamiento"


@app.get("/hola")
async def startup_event():
    return "La aplicación ha iniciado correctamente"
