from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Habitacion(db.Model):
    __tablename__ = 'Habitacion'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    numero = db.Column(db.String(10), unique=True, nullable=False)
    tipo = db.Column(db.String(50), default='Estándar', nullable=False) # Simple, Doble, Suite, etc.
    piso = db.Column(db.Integer, default=1, nullable=False)
    precio = db.Column(db.Float, default=50.0, nullable=False)
    estado = db.Column(db.Enum('Libre', 'Usada', 'Limpieza', 'Mantenimiento'), nullable=False, default='Libre')

    def to_dict(self):
        return {
            'id': self.id,
            'numero': self.numero,
            'tipo': self.tipo,
            'piso': self.piso,
            'precio': self.precio,
            'estado': self.estado
        }

class NFCLog(db.Model):
    __tablename__ = 'NFCLog'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    codigo = db.Column(db.String(50), nullable=False, index=True)
    horario_es = db.Column(db.String(50), nullable=False)
    fecha_es = db.Column(db.String(50), nullable=False)
    huesped = db.Column(db.String(100), nullable=False)
    habitacion_numero = db.Column(db.String(10), nullable=True)
    activo = db.Column(db.Boolean, default=True, nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'codigo': self.codigo,
            'horario_es': self.horario_es,
            'fecha_es': self.fecha_es,
            'huesped': self.huesped,
            'habitacion_numero': self.habitacion_numero,
            'activo': self.activo,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S') if self.timestamp else ''
        }

class AccessAttempt(db.Model):
    __tablename__ = 'AccessAttempt'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    codigo = db.Column(db.String(50), nullable=False)
    habitacion_numero = db.Column(db.String(10), nullable=True)
    huesped = db.Column(db.String(100), nullable=True)
    resultado = db.Column(db.Boolean, nullable=False) # True = Exitoso, False = Denegado
    mensaje = db.Column(db.String(255), nullable=False)
    dispositivo = db.Column(db.String(50), default='Lector Arduino', nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'codigo': self.codigo,
            'habitacion_numero': self.habitacion_numero,
            'huesped': self.huesped,
            'resultado': self.resultado,
            'mensaje': self.mensaje,
            'dispositivo': self.dispositivo,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S') if self.timestamp else ''
        }
