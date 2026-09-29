import threading
import time
import serial
import serial.tools.list_ports

class ArduinoSerialReader:
    def __init__(self, baudrate=9600):
        self.baudrate = baudrate
        self.port = None
        self.serial_conn = None
        self.is_running = False
        self.thread = None
        self.last_card = None
        self.last_status = "Desconectado"
        self.app = None

    def list_available_ports(self):
        """Lista todos los puertos COM disponibles en la máquina."""
        ports = serial.tools.list_ports.comports()
        return [{'port': p.device, 'description': p.description} for p in ports]

    def connect(self, port_name, app):
        """Inicia conexión con el puerto serie seleccionado."""
        self.app = app
        if self.is_running:
            self.disconnect()

        try:
            self.serial_conn = serial.Serial(port_name, self.baudrate, timeout=1)
            self.port = port_name
            self.is_running = True
            self.last_status = f"Conectado a {port_name}"

            # Iniciar hilo de lectura continuo en background
            self.thread = threading.Thread(target=self._read_loop, daemon=True)
            self.thread.start()
            return True, f"Conexión exitosa a {port_name}"
        except Exception as e:
            self.last_status = f"Error: {str(e)}"
            return False, str(e)

    def disconnect(self):
        """Cierra la conexión serial."""
        self.is_running = False
        if self.serial_conn and self.serial_conn.is_open:
            try:
                self.serial_conn.close()
            except Exception:
                pass
        self.serial_conn = None
        self.last_status = "Desconectado"
        return True

    def _read_loop(self):
        """Hilo de fondo para escuchar lo que Arduino envía por serial."""
        from .models import db, NFCLog, AccessAttempt

        while self.is_running and self.serial_conn and self.serial_conn.is_open:
            try:
                if self.serial_conn.in_waiting > 0:
                    raw_line = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                    if raw_line:
                        # Buscamos si la línea contiene un código NFC
                        # Formato enviado por Arduino: "NFC-101-1234567" o "CARD:NFC-101-1234567"
                        codigo = raw_line
                        if ':' in codigo:
                            codigo = codigo.split(':')[-1].strip()

                        if codigo.startswith('NFC-'):
                            self._process_nfc_card(codigo)
                time.sleep(0.05)
            except Exception as e:
                self.last_status = f"Error en lectura: {str(e)}"
                break

    def _process_nfc_card(self, codigo):
        """Valida la tarjeta y le responde a Arduino por el puerto Serial (OK o DENIED)."""
        if not self.app:
            return

        from .models import db, NFCLog, AccessAttempt

        with self.app.app_context():
            log = NFCLog.query.filter_by(codigo=codigo, activo=True).first()

            if log:
                # Acceso Autorizado
                intento = AccessAttempt(
                    codigo=codigo,
                    habitacion_numero=log.habitacion_numero,
                    huesped=log.huesped,
                    resultado=True,
                    mensaje='Acceso Autorizado por Arduino USB',
                    dispositivo=f'Arduino Uno ({self.port})'
                )
                db.session.add(intento)
                db.session.commit()

                self.last_card = {
                    'codigo': codigo,
                    'acceso': True,
                    'huesped': log.huesped,
                    'habitacion': log.habitacion_numero,
                    'hora': time.strftime('%H:%M:%S')
                }

                # Responder a Arduino para que encienda LED verde / relay
                self.send_to_arduino(f"OK:{log.habitacion_numero}\n")
            else:
                # Acceso Denegado
                intento = AccessAttempt(
                    codigo=codigo,
                    resultado=False,
                    mensaje='Tarjeta no reconocida o inactiva',
                    dispositivo=f'Arduino Uno ({self.port})'
                )
                db.session.add(intento)
                db.session.commit()

                self.last_card = {
                    'codigo': codigo,
                    'acceso': False,
                    'huesped': 'Desconocido',
                    'habitacion': 'N/A',
                    'hora': time.strftime('%H:%M:%S')
                }

                # Responder a Arduino para que encienda LED rojo / zumbador
                self.send_to_arduino("DENIED\n")

    def send_to_arduino(self, message):
        """Envía comandos a Arduino vía Serial."""
        try:
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.write(message.encode('utf-8'))
        except Exception as e:
            print(f"Error enviando comando a Arduino: {e}")

# Instancia global del lector serial
arduino_reader = ArduinoSerialReader()
