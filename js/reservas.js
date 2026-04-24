// ============================================
// RESERVAS - SISTEMA DINAMICO POR AREA
// ============================================

import { currentUser, crearReserva, escucharMesas, actualizarEstadoMesa, auth } from './firebase-config.js';

// ============================================
// VARIABLES
// ============================================
let mesaSeleccionada = null;
let areaSeleccionada = 'salon-principal';
let mesasEstado = {};

// ============================================
// CONFIGURACION DE AREAS
// ============================================
const AREAS_CONFIG = {
    'salon-principal': {
        nombre: 'Salón Principal',
        descripcion: 'Elegancia clásica para tu experiencia',
        imagen: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1920',
        mesas: [
            { id: 'M1', capacidad: 2, tipo: 'redonda', tamano: 'pequena', fila: 'frontal' },
            { id: 'M2', capacidad: 2, tipo: 'redonda', tamano: 'pequena', fila: 'frontal' },
            { id: 'M3', capacidad: 4, tipo: 'cuadrada', tamano: 'mediana', fila: 'centro' },
            { id: 'M4', capacidad: 4, tipo: 'cuadrada', tamano: 'mediana', fila: 'centro' },
            { id: 'M5', capacidad: 6, tipo: 'rectangular', tamano: 'grande', fila: 'fondo' },
            { id: 'M6', capacidad: 6, tipo: 'rectangular', tamano: 'grande', fila: 'fondo' },
            { id: 'M7', capacidad: 8, tipo: 'rectangular', tamano: 'extra', fila: 'fondo' },
            { id: 'M8', capacidad: 8, tipo: 'rectangular', tamano: 'extra', fila: 'fondo' }
        ]
    },
    'terraza': {
        nombre: 'Terraza',
        descripcion: 'Vista panorámica de la ciudad',
        imagen: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920',
        mesas: [
            { id: 'T1', capacidad: 2, tipo: 'redonda', tamano: 'pequena', fila: 'unica' },
            { id: 'T2', capacidad: 2, tipo: 'redonda', tamano: 'pequena', fila: 'unica' },
            { id: 'T3', capacidad: 4, tipo: 'cuadrada', tamano: 'mediana', fila: 'unica' },
            { id: 'T4', capacidad: 4, tipo: 'cuadrada', tamano: 'mediana', fila: 'unica' },
            { id: 'T5', capacidad: 6, tipo: 'rectangular', tamano: 'grande', fila: 'unica' },
            { id: 'T6', capacidad: 6, tipo: 'rectangular', tamano: 'grande', fila: 'unica' }
        ]
    },
    'vip': {
        nombre: 'Zona VIP',
        descripcion: 'Exclusividad y privacidad garantizada',
        imagen: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1920',
        mesas: [
            { id: 'V1', capacidad: 2, tipo: 'redonda', tamano: 'pequena', fila: 'vip', vip: true },
            { id: 'V2', capacidad: 4, tipo: 'cuadrada', tamano: 'mediana', fila: 'vip', vip: true },
            { id: 'V3', capacidad: 6, tipo: 'rectangular', tamano: 'grande', fila: 'vip', vip: true },
            { id: 'V4', capacidad: 8, tipo: 'rectangular', tamano: 'extra', fila: 'vip', vip: true }
        ]
    },
    'bar': {
        nombre: 'Bar',
        descripcion: 'Coctelería de autor y ambiente casual',
        imagen: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1920',
        mesas: [
            { id: 'B1', capacidad: 2, tipo: 'alta', tamano: 'redonda', fila: 'bar', bar: true },
            { id: 'B2', capacidad: 2, tipo: 'alta', tamano: 'redonda', fila: 'bar', bar: true },
            { id: 'B3', capacidad: 4, tipo: 'alta', tamano: 'cuadrada', fila: 'bar', bar: true },
            { id: 'B4', capacidad: 4, tipo: 'alta', tamano: 'cuadrada', fila: 'bar', bar: true }
        ]
    }
};

// ============================================
// FUNCIÓN PARA CARGAR EMAILJS (MEJORADA PARA MÓVILES)
// ============================================
let emailJSPromise = null;

