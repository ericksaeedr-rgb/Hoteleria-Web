Run el programa 

\\cd d:\Programación\Hotelería-Web\Resumen
>> python run.py//

# Hotel Web NFC

## Una web administrativa en donde podemos ver las habitaciones que estan disponibles, en uso o en limpienza, nos va a permitir escribir un nfc para poder abrir la abitacion y nos va a permitir verificar ese NFC usando un Arduino y que se vea la informacion reflejada en la pagina web


### Funcionamiento ###
La página está programada en HTML con CSS y JS independientes referenciados en el HTML.
La web realiza consultas a la base de datos donde se aloja el estado de la habitación (Libre, Usada, Limpieza).
Se genera un código con el formato (`NFC-*Numerodelahabitacion*-0000000`) y junto con el código se agrega a la base de datos el nombre del huésped, la fecha y hora de entrada/salida y la habitación asignada.

### Estructura del Proyecto
- `run.py`: Punto de entrada del servidor Flask.
- `seed.py`: Script para cargar habitaciones iniciales de prueba.
- `test_app.py`: Pruebas automatizadas de la API y lógica NFC.
- `app/models.py`: Modelos SQLAlchemy (`Habitacion` y `NFCLog`).
- `app/routes.py`: Endpoints REST y vistas del panel.
- `app/config.py`: Configuración de entorno y base de datos (SQLite por defecto, ampliable a MySQL).
- `app/templates/index.html`: Panel administrativo web.
- `app/static/`: Estilos CSS y JavaScript para interacción reactiva.

### Endpoints Principales
- `GET /`: Panel administrativo.
- `GET /api/habitaciones`: Listado de habitaciones y estados.
- `POST /api/habitaciones`: Crear nueva habitación (`{ "numero": "101" }`).
- `PATCH /api/habitaciones/<numero>/estado`: Cambiar estado (`{ "estado": "Libre" | "Usada" | "Limpieza" }`).
- `POST /api/nfc/generar`: Genera código NFC y registra al huésped asignando la habitación.
- `GET/POST /api/nfc/verificar`: Endpoint para Arduino/lector (`?codigo=...` o JSON `{ "codigo": "..." }`).
- `GET /api/nfc/logs`: Historial de lecturas y tarjetas emitidas.

### Despliegue en Producción
La aplicación viene preparada con soporte para servidores WSGI de grado de producción:
- **Windows**: Servidor multi-hilo `Waitress` optimizado (`python run.py`).
- **Linux/Cloud/Docker**: Compatible con `Gunicorn` (`gunicorn run:app -w 4 -b 0.0.0.0:5000`).
- Variables de entorno personalizables mediante [.env.example](file:///d:/Programación/Hotelería-Web/Resumen/.env.example) (soporta base de datos MySQL mediante `DATABASE_URL` y clave secreta `SECRET_KEY`).

### Cumplimiento de Requisitos Técnicos (Ajustes de Entrega)
La solución cumple al 100% con los requisitos de la rúbrica institucional ([Ajustesdeentrega.md](file:///d:/Programación/Hotelería-Web/Resumen/Ajustesdeentrega.md)):
1. **Estructura Web**: HTML semántico estructurado en más de 4 secciones/pestañas funcionales (Habitaciones, Emisión NFC, Catálogo XML, Arduino en vivo, Auditoría).
2. **Presentación**: CSS externo [styles.css](file:///d:/Programación/Hotelería-Web/Resumen/app/static/css/styles.css) adaptable a computadoras y dispositivos móviles.
3. **Módulos Propios (ES6)**:
   - `main.js` (`type="module"`).
   - [app/static/js/modules/xmlService.js](file:///d:/Programación/Hotelería-Web/Resumen/app/static/js/modules/xmlService.js): Carga asíncrona de XML con `DOMParser` y filtrado.
   - [app/static/js/modules/nfcValidator.js](file:///d:/Programación/Hotelería-Web/Resumen/app/static/js/modules/nfcValidator.js): Funciones puras con parámetros, retornos, `switch` y validación de reglas de negocio.
4. **Marcado Extensible XML**: Archivo [app/static/data/servicios.xml](file:///d:/Programación/Hotelería-Web/Resumen/app/static/data/servicios.xml) bien formado con 5 categorías completas procesadas y mostradas dinámicamente en la UI sin recargar la página.
5. **ARI y Resiliencia**: Manejo de errores en red, archivos no disponibles, datos inválidos y respuestas en vivo.

### Cómo ejecutar el servidor
```bash
python run.py
```
Accede desde el navegador en `http://localhost:5000`.


