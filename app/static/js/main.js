// Importación de Módulos Propios (Requisito 3: Módulos ES6)
import { cargarServiciosXML, filtrarPorCapacidad } from './modules/xmlService.js';
import { validarDatosNFC, formatearRangoFechas, calcularTarifaEstadia } from './modules/nfcValidator.js';

// State Management
let hotelRooms = [];
let serviciosCatalogo = [];

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initModals();
    initForms();
    initArduino();
    initXmlCatalog();
    
    // Initial data fetch
    fetchStats();
    fetchRooms();
    fetchTarjetas();
    fetchIntentos();

    // Auto-refresh interval (polling every 12s for Arduino events)
    setInterval(() => {
        fetchStats();
        fetchTarjetas();
        fetchIntentos();
    }, 12000);

    document.getElementById('btn-quick-refresh').addEventListener('click', () => {
        fetchStats();
        fetchRooms();
        fetchTarjetas();
        fetchIntentos();
        showToast('Datos actualizados en tiempo real', 'success');
    });
});

/* ========================================================
   1. TABS NAVIGATION
   ======================================================== */
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            
            // Set active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Set active pane
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });
}

/* ========================================================
   2. STATS & ROOMS
   ======================================================== */
async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        
        document.getElementById('stat-total').textContent = data.total;
        document.getElementById('stat-libres').textContent = data.libres;
        document.getElementById('stat-usadas').textContent = data.usadas;
        document.getElementById('stat-limpieza').textContent = data.limpieza;
        document.getElementById('stat-ocupacion').textContent = `${data.ocupacion}%`;
    } catch (err) {
        console.error('Error cargando estadísticas:', err);
    }
}

async function fetchRooms() {
    try {
        const res = await fetch('/api/habitaciones');
        hotelRooms = await res.json();
        renderRooms(hotelRooms);
        populateRoomSelect(hotelRooms);
    } catch (err) {
        console.error('Error cargando habitaciones:', err);
    }
}