async function cargarEmailJS() {
    // Si ya está cargado e inicializado
    if (typeof window.emailjs !== 'undefined' && window.emailjs.send) {
        console.log('✅ EmailJS ya disponible');
        return true;
    }
    
    // Si ya hay una carga en progreso
    if (emailJSPromise) {
        console.log('⏳ Esperando carga de EmailJS...');
        return emailJSPromise;
    }
    
    emailJSPromise = new Promise((resolve, reject) => {
        console.log('📧 Iniciando carga de EmailJS...');
        
        // Crear script
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        script.async = true;
        
        script.onload = () => {
            console.log('📦 Script EmailJS cargado, inicializando...');
            let intentos = 0;
            const maxIntentos = 30;
            
            const verificarInterval = setInterval(() => {
                if (typeof window.emailjs !== 'undefined' && window.emailjs.init) {
                    clearInterval(verificarInterval);
                    try {
                        window.emailjs.init("QL_ked8bte37-iteX");
                        console.log('🎉 EmailJS inicializado correctamente');
                        resolve(true);
                    } catch (err) {
                        console.error('❌ Error inicializando:', err);
                        reject(new Error('Error al inicializar EmailJS'));
                    }
                }
                intentos++;
                if (intentos >= maxIntentos) {
                    clearInterval(verificarInterval);
                    reject(new Error('Timeout: EmailJS no se inicializó'));
                }
            }, 100);
        };
        
        script.onerror = () => {
            reject(new Error('No se pudo cargar el script de EmailJS'));
        };
        
        document.head.appendChild(script);
    });
    
    return emailJSPromise;
}

// Cargar EmailJS automáticamente
cargarEmailJS().catch(err => console.warn('⚠️ Precarga EmailJS:', err.message));

// ============================================
// FUNCIÓN PARA ENVIAR CORREO
// ============================================
async function enviarCorreoConfirmacion(data, user) {
    console.log('📧 Iniciando envío de correo...');
    console.log('👤 Usuario:', user?.email);
    
    if (!user || !user.email) {
        throw new Error('No hay usuario logueado');
    }
    
    // Asegurar que EmailJS está cargado
    try {
        await cargarEmailJS();
        console.log('✅ EmailJS listo para enviar');
    } catch (error) {
        console.error('❌ Error cargando EmailJS:', error);
        throw new Error('Servicio de correo no disponible');
    }
    
    if (typeof window.emailjs === 'undefined' || !window.emailjs.send) {
        throw new Error('EmailJS no disponible');
    }
    
    // Formatear fecha
    let fechaFormateada;
    try {
        const fechaObj = new Date(data.fecha + 'T00:00:00');
        fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        fechaFormateada = data.fecha;
    }
    
    // Obtener nombre del área
    let areaNombre = data.area;
    if (AREAS_CONFIG[data.area]) {
        areaNombre = AREAS_CONFIG[data.area].nombre;
    }
    
    const templateParams = {
        user_email: user.email,
        name: 'Inti Raymi Restaurant',
        to_name: user.displayName || (user.email ? user.email.split('@')[0] : 'Cliente'),
        area_name: areaNombre,
        mesa: data.mesaId,
        fecha: fechaFormateada,
        hora: data.hora,
        personas: data.personas
    };
    
    console.log('📧 Parámetros del correo:', templateParams);
    
    try {
        const response = await window.emailjs.send(
            'service_0z6lp49',
            'template_inlbxge',
            templateParams
        );
        console.log('✅ Correo enviado! Status:', response.status);
        return true;
    } catch (error) {
        console.error('❌ Error EmailJS:', error);
        throw new Error(error.text || error.message || 'Error al enviar correo');
    }
}

// ============================================
// INICIALIZACION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarSelectorAreas();
    inicializarFechaMinima();
    console.log('🌞 Sistema de reservas dinámico cargado');
});

function inicializarFechaMinima() {
    const fechaInput = document.getElementById('fechaReserva');
    if (fechaInput) {
        const hoy = new Date().toISOString().split('T')[0];
        fechaInput.min = hoy;
    }
}

// ============================================
// SELECTOR DE AREAS
// ============================================
function inicializarSelectorAreas() {
    const areaOptions = document.querySelectorAll('.area-option');

    areaOptions.forEach(option => {
        option.addEventListener('click', () => {
            const area = option.dataset.area;
            cambiarArea(area);
        });
    });

    cargarArea('salon-principal');
}

function cambiarArea(area) {
    if (area === areaSeleccionada) return;

    document.querySelectorAll('.area-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.area === area) {
            opt.classList.add('active');
        }
    });

    animarCambioHero(area);
    cargarArea(area);
    mesaSeleccionada = null;
    actualizarFormulario();
}

