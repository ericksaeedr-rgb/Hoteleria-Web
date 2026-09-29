import random
from datetime import datetime
from flask import Blueprint, render_template, request, jsonify
from .models import db, Habitacion, NFCLog, AccessAttempt

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return render_template('index.html')

# ==========================================
# APIs: HABITACIONES
# ==========================================

@main_bp.route('/api/habitaciones', methods=['GET'])
def get_habitaciones():
    habitaciones = Habitacion.query.order_by(Habitacion.piso, Habitacion.numero).all()
    return jsonify([h.to_dict() for h in habitaciones])

@main_bp.route('/api/habitaciones', methods=['POST'])
def add_habitacion():
    data = request.get_json() or {}
    numero = data.get('numero', '').strip()
    tipo = data.get('tipo', 'Estándar').strip()
    piso = int(data.get('piso', 1))
    precio = float(data.get('precio', 50.0))
    estado = data.get('estado', 'Libre')

    if not numero:
        return jsonify({'error': 'El número de habitación es obligatorio'}), 400

    if Habitacion.query.filter_by(numero=numero).first():
        return jsonify({'error': f'La habitación #{numero} ya existe'}), 400

    if estado not in ['Libre', 'Usada', 'Limpieza', 'Mantenimiento']:
        return jsonify({'error': 'Estado no válido'}), 400

    hab = Habitacion(numero=numero, tipo=tipo, piso=piso, precio=precio, estado=estado)
    db.session.add(hab)
    db.session.commit()
    return jsonify({'message': f'Habitación #{numero} creada exitosamente', 'habitacion': hab.to_dict()}), 201

@main_bp.route('/api/habitaciones/<string:numero>/estado', methods=['PATCH'])
def update_estado(numero):
    data = request.get_json() or {}
    nuevo_estado = data.get('estado')

    estados_validos = ['Libre', 'Usada', 'Limpieza', 'Mantenimiento']
    if nuevo_estado not in estados_validos:
        return jsonify({'error': f'Estado inválido. Opciones: {", ".join(estados_validos)}'}), 400

    habitacion = Habitacion.query.filter_by(numero=str(numero)).first()
    if not habitacion:
        return jsonify({'error': 'Habitación no encontrada'}), 404

    habitacion.estado = nuevo_estado

    # Si pasa a libre, desactivar tarjetas NFC asociadas
    if nuevo_estado == 'Libre':
        logs = NFCLog.query.filter_by(habitacion_numero=str(numero), activo=True).all()
        for log in logs:
            log.activo = False

    db.session.commit()
    return jsonify({
        'message': f'Habitación #{habitacion.numero} actualizada a {nuevo_estado}',
        'habitacion': habitacion.to_dict()
    })

@main_bp.route('/api/habitaciones/<string:numero>', methods=['DELETE'])
def delete_habitacion(numero):
    hab = Habitacion.query.filter_by(numero=str(numero)).first()
    if not hab:
        return jsonify({'error': 'Habitación no encontrada'}), 404

    db.session.delete(hab)
    db.session.commit()
    return jsonify({'message': f'Habitación #{numero} eliminada'})

# ==========================================
# APIs: NFC (EMISIÓN & VALIDACIÓN ARDUINO)
# ==========================================

@main_bp.route('/api/nfc/generar', methods=['POST'])
def generar_nfc():
    """
    Genera tarjeta NFC con formato: NFC-{numero_habitacion}-{aleatorio}
    Asigna huésped, fecha de entrada/salida y cambia el estado de la habitación a 'Usada'.
    """
    data = request.get_json() or {}
    numero = data.get('numero', '').strip()
    huesped = data.get('huesped', '').strip()
    horario_es = data.get('horario_es', '').strip()
    fecha_es = data.get('fecha_es', '').strip()

    if not numero or not huesped:
        return jsonify({'error': 'La habitación y el nombre del huésped son obligatorios'}), 400

    if len(huesped) > 60:
        return jsonify({'error': 'El nombre del huésped no puede exceder 60 caracteres'}), 400

    if len(numero) > 10:
        return jsonify({'error': 'El número de habitación es demasiado largo'}), 400

    habitacion = Habitacion.query.filter_by(numero=str(numero)).first()
    if not habitacion:
        return jsonify({'error': 'La habitación indicada no existe'}), 404

    # Desactivar llaves anteriores de esa habitación
    NFCLog.query.filter_by(habitacion_numero=str(numero), activo=True).update({'activo': False})

    # Formato de código NFC
    random_suffix = f"{random.randint(1000000, 9999999)}"
    codigo_nfc = f"NFC-{numero}-{random_suffix}"

    now = datetime.now()
    if not fecha_es:
        fecha_es = now.strftime('%d/%m/%Y')
    if not horario_es:
        horario_es = f"Check-in: {now.strftime('%H:%M')}"

    nuevo_log = NFCLog(
        codigo=codigo_nfc,
        habitacion_numero=str(numero),
        horario_es=horario_es,
        fecha_es=fecha_es,
        huesped=huesped,
        activo=True
    )
    habitacion.estado = 'Usada'

    db.session.add(nuevo_log)
    db.session.commit()

    return jsonify({
        'message': 'Tarjeta NFC emitida con éxito',
        'nfc': nuevo_log.to_dict()
    }), 201

