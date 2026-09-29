¿Qué es el proyecto?

Hotel Smart NFC es una aplicación web creada para administrar habitaciones de un hotel y controlar el acceso mediante tarjetas NFC.

¿Para qué sirve?

Sirve para registrar habitaciones, asignarlas a huéspedes, generar tarjetas NFC, comprobar si una tarjeta es válida y registrar los accesos permitidos o rechazados.

¿Cómo funciona?

El huésped recibe una tarjeta NFC asociada a una habitación. Cuando la tarjeta se acerca al lector RC522, el Arduino obtiene su código y lo envía al sistema. El sistema comprueba si la tarjeta está activa y, dependiendo del resultado, permite o rechaza el acceso.

¿Cuáles son sus principales funciones?

Permite administrar habitaciones, generar y validar tarjetas NFC, registrar huéspedes, controlar los estados de las habitaciones, guardar un historial de accesos, mostrar estadísticas y conectarse con un Arduino Uno. También incluye un simulador para realizar pruebas sin utilizar el dispositivo físico.

¿Qué tecnologías utiliza?

Utiliza Python y Flask para el servidor, JavaScript, HTML y CSS para la página web, una base de datos para guardar la información, XML para los servicios de las habitaciones y Arduino con un lector RC522 para el sistema NFC.

¿Para qué se utiliza la base de datos?

Se utiliza para guardar información sobre las habitaciones, tarjetas NFC, huéspedes y registros de acceso.

¿Para qué se utiliza Arduino?

Arduino permite leer las tarjetas NFC mediante el lector RC522 y enviar la información al sistema para comprobar si el acceso está permitido.

¿Qué medidas de privacidad se utilizan?

Los datos del proyecto son ficticios y se utilizan únicamente para realizar pruebas. No se deben utilizar datos personales reales sin autorización.

¿Cómo se utilizó la Inteligencia Artificial?

Durante el desarrollo se utilizó Antigravity con los modelos Gemini 3.8 y Claude Opus 4.6 como herramientas de apoyo. Se utilizaron para generar ideas, encontrar errores, ayudar con algunas partes del código, realizar pruebas y apoyar la documentación.

Las sugerencias de la IA fueron revisadas, modificadas y adaptadas al proyecto. El equipo mantiene la responsabilidad de comprender y explicar el código utilizado. La IA fue una herramienta de apoyo y no un sustituto del trabajo del equipo.