function animarCambioHero(area) {
    const hero = document.getElementById('reservasHero');
    const heroImg = document.getElementById('heroImage');
    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');
    const config = AREAS_CONFIG[area];

    if (hero) hero.classList.add('cambio-hero');

    setTimeout(() => {
        if (heroImg) heroImg.src = config.imagen;
        if (heroTitle) heroTitle.textContent = config.nombre;
        if (heroSubtitle) heroSubtitle.textContent = config.descripcion;
        if (hero) hero.classList.remove('cambio-hero');
    }, 400);
}

function cargarArea(area) {
    areaSeleccionada = area;
    const config = AREAS_CONFIG[area];

    const mesasTitle = document.getElementById('mesasTitle');
    const mesasSubtitle = document.getElementById('mesasSubtitle');
    
    if (mesasTitle) mesasTitle.textContent = `Mesas del ${config.nombre}`;
    if (mesasSubtitle) mesasSubtitle.textContent = 'Selecciona la mesa perfecta para tu experiencia';

    renderizarMesas(config.mesas, area);
}

function renderizarMesas(mesas, area) {
    const container = document.getElementById('mesasContainer');
    if (!container) return;
    
    container.classList.add('cambiando');

    setTimeout(() => {
        let html = '';

        if (area === 'salon-principal') {
            html = renderizarSalonPrincipal(mesas);
        } else if (area === 'terraza') {
            html = renderizarTerraza(mesas);
        } else if (area === 'vip') {
            html = renderizarVIP(mesas);
        } else if (area === 'bar') {
            html = renderizarBar(mesas);
        }

        container.innerHTML = html;
        inicializarEventosMesas();
        actualizarEstadosMesas();

        setTimeout(() => {
            container.classList.remove('cambiando');
        }, 50);
    }, 200);
}

// ============================================
// RENDERIZADORES POR AREA
// ============================================
function renderizarSalonPrincipal(mesas) {
    const frontal = mesas.filter(m => m.fila === 'frontal');
    const centro = mesas.filter(m => m.fila === 'centro');
    const fondo = mesas.filter(m => m.fila === 'fondo');

    return `
        <div class="elemento-plano entrada">🚪 ENTRADA</div>
        <div class="mesas-layout">
            <div class="mesa-row frontal">
                ${frontal.map(m => crearHTMLMesa(m)).join('')}
            </div>
            <div class="mesa-row center">
                ${centro.map(m => crearHTMLMesa(m)).join('')}
            </div>
            <div class="mesa-row back">
                ${fondo.map(m => crearHTMLMesa(m)).join('')}
            </div>
        </div>
    `;
}

function renderizarTerraza(mesas) {
    return `
        <div class="elemento-plano vista">🌅 VISTA PANORÁMICA</div>
        <div class="mesas-layout">
            <div class="mesa-row terraza-grid">
                ${mesas.map(m => crearHTMLMesa(m)).join('')}
            </div>
        </div>
    `;
}

function renderizarVIP(mesas) {
    return `
        <div class="elemento-plano privado">⭐ ZONA PRIVADA VIP</div>
        <div class="mesas-layout">
            <div class="mesa-row vip-grid">
                ${mesas.map(m => crearHTMLMesaVIP(m)).join('')}
            </div>
        </div>
    `;
}

function renderizarBar(mesas) {
    return `
        <div class="elemento-plano barra">🍸 BAR</div>
        <div class="mesas-layout">
            <div class="mesa-row bar-grid">
                ${mesas.map(m => crearHTMLMesaBar(m)).join('')}
            </div>
        </div>
    `;
}

// ============================================
// GENERADORES HTML DE MESAS
// ============================================
function crearHTMLMesa(mesa) {
    const sillasHTML = generarSillas(mesa.capacidad);
    const claseVIP = mesa.vip ? 'vip' : '';
    const claseBar = mesa.bar ? 'bar-mesa' : '';

    return `
        <div class="mesa-premium ${claseBar}" data-mesa="${mesa.id}" data-capacidad="${mesa.capacidad}">
            <div class="mesa-top">
                <span class="mesa-num">${mesa.id}</span>
                <span class="mesa-cap">👥 ${mesa.capacidad}</span>
            </div>
            <div class="mesa-visual mesa-${mesa.tipo} ${mesa.tamano} ${claseVIP}"></div>
            <div class="sillas ${getClaseSillas(mesa.capacidad)}">
                ${sillasHTML}
            </div>
        </div>
    `;
}