@main_bp.route('/api/nfc/verificar', methods=['POST', 'GET'])
def verificar_nfc():
    """
    Endpoint para Arduino (GET o POST) o simulador web.
    Permite validar y registrar cada intento de apertura en tiempo real.
    """
    codigo = None
    dispositivo = request.headers.get('User-Agent', 'Arduino/Hardware')

    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        codigo = data.get('codigo')
        if 'dispositivo' in data:
            dispositivo = data.get('dispositivo')
    else:
        codigo = request.args.get('codigo')

    if not codigo:
        return jsonify({'acceso': False, 'error': 'Código NFC no proporcionado'}), 400

    codigo = codigo.strip()

    # Buscar código activo
    log = NFCLog.query.filter_by(codigo=codigo, activo=True).first()

    if not log:
        # Registrar intento fallido
        intento = AccessAttempt(
            codigo=codigo,
            resultado=False,
            mensaje='Tarjeta desconocida o expirada',
            dispositivo=dispositivo
        )
        db.session.add(intento)
        db.session.commit()

        return jsonify({
            'acceso': False,
            'mensaje': 'Acceso DENEGADO. Tarjeta inválida o check-out completado.',
            'codigo': codigo
        }), 403

    # Registro de acceso exitoso
    intento = AccessAttempt(
        codigo=codigo,
        habitacion_numero=log.habitacion_numero,
        huesped=log.huesped,
        resultado=True,
        mensaje='Acceso Autorizado',
        dispositivo=dispositivo
    )
    db.session.add(intento)
    db.session.commit()

    return jsonify({
        'acceso': True,
        'mensaje': f'¡Bienvenido {log.huesped}! Puerta abierta.',
        'habitacion': log.habitacion_numero,
        'huesped': log.huesped,
        'fecha_es': log.fecha_es,
        'horario_es': log.horario_es,
        'codigo': log.codigo
    }), 200

@main_bp.route('/api/nfc/tarjetas', methods=['GET'])
def get_tarjetas_activas():
    tarjetas = NFCLog.query.order_by(NFCLog.id.desc()).limit(30).all()
    return jsonify([t.to_dict() for t in tarjetas])

@main_bp.route('/api/nfc/intentos', methods=['GET'])
def get_intentos():
    intentos = AccessAttempt.query.order_by(AccessAttempt.id.desc()).limit(20).all()
    return jsonify([i.to_dict() for i in intentos])

# ==========================================
# APIs: ESTADÍSTICAS DEL HOTEL
# ==========================================

@main_bp.route('/api/stats', methods=['GET'])
def get_stats():
    habitaciones = Habitacion.query.all()
    total = len(habitaciones)
    libres = sum(1 for h in habitaciones if h.estado == 'Libre')
    usadas = sum(1 for h in habitaciones if h.estado == 'Usada')
    limpieza = sum(1 for h in habitaciones if h.estado == 'Limpieza')
    mantenimiento = sum(1 for h in habitaciones if h.estado == 'Mantenimiento')

    ocupacion = round((usadas / total * 100), 1) if total > 0 else 0
    accesos_hoy = AccessAttempt.query.count()

    return jsonify({
        'total': total,
        'libres': libres,
        'usadas': usadas,
        'limpieza': limpieza,
        'mantenimiento': mantenimiento,
        'ocupacion': ocupacion,
        'accesos_totales': accesos_hoy
    })

# ==========================================
# APIs: PUERTO SERIAL ARDUINO UNO
# ==========================================

from flask import current_app
from .serial_reader import arduino_reader

@main_bp.route('/api/arduino/ports', methods=['GET'])
def get_arduino_ports():
    ports = arduino_reader.list_available_ports()
    return jsonify({
        'ports': ports,
        'connected': arduino_reader.is_running,
        'current_port': arduino_reader.port,
        'status': arduino_reader.last_status
    })

@main_bp.route('/api/arduino/connect', methods=['POST'])
def connect_arduino():
    data = request.get_json() or {}
    port = data.get('port')
    if not port:
        return jsonify({'error': 'Puerto COM no especificado'}), 400

    app = current_app._get_current_object()
    success, msg = arduino_reader.connect(port, app)
    if success:
        return jsonify({'message': msg, 'connected': True, 'port': port})
    else:
        return jsonify({'error': msg, 'connected': False}), 500

@main_bp.route('/api/arduino/disconnect', methods=['POST'])
def disconnect_arduino():
    arduino_reader.disconnect()
    return jsonify({'message': 'Arduino desconectado', 'connected': False})

@main_bp.route('/api/arduino/live-status', methods=['GET'])
def get_arduino_live_status():
    return jsonify({
        'connected': arduino_reader.is_running,
        'port': arduino_reader.port,
        'status': arduino_reader.last_status,
        'last_card': arduino_reader.last_card
    })