function renderRooms(rooms) {
    const container = document.getElementById('rooms-container');
    const filter = document.getElementById('filter-estado').value;

    container.innerHTML = '';

    const filtered = filter === 'Todos' 
        ? rooms 
        : rooms.filter(r => r.estado === filter);

    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">
            No se encontraron habitaciones para el filtro seleccionado.
        </div>`;
        return;
    }

    filtered.forEach(room => {
        const card = document.createElement('div');
        card.className = 'room-card-modern';
        card.innerHTML = `
            <div class="room-top">
                <div class="room-badge-num">
                    <span>#</span>${room.numero}
                </div>
                <div class="status-pill ${room.estado}">${room.estado}</div>
            </div>
            <div class="room-info">
                <div class="room-info-row">
                    <span>Tipo:</span>
                    <strong>${room.tipo}</strong>
                </div>
                <div class="room-info-row">
                    <span>Piso:</span>
                    <strong>Nivel ${room.piso}</strong>
                </div>
                <div class="room-info-row">
                    <span>Tarifa:</span>
                    <strong>$${room.precio.toFixed(2)}/noche</strong>
                </div>
            </div>
            <div class="room-actions-bar">
                <select class="room-status-select" onchange="actualizarEstadoHab('${room.numero}', this.value)">
                    <option value="Libre" ${room.estado === 'Libre' ? 'selected' : ''}>Libre</option>
                    <option value="Usada" ${room.estado === 'Usada' ? 'selected' : ''}>Usada</option>
                    <option value="Limpieza" ${room.estado === 'Limpieza' ? 'selected' : ''}>Limpieza</option>
                    <option value="Mantenimiento" ${room.estado === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                </select>
                <button class="btn-icon-danger" onclick="eliminarHabitacion('${room.numero}')" title="Eliminar Habitación">
                    🗑️
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

document.getElementById('filter-estado').addEventListener('change', () => {
    renderRooms(hotelRooms);
});

function populateRoomSelect(rooms) {
    const select = document.getElementById('nfc-select-room');
    select.innerHTML = '<option value="">Selecciona habitación</option>';

    rooms.forEach(r => {
        const option = document.createElement('option');
        option.value = r.numero;
        option.textContent = `Habitación #${r.numero} - ${r.tipo} (${r.estado})`;
        select.appendChild(option);
    });
}

async function actualizarEstadoHab(numero, nuevoEstado) {
    try {
        const res = await fetch(`/api/habitaciones/${numero}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, 'success');
            fetchStats();
            fetchRooms();
            fetchTarjetas();
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Error de conexión', 'error');
    }
}

async function eliminarHabitacion(numero) {
    if (!confirm(`¿Estás seguro de eliminar la habitación #${numero}?`)) return;

    try {
        const res = await fetch(`/api/habitaciones/${numero}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, 'success');
            fetchRooms();
            fetchStats();
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Error al eliminar', 'error');
    }
}

/* ========================================================
   3. MODAL CREAR HABITACIÓN
   ======================================================== */
function initModals() {
    const modal = document.getElementById('modal-room');
    const openBtn = document.getElementById('btn-abrir-crear-hab');
    const closeBtn = document.getElementById('btn-modal-close');
    const cancelBtn = document.getElementById('btn-modal-cancel');

    const openModal = () => {
        modal.classList.remove('hidden');
        document.getElementById('room-num').focus();
    };
    const closeModal = () => modal.classList.add('hidden');

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    document.getElementById('form-create-room').addEventListener('submit', async (e) => {
        e.preventDefault();
        const numero = document.getElementById('room-num').value.trim();
        const tipo = document.getElementById('room-type').value;
        const piso = document.getElementById('room-floor').value;
        const precio = document.getElementById('room-price').value;

        try {
            const res = await fetch('/api/habitaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numero, tipo, piso, precio })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                document.getElementById('form-create-room').reset();
                closeModal();
                fetchRooms();
                fetchStats();
            } else {
                showToast(data.error, 'error');
            }
        } catch (err) {
            showToast('Error al crear habitación', 'error');
        }
    });
}

/* ========================================================
   4. EMISIÓN DE TARJETA NFC & CONTADORES
   ======================================================== */
function initForms() {
    const formNfc = document.getElementById('form-nfc-issue');
    const virtualCard = document.getElementById('virtual-nfc-card');
    
    // Contadores de caracteres en vivo
    setupCharCounter('nfc-guest-name', 'guest-char-counter', 50);
    setupCharCounter('room-num', 'room-char-counter', 8);

    // Inicializar Fechas Calendario con defaults inteligentes (Hoy y Mañana)
    const checkinInput = document.getElementById('nfc-date-checkin');
    const checkoutInput = document.getElementById('nfc-date-checkout');

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const formatDateVal = (d) => d.toISOString().split('T')[0];

    checkinInput.value = formatDateVal(today);
    checkinInput.min = formatDateVal(today);
    checkoutInput.value = formatDateVal(tomorrow);
    checkoutInput.min = formatDateVal(today);

    // Si cambia check-in, ajustar mínimo de check-out
    checkinInput.addEventListener('change', () => {
        if (checkoutInput.value < checkinInput.value) {
            const nextDay = new Date(checkinInput.value);
            nextDay.setDate(nextDay.getDate() + 1);
            checkoutInput.value = formatDateVal(nextDay);
        }
        checkoutInput.min = checkinInput.value;
    });

    formNfc.addEventListener('submit', async (e) => {
        e.preventDefault();

        const numero = document.getElementById('nfc-select-room').value;
        const huesped = document.getElementById('nfc-guest-name').value.trim();
        const dateIn = checkinInput.value;
        const dateOut = checkoutInput.value;
        const timeIn = document.getElementById('nfc-time-checkin').value || '14:00';
        const timeOut = document.getElementById('nfc-time-checkout').value || '12:00';

        // Validación mediante módulo propio (nfcValidator.js)
        const validacion = validarDatosNFC(numero, huesped, dateIn, dateOut);
        if (!validacion.valido) {
            showToast(validacion.error, 'error');
            return;
        }

        // Formatear fechas mediante módulo propio
        const fechaRango = formatearRangoFechas(dateIn, dateOut);
        const horarioRango = `In: ${timeIn} | Out: ${timeOut}`;

        try {
            const res = await fetch('/api/nfc/generar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numero: numero,
                    huesped: huesped,
                    fecha_es: fechaRango,
                    horario_es: horarioRango
                })
            });

            const data = await res.json();

            if (res.ok) {
                showToast('¡Tarjeta NFC emitida y activada con éxito!', 'success');
                
                // Mostrar la tarjeta virtual
                document.getElementById('display-nfc-code').textContent = data.nfc.codigo;
                document.getElementById('display-nfc-guest').textContent = data.nfc.huesped;
                document.getElementById('display-nfc-room').textContent = `#${data.nfc.habitacion_numero}`;
                document.getElementById('display-nfc-date').textContent = data.nfc.fecha_es;
                virtualCard.classList.remove('hidden');

                // Enlazar botones de tarjeta virtual
                document.getElementById('btn-copy-code').onclick = () => {
                    navigator.clipboard.writeText(data.nfc.codigo);
                    showToast('Código copiado al portapapeles', 'success');
                };

                document.getElementById('btn-send-to-arduino').onclick = () => {
                    document.querySelector('[data-tab="tab-arduino"]').click();
                    document.getElementById('arduino-input-code').value = data.nfc.codigo;
                    ejecutarValidacionArduino(data.nfc.codigo);
                };

                // Actualizar vistas
                fetchRooms();
                fetchStats();
                fetchTarjetas();
            } else {
                showToast(data.error, 'error');
            }
        } catch (err) {
            showToast('Error al emitir tarjeta', 'error');
        }
    });
}

function setupCharCounter(inputId, counterId, maxLen) {
    const input = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    if (!input || !counter) return;

    const update = () => {
        const len = input.value.length;
        counter.textContent = `${len}/${maxLen}`;
        if (len >= maxLen) {
            counter.className = 'char-counter limit-max';
        } else if (len >= maxLen * 0.85) {
            counter.className = 'char-counter limit-near';
        } else {
            counter.className = 'char-counter';
        }
    };

    input.addEventListener('input', update);
    update();
}

/* ========================================================
   5. ARDUINO FÍSICO (USB) & SIMULADOR
   ======================================================== */
let lastReceivedCardCode = null;

function initArduino() {
    // 5.1 Controles de Arduino Uno Físico
    const selectPort = document.getElementById('select-com-port');
    const btnScanPorts = document.getElementById('btn-scan-ports');
    const btnConnect = document.getElementById('btn-connect-arduino');
    const btnDisconnect = document.getElementById('btn-disconnect-arduino');
    const statusText = document.getElementById('arduino-status-text');
    const statusDot = document.getElementById('arduino-dot');

    const cargarPuertos = async () => {
        try {
            const res = await fetch('/api/arduino/ports');
            const data = await res.json();

            selectPort.innerHTML = '';
            if (data.ports.length === 0) {
                selectPort.innerHTML = '<option value="">No se detectaron puertos COM</option>';
            } else {
                data.ports.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.port;
                    opt.textContent = `${p.port} (${p.description})`;
                    selectPort.appendChild(opt);
                });
            }

            actualizarEstadoArduinoUI(data.connected, data.status, data.current_port);
        } catch (e) {
            console.error('Error cargando puertos COM:', e);
        }
    };

    const actualizarEstadoArduinoUI = (conectado, mensaje, puerto) => {
        if (conectado) {
            statusDot.className = 'status-indicator-dot green';
            statusText.textContent = `Conectado a ${puerto}`;
            btnConnect.classList.add('hidden');
            btnDisconnect.classList.remove('hidden');
        } else {
            statusDot.className = 'status-indicator-dot red';
            statusText.textContent = mensaje || 'Desconectado';
            btnConnect.classList.remove('hidden');
            btnDisconnect.classList.add('hidden');
        }
    };

    btnScanPorts.addEventListener('click', () => {
        cargarPuertos();
        showToast('Puertos COM escaneados', 'success');
    });

    btnConnect.addEventListener('click', async () => {
        const port = selectPort.value;
        if (!port) {
            showToast('Selecciona un puerto COM primero', 'error');
            return;
        }

        try {
            const res = await fetch('/api/arduino/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                actualizarEstadoArduinoUI(true, 'Conectado', port);
            } else {
                showToast(data.error, 'error');
            }
        } catch (e) {
            showToast('Error conectando a Arduino', 'error');
        }
    });

    btnDisconnect.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/arduino/disconnect', { method: 'POST' });
            const data = await res.json();
            showToast(data.message, 'success');
            actualizarEstadoArduinoUI(false, 'Desconectado', null);
            document.getElementById('live-serial-card').classList.add('hidden');
        } catch (e) {
            showToast('Error desconectando', 'error');
        }
    });

    // Carga inicial de puertos COM
    cargarPuertos();

    // Polling de lecturas en vivo desde Arduino físico
    setInterval(async () => {
        try {
            const res = await fetch('/api/arduino/live-status');
            const data = await res.json();

            if (data.connected && data.last_card) {
                const card = data.last_card;
                // Si llegó una nueva lectura
                if (card.codigo !== lastReceivedCardCode) {
                    lastReceivedCardCode = card.codigo;

                    const liveBox = document.getElementById('live-serial-card');
                    liveBox.classList.remove('hidden');

                    document.getElementById('serial-card-time').textContent = card.hora;
                    document.getElementById('serial-card-code').textContent = card.codigo;
                    document.getElementById('serial-card-guest').textContent = `Huésped: ${card.huesped}`;
                    document.getElementById('serial-card-room').textContent = `Habitación: #${card.habitacion}`;
                    
                    const resElem = document.getElementById('serial-card-result');
                    if (card.acceso) {
                        resElem.textContent = '✅ ACCESO CONCEDIDO (Puerta Abierta)';
                        resElem.style.color = 'var(--success)';
                        showToast(`Arduino detectó: Hab #${card.habitacion} abierta para ${card.huesped}`, 'success');
                    } else {
                        resElem.textContent = '❌ ACCESO DENEGADO (Bloqueada)';
                        resElem.style.color = 'var(--danger)';
                        showToast('Arduino detectó tarjeta no autorizada', 'error');
                    }

                    fetchStats();
                    fetchIntentos();
                }
            }
        } catch (e) {
            // Ignorar errores transitorios de polling
        }
    }, 2000);

    // 5.2 Controles de Simulador Manual
    const btnScan = document.getElementById('btn-arduino-scan');
    const inputCode = document.getElementById('arduino-input-code');
    const scanArea = document.getElementById('scan-trigger');

    btnScan.addEventListener('click', () => {
        const codigo = inputCode.value.trim();
        ejecutarValidacionArduino(codigo);
    });

    scanArea.addEventListener('click', () => {
        const codigo = inputCode.value.trim();
        if (codigo) {
            ejecutarValidacionArduino(codigo);
        } else {
            inputCode.focus();
            showToast('Ingresa un código en el lector', 'error');
        }
    });
}