function crearHTMLMesaVIP(mesa) {
    const sillasHTML = generarSillas(mesa.capacidad, true);

    return `
        <div class="mesa-premium vip-mesa" data-mesa="${mesa.id}" data-capacidad="${mesa.capacidad}">
            <div class="mesa-top">
                <span class="mesa-num">${mesa.id}</span>
                <span class="vip-badge">⭐ VIP</span>
                <span class="mesa-cap">👥 ${mesa.capacidad}</span>
            </div>
            <div class="mesa-visual mesa-${mesa.tipo} ${mesa.tamano} vip"></div>
            <div class="sillas ${getClaseSillas(mesa.capacidad)}">
                ${sillasHTML}
            </div>
        </div>
    `;
}

function crearHTMLMesaBar(mesa) {
    const sillasHTML = generarSillasAltas(mesa.capacidad);

    return `
        <div class="mesa-premium bar-mesa" data-mesa="${mesa.id}" data-capacidad="${mesa.capacidad}">
            <div class="mesa-top">
                <span class="mesa-num">${mesa.id}</span>
                <span class="mesa-cap">👥 ${mesa.capacidad}</span>
            </div>
            <div class="mesa-visual mesa-alta ${mesa.tamano}"></div>
            <div class="sillas altas ${mesa.capacidad === 4 ? 'cuatro' : ''}">
                ${sillasHTML}
            </div>
        </div>
    `;
}

function generarSillas(cantidad, vip = false) {
    const claseVIP = vip ? 'vip-silla' : '';
    let sillas = '';
    for (let i = 0; i < cantidad; i++) {
        sillas += `<span class="silla ${claseVIP}">🪑</span>`;
    }
    return sillas;
}

function generarSillasAltas(cantidad) {
    let sillas = '';
    for (let i = 0; i < cantidad; i++) {
        sillas += '<span class="silla alta">💺</span>';
    }
    return sillas;
}

function getClaseSillas(capacidad) {
    const clases = { 2: 'dos', 4: 'cuatro', 6: 'seis', 8: 'ocho' };
    return clases[capacidad] || '';
}

// ============================================
// EVENTOS DE MESAS
// ============================================
function inicializarEventosMesas() {
    document.querySelectorAll('.mesa-premium').forEach(mesa => {
        mesa.addEventListener('click', () => {
            if (mesa.classList.contains('ocupada')) {
                mostrarNotificacion('❌ Esta mesa ya está reservada', 'error');
                return;
            }

            document.querySelectorAll('.mesa-premium.seleccionada').forEach(m => {
                m.classList.remove('seleccionada');
            });

            mesa.classList.add('seleccionada');
            mesaSeleccionada = {
                id: mesa.dataset.mesa,
                capacidad: mesa.dataset.capacidad,
                area: areaSeleccionada
            };

            actualizarFormulario();
            mostrarNotificacion(`✅ Mesa ${mesa.dataset.mesa} seleccionada`, 'success');
        });
    });
}

function actualizarEstadosMesas() {
    escucharMesas((mesas) => {
        mesasEstado = mesas;

        document.querySelectorAll('.mesa-premium').forEach(mesa => {
            const mesaId = mesa.dataset.mesa;
            const estado = mesas[mesaId]?.estado || 'disponible';

            mesa.classList.remove('disponible', 'ocupada');

            if (estado === 'ocupada') {
                mesa.classList.add('ocupada');
            } else {
                mesa.classList.add('disponible');
            }
        });
    });
}

// ============================================
// FORMULARIO Y RESERVA
// ============================================
function actualizarFormulario() {
    const inputMesa = document.getElementById('mesaSeleccionada');
    const resArea = document.getElementById('resArea');
    const resMesa = document.getElementById('resMesa');

    if (inputMesa) {
        inputMesa.value = mesaSeleccionada ? mesaSeleccionada.id : '';
    }

    if (resArea) {
        resArea.textContent = mesaSeleccionada ? AREAS_CONFIG[mesaSeleccionada.area].nombre : '-';
    }
    if (resMesa) {
        resMesa.textContent = mesaSeleccionada ? `${mesaSeleccionada.id} (${mesaSeleccionada.capacidad} pers.)` : '-';
    }
}

const fechaInput = document.getElementById('fechaReserva');
const horaInput = document.getElementById('horaReserva');
const personasInput = document.getElementById('numPersonas');

