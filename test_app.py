import unittest
from app import create_app
from app.models import db, Habitacion, NFCLog, AccessAttempt
from app.config import Config

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

class HotelNfcTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            h1 = Habitacion(numero='101', tipo='Estándar', piso=1, precio=50.0, estado='Libre')
            db.session.add(h1)
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_get_habitaciones(self):
        response = self.client.get('/api/habitaciones')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['numero'], '101')

    def test_generar_y_verificar_nfc(self):
        # 1. Generar NFC
        res_gen = self.client.post('/api/nfc/generar', json={
            'numero': '101',
            'huesped': 'Carlos Mendez',
            'fecha_es': '01/10/2026 - 05/10/2026',
            'horario_es': '15:00 - 11:00'
        })
        self.assertEqual(res_gen.status_code, 201)
        gen_data = res_gen.get_json()
        codigo = gen_data['nfc']['codigo']
        self.assertTrue(codigo.startswith('NFC-101-'))

        # Comprobar que habitación pasó a Usada
        res_hab = self.client.get('/api/habitaciones')
        self.assertEqual(res_hab.get_json()[0]['estado'], 'Usada')

        # 2. Verificar NFC (Simulador Arduino)
        res_ver = self.client.post('/api/nfc/verificar', json={'codigo': codigo})
        self.assertEqual(res_ver.status_code, 200)
        ver_data = res_ver.get_json()
        self.assertTrue(ver_data['acceso'])
        self.assertEqual(ver_data['habitacion'], '101')
        self.assertEqual(ver_data['huesped'], 'Carlos Mendez')

    def test_verificar_nfc_invalido(self):
        res = self.client.post('/api/nfc/verificar', json={'codigo': 'NFC-999-0000000'})
        self.assertEqual(res.status_code, 403)
        data = res.get_json()
        self.assertFalse(data['acceso'])

if __name__ == '__main__':
    unittest.main()
