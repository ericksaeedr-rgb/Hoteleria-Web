from app import create_app
from app.models import db, Habitacion

app = create_app()

with app.app_context():
    habitaciones_muestra = [
        {'numero': '101', 'tipo': 'Estándar', 'piso': 1, 'precio': 45.0, 'estado': 'Libre'},
        {'numero': '102', 'tipo': 'Estándar', 'piso': 1, 'precio': 45.0, 'estado': 'Libre'},
        {'numero': '103', 'tipo': 'Doble', 'piso': 1, 'precio': 65.0, 'estado': 'Limpieza'},
        {'numero': '201', 'tipo': 'Doble', 'piso': 2, 'precio': 70.0, 'estado': 'Libre'},
        {'numero': '202', 'tipo': 'Suite', 'piso': 2, 'precio': 120.0, 'estado': 'Libre'},
        {'numero': '301', 'tipo': 'Presidencial', 'piso': 3, 'precio': 250.0, 'estado': 'Libre'}
    ]

    for data in habitaciones_muestra:
        if not Habitacion.query.filter_by(numero=data['numero']).first():
            db.session.add(Habitacion(**data))

    db.session.commit()
    print("Base de datos inicializada con habitaciones de muestra.")