async function ejecutarValidacionArduino(codigo) {
    const feedback = document.getElementById('arduino-feedback');
    feedback.classList.remove('hidden', 'granted', 'denied');

    if (!codigo) {
        feedback.className = 'status-box denied';
        feedback.innerHTML = '<strong>Error de lectura:</strong> No se detectó código NFC.';
        return;
    }

    try {
        const res = await fetch('/api/nfc/verificar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo: codigo, dispositivo: 'Simulador Web (Arduino Uno/RC522)' })
        });

        const data = await res.json();

        if (res.ok && data.acceso) {
            feedback.className = 'status-box granted';
            feedback.innerHTML = `
                <div><strong>🟢 ACCESO AUTORIZADO</strong> &bull; Señal enviada a cerradura electromagnética</div>
                <div>Huésped: <strong>${data.huesped}</strong> &bull; Habitación: <strong>#${data.habitacion}</strong></div>
                <small>Tarjeta válida para la estancia registrada.</small>
            `;
            showToast(`Habitación #${data.habitacion} abierta para ${data.huesped}`, 'success');
        } else {
            feedback.className = 'status-box denied';
            feedback.innerHTML = `
                <div><strong>🔴 ACCESO DENEGADO</strong> &bull; Puerta Bloqueada</div>
                <div>${data.mensaje || 'Tarjeta no autorizada'}</div>
            `;
            showToast('Acceso denegado', 'error');
        }

        fetchIntentos();
        fetchStats();
    } catch (err) {
        feedback.className = 'status-box denied';
        feedback.innerHTML = '<strong>Error:</strong> Fallo en la comunicación con el servidor.';
    }
}