if (fechaInput) fechaInput.addEventListener('change', actualizarResumen);
if (horaInput) horaInput.addEventListener('change', actualizarResumen);
if (personasInput) personasInput.addEventListener('input', actualizarResumen);

function actualizarResumen() {
    const resFecha = document.getElementById('resFecha');
    const resHora = document.getElementById('resHora');
    const resPersonas = document.getElementById('resPersonas');

    if (fechaInput && resFecha) resFecha.textContent = fechaInput.value || '-';
    if (horaInput && resHora) resHora.textContent = horaInput.value || '-';
    if (personasInput && resPersonas) resPersonas.textContent = personasInput.value || '-';
}

// ============================================
// ENVIO DE RESERVA
// ============================================
const reservaForm = document.getElementById('reservaForm');
const modalConfirmacion = document.getElementById('modalConfirmacion');

if (modalConfirmacion) {
    modalConfirmacion.style.display = 'none';
}

if (reservaForm) {
    reservaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Obtener usuario actual
        const userReal = auth.currentUser;
        
        console.log('🔍 Usuario actual:', userReal?.email);
        
        if (!userReal) {
            mostrarNotificacion('🔐 Debes iniciar sesión para hacer una reserva', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return;
        }
        
        if (!mesaSeleccionada) {
            mostrarNotificacion('🪑 Por favor selecciona una mesa', 'error');
            return;
        }
        
        if (!fechaInput?.value || !horaInput?.value || !personasInput?.value) {
            mostrarNotificacion('📋 Completa todos los campos del formulario', 'error');
            return;
        }
        
        const reservaData = {
            mesaId: mesaSeleccionada.id,
            mesaCapacidad: mesaSeleccionada.capacidad,
            area: mesaSeleccionada.area,
            fecha: fechaInput.value,
            hora: horaInput.value,
            personas: parseInt(personasInput.value),
            notas: document.getElementById('notasReserva')?.value || ''
        };
        
        let reservaCreada = null;
        
        // Mostrar loading
        const btnReservar = document.getElementById('btnReservar');
        const textoOriginal = btnReservar?.textContent;
        if (btnReservar) {
            btnReservar.textContent = '⏳ Procesando...';
            btnReservar.disabled = true;
        }
        
        try {
            // 1. Crear reserva en Firebase
            console.log('📝 Creando reserva en Firebase...');
            reservaCreada = await crearReserva(reservaData);
            await actualizarEstadoMesa(mesaSeleccionada.id, 'ocupada', reservaCreada.id);
            console.log('✅ Reserva creada:', reservaCreada.id);
            
        } catch (error) {
            console.error('❌ Error creando reserva:', error);
            mostrarNotificacion('Error al crear la reserva. Intenta nuevamente.', 'error');
            if (btnReservar) {
                btnReservar.textContent = textoOriginal;
                btnReservar.disabled = false;
            }
            return;
        }
        
        // 2. Mostrar confirmación
        mostrarConfirmacion(reservaData, userReal);
        
        // 3. Intentar enviar correo (no bloqueante)
        console.log('📧 Enviando correo a:', userReal.email);
        
        try {
            await enviarCorreoConfirmacion(reservaData, userReal);
            console.log('✅ Correo enviado');
            actualizarEstadoCorreo('success', userReal.email);
        } catch (error) {
            console.error('❌ Error en correo:', error);
            actualizarEstadoCorreo('error', userReal.email);
            mostrarNotificacion('⚠️ Reserva creada, pero el correo no pudo enviarse', 'error');
        }
        
        // 4. Limpiar formulario
        reservaForm.reset();
        document.querySelectorAll('.mesa-premium.seleccionada').forEach(m => {
            m.classList.remove('seleccionada');
        });
        mesaSeleccionada = null;
        actualizarFormulario();
        
        if (fechaInput) {
            const hoy = new Date().toISOString().split('T')[0];
            fechaInput.min = hoy;
        }
        
        if (btnReservar) {
            btnReservar.textContent = textoOriginal;
            btnReservar.disabled = false;
        }
    });
}

