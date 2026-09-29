import os
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '..', '.env'))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'hotel-nfc-prod-secret-key-change-in-env-98127391')
    
    # Soporta DATABASE_URL (MySQL o SQLite)
    # Ejemplo MySQL: mysql+pymysql://usuario:contraseña@localhost/hotel_nfc_db
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f"sqlite:///{os.path.join(basedir, '..', 'instance', 'hotel.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Optimizaciones de producción para pool de conexiones
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
