# Usamos Python 3.10 versión ligera
FROM python:3.10-slim

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos las dependencias e instalamos
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos todo el código dentro
COPY . .

# Exponemos el puerto
EXPOSE 8000

# Arrancamos la API con "Hot Reload" (si cambias código, se reinicia sola)
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]