/* ========================================================
   6. HISTORIAL & AUDITORÍA
   ======================================================== */
async function fetchTarjetas() {
    try {
        const res = await fetch('/api/nfc/tarjetas');
        const list = await res.json();
        const tbody = document.getElementById('table-tarjetas-body');

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Sin tarjetas emitidas aún.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(t => `
            <tr>
                <td><code>${t.codigo}</code></td>
                <td><strong>#${t.habitacion_numero || '-'}</strong></td>
                <td>${t.huesped}</td>
                <td>
                    <span class="status-pill ${t.activo ? 'Libre' : 'Mantenimiento'}" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">
                        ${t.activo ? 'Activa' : 'Expirada'}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error cargando tarjetas:', err);
    }
}

async function fetchIntentos() {
    try {
        const res = await fetch('/api/nfc/intentos');
        const list = await res.json();
        const tbody = document.getElementById('table-intentos-body');

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Sin registros de acceso todavía.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(i => `
            <tr>
                <td><small>${i.timestamp.split(' ')[1] || i.timestamp}</small></td>
                <td><strong>${i.habitacion_numero ? '#' + i.habitacion_numero : 'N/A'}</strong></td>
                <td>${i.huesped || 'Desconocido'}</td>
                <td>
                    <span class="status-pill ${i.resultado ? 'Libre' : 'Usada'}" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">
                        ${i.resultado ? 'Concedido' : 'Denegado'}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error cargando intentos:', err);
    }
}

document.getElementById('btn-refresh-intentos').addEventListener('click', () => {
    fetchIntentos();
    showToast('Accesos actualizados', 'success');
});

document.getElementById('btn-refresh-tarjetas').addEventListener('click', () => {
    fetchTarjetas();
    showToast('Tarjetas actualizadas', 'success');
});

/* ========================================================
   7. TOAST NOTIFICATIONS
   ======================================================== */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✅' : '⚠️'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/* ========================================================
   8. CATÁLOGO DE SERVICIOS (MARCADO EXTENSIBLE XML)
   ======================================================== */
function initXmlCatalog() {
    const filterCapacidad = document.getElementById('filter-capacidad-xml');
    const btnReload = document.getElementById('btn-reload-xml');

    const cargarYMostrar = async () => {
        const statusElem = document.getElementById('xml-status-message');
        try {
            statusElem.textContent = '⏳ Cargando catálogo XML y procesando nodos...';
            statusElem.style.color = '#a5b4fc';

            serviciosCatalogo = await cargarServiciosXML('/static/data/servicios.xml');
            renderServicesXML(serviciosCatalogo);

            statusElem.textContent = `✅ Archivo XML procesado correctamente: ${serviciosCatalogo.length} categorías de servicios disponibles.`;
            statusElem.style.color = 'var(--success)';
        } catch (error) {
            statusElem.textContent = `❌ Error procesando XML: ${error.message}`;
            statusElem.style.color = 'var(--danger)';
            showToast('Fallo al cargar servicios XML', 'error');
        }
    };

    filterCapacidad.addEventListener('change', () => {
        const capacidadMin = parseInt(filterCapacidad.value, 10) || 0;
        const filtrados = filtrarPorCapacidad(serviciosCatalogo, capacidadMin);
        renderServicesXML(filtrados);
    });

    btnReload.addEventListener('click', () => {
        cargarYMostrar();
        showToast('Catálogo XML recargado', 'success');
    });

    // Carga inicial
    cargarYMostrar();
}

function renderServicesXML(servicios) {
    const container = document.getElementById('services-xml-container');
    if (!container) return;

    container.innerHTML = '';

    if (!servicios || servicios.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">
            No se encontraron servicios en el XML para los criterios especificados.
        </div>`;
        return;
    }

    servicios.forEach(s => {
        const card = document.createElement('div');
        card.className = 'service-xml-card';
        card.innerHTML = `
            <div>
                <div class="service-card-top">
                    <span class="service-cat-id">${s.id}</span>
                    <span class="service-capacity-badge">👥 Hasta ${s.capacidadMax} personas</span>
                </div>
                <h3 class="service-card-title">${s.nombre}</h3>
                <p class="service-card-desc">${s.descripcion}</p>
                <ul class="service-items-list">
                    ${s.serviciosIncluidos.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
            <div class="service-card-bottom">
                <span class="service-price-tag">$${s.tarifaBase.toFixed(2)} <small>/ noche base</small></span>
                <button class="btn btn-outline-light btn-sm" onclick="seleccionarServicioParaHab('${s.nombre}')">
                    Elegir Tipo
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Vincula la selección de un servicio XML con el formulario de creación de habitación
window.seleccionarServicioParaHab = function(nombreTipo) {
    document.querySelector('[data-tab="tab-habitaciones"]').click();
    document.getElementById('btn-abrir-crear-hab').click();
    
    const selectTipo = document.getElementById('room-type');
    for (let opt of selectTipo.options) {
        if (nombreTipo.toLowerCase().includes(opt.value.toLowerCase())) {
            selectTipo.value = opt.value;
            break;
        }
    }
    showToast(`Tipo seleccionado: ${nombreTipo}`, 'success');
};

