import os
import sys
from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    env = os.environ.get('FLASK_ENV', 'production')

    print(f"==================================================")
    print(f"🏨 Hotel Smart NFC - Iniciando servidor...")
    print(f"Modo: {env.upper()} | Escuchando en http://{host}:{port}")
    print(f"==================================================")

    if env == 'production':
        # Servidor WSGI de nivel de producción multi-hilo (ideal para Windows y multiplataforma)
        from waitress import serve
        serve(app, host=host, port=port, threads=8)
    else:
        app.run(debug=True, host=host, port=port)
