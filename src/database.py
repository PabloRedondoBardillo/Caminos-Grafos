import os
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager

#Creamos una piscina de conexiones
try:
    db_pool = pool.SimpleConnectionPool(
        1,
        20,
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS")
    )
except psycopg2.Error as error:
    print(f"Error producido conectando a la base de datos: {error}")
    db_pool = None

#Conseguir abrir, cerrar, y devolver la conexion al pool automaticamente
@contextmanager
def conseguir_cursor():
    con = db_pool.getconn()
    try:
        cur = con.cursor()
        yield cur
        con.commit()
    except Exception as error:
        con.rollback()
        raise error
    finally:
        cur.close()
        db_pool.putconn(con)

#Cerramos todas las conexiones con la base de datos
def cerrar_conexion():
    if db_pool:
        db_pool.closeall()
        print("Conexiones a las dbs cerradas")