function mostrarConfirmacion(reservaData, user) {
    const detalle = document.getElementById('detalleConfirmacion');
    if (detalle) {
        const areaNombre = AREAS_CONFIG[reservaData.area]?.nombre || reservaData.area;
        const fechaFormateada = formatearFecha(reservaData.fecha);
        
        detalle.innerHTML = `
            <p><strong>📍 Área:</strong> ${areaNombre}</p>
            <p><strong>🪑 Mesa:</strong> ${reservaData.mesaId}</p>
            <p><strong>📅 Fecha:</strong> ${fechaFormateada}</p>
            <p><strong>⏰ Hora:</strong> ${reservaData.hora}</p>
            <p><strong>👥 Personas:</strong> ${reservaData.personas}</p>
            <hr style="margin: 15px 0; border-color: #ddd;">
            <div id="estadoCorreoTexto" style="color: #666; font-size: 0.9rem;">
                📧 Enviando correo a ${user.email}...
            </div>
        `;
        
        window.ultimaReserva = { data: reservaData, user: user };
    }
    
    if (modalConfirmacion) {
        modalConfirmacion.style.display = 'flex';
        modalConfirmacion.classList.add('active');
    }
}

function actualizarEstadoCorreo(estado, email) {
    const estadoEl = document.getElementById('estadoCorreoTexto');
    const btnReenviar = document.getElementById('btnReenviarCorreo');
    
    if (!estadoEl) return;
    
    if (estado === 'success') {
        estadoEl.innerHTML = `✅ Correo enviado correctamente a ${email}`;
        estadoEl.style.color = '#4CAF50';
        estadoEl.style.background = '#e8f5e9';
        estadoEl.style.padding = '10px';
        estadoEl.style.borderRadius = '8px';
    } else {
        estadoEl.innerHTML = `⚠️ No se pudo enviar el correo a ${email}.<br>✅ Tu reserva está confirmada.`;
        estadoEl.style.color = '#FF9800';
        estadoEl.style.background = '#fff3e0';
        estadoEl.style.padding = '10px';
        estadoEl.style.borderRadius = '8px';
        
        if (btnReenviar) {
            btnReenviar.style.display = 'inline-block';
            btnReenviar.onclick = async () => {
                btnReenviar.disabled = true;
                btnReenviar.textContent = '⏳ Enviando...';
                try {
                    if (window.ultimaReserva) {
                        await enviarCorreoConfirmacion(window.ultimaReserva.data, window.ultimaReserva.user);
                        actualizarEstadoCorreo('success', email);
                        btnReenviar.style.display = 'none';
                        mostrarNotificacion('✅ Correo reenviado exitosamente', 'success');
                    }
                } catch (err) {
                    btnReenviar.disabled = false;
                    btnReenviar.textContent = '📧 Reenviar Correo';
                    mostrarNotificacion('Error al reenviar: ' + err.message, 'error');
                }
            };
        }
    }
}

function formatearFecha(fechaStr) {
    try {
        const fecha = new Date(fechaStr);
        return fecha.toLocaleDateString('es-PE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return fechaStr;
    }
}

// Cerrar modal
const btnCerrar = document.getElementById('btnCerrarConfirmacion');
const closeModal = document.querySelector('.modal .close');

if (btnCerrar) {
    btnCerrar.addEventListener('click', () => {
        if (modalConfirmacion) {
            modalConfirmacion.classList.remove('active');
            modalConfirmacion.style.display = 'none';
        }
    });
}

if (closeModal) {
    closeModal.addEventListener('click', () => {
        if (modalConfirmacion) {
            modalConfirmacion.classList.remove('active');
            modalConfirmacion.style.display = 'none';
        }
    });
}

if (modalConfirmacion) {
    modalConfirmacion.addEventListener('click', (e) => {
        if (e.target === modalConfirmacion) {
            modalConfirmacion.classList.remove('active');
            modalConfirmacion.style.display = 'none';
        }
    });
}

// ============================================
// NOTIFICACIONES
// ============================================
function mostrarNotificacion(mensaje, tipo = 'success') {
    const anterior = document.querySelector('.notificacion-premium');
    if (anterior) anterior.remove();
    
    const notif = document.createElement('div');
    notif.className = 'notificacion-premium';
    const bgColor = tipo === 'error' ? '#f44336' : '#4CAF50';
    
    notif.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        z-index: 3000;
        animation: slideInRight 0.4s ease;
        font-weight: 500;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 250px;
        max-width: 90vw;
    `;
    
    const icono = tipo === 'error' ? '⚠️' : '✅';
    notif.innerHTML = `<span style="font-size: 1.2rem;">${icono}</span><span>${mensaje}</span>`;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notif.remove(), 400);
    }, 3000);
}

// Estilos dinámicos
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);