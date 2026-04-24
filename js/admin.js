// ============================================
// ADMIN.JS - PANEL DE ADMINISTRACIÓN CORREGIDO
// ============================================

import { auth, db, actualizarEstadoMesa, signOut } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { 
    collection, 
    doc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ============================================
// VARIABLES GLOBALES
// ============================================
let unsubscribeReservas = null;
let unsubscribePedidos = null;
let unsubscribeMesas = null;
let isAdmin = false;

// ============================================
// VERIFICAR AUTENTICACIÓN Y ROL
// ============================================
onAuthStateChanged(auth, async (user) => {
    console.log("👤 Verificando usuario:", user?.email);
    
    if (!user) {
        console.log("❌ No hay usuario, redirigiendo a login");
        window.location.href = 'login.html';
        return;
    }
    
    try {
        // Verificar rol directamente desde Firestore
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDocs(collection(db, "usuarios"));
        
        let esAdmin = false;
        userDoc.forEach(doc => {
            if (doc.id === user.uid && doc.data().rol === 'admin') {
                esAdmin = true;
            }
        });
        
        // También verificar por email
        const usuariosRef = collection(db, "usuarios");
        const usuariosSnapshot = await getDocs(usuariosRef);
        usuariosSnapshot.forEach(doc => {
            if (doc.data().email === user.email && doc.data().rol === 'admin') {
                esAdmin = true;
            }
        });
        
        console.log("🔍 ¿Es administrador?", esAdmin);
        
        if (!esAdmin) {
            console.log("❌ No es administrador, redirigiendo");
            alert('No tienes permisos de administrador');
            window.location.href = 'index.html';
            return;
        }
        
        isAdmin = true;
        console.log("✅ Acceso concedido como administrador");
        inicializarAdmin();
        
    } catch (error) {
        console.error("❌ Error verificando rol:", error);
        // Por si acaso, intentar cargar de todas formas
        inicializarAdmin();
    }
});

// ============================================
// INICIALIZAR PANEL
// ============================================
function inicializarAdmin() {
    console.log("🚀 Inicializando panel de administración...");
    
    // Cargar estadísticas
    cargarEstadisticas();
    
    // Cargar datos en tiempo real
    cargarReservas();
    cargarPedidos();
    cargarMesas();
    
    // Inicializar tabs
    inicializarTabs();
    
    // Inicializar logout
    inicializarLogout();
}

// ============================================
// INICIALIZAR TABS
// ============================================
function inicializarTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    const sections = document.querySelectorAll('.admin-section');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(`tab-${target}`);
            if (targetSection) targetSection.classList.add('active');
        });
    });
}

// ============================================
// CERRAR SESIÓN
// ============================================
function inicializarLogout() {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.href = 'index.html';
            });
        });
    }
}

// ============================================
// CARGAR ESTADÍSTICAS
// ============================================
async function cargarEstadisticas() {
    try {
        // Contar todos los usuarios
        const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
        const totalClientes = usuariosSnapshot.size;
        const statClientes = document.getElementById('statClientes');
        if (statClientes) statClientes.textContent = totalClientes;
        console.log("📊 Clientes registrados:", totalClientes);
    } catch (error) {
        console.error("Error cargando estadísticas de clientes:", error);
        const statClientes = document.getElementById('statClientes');
        if (statClientes) statClientes.textContent = '0';
    }
}

// ============================================
// CARGAR RESERVAS EN TIEMPO REAL
// ============================================
function cargarReservas() {
    if (unsubscribeReservas) unsubscribeReservas();
    
    const reservasRef = collection(db, "reservas");
    const q = query(reservasRef, orderBy("fechaCreacion", "desc"));
    
    unsubscribeReservas = onSnapshot(q, (snapshot) => {
        const tbody = document.querySelector('#tablaReservas tbody');
        if (!tbody) return;
        
        const reservas = [];
        snapshot.forEach((doc) => {
            reservas.push({ id: doc.id, ...doc.data() });
        });
        
        const hoy = new Date().toISOString().split('T')[0];
        const reservasHoy = reservas.filter(r => r.fecha === hoy);
        
        // Actualizar estadística
        const statReservas = document.getElementById('statReservas');
        if (statReservas) statReservas.textContent = reservasHoy.length;
        
        if (reservas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay reservas registradas</td></tr>';
            return;
        }
        
        tbody.innerHTML = reservas.map(reserva => `
            <tr>
                <td>${reserva.userNombre || reserva.userEmail || 'Anónimo'}</td>
                <td>${reserva.mesaId || '-'} (${reserva.area || '-'})</td>
                <td>${formatearFecha(reserva.fecha)}</td>
                <td>${reserva.hora || '-'}</td>
                <td>${reserva.personas || '-'}</td>
                <td><span class="estado-badge ${reserva.estado || 'pendiente'}">${reserva.estado || 'pendiente'}</span></td>
                <td>
                    ${reserva.estado !== 'completada' ? `<button class="btn-action btn-confirm" onclick="window.actualizarEstadoReserva('${reserva.id}', 'completada')">✓ Completar</button>` : ''}
                    <button class="btn-action btn-cancel" onclick="window.cancelarReserva('${reserva.id}')">✗ Cancelar</button>
                </td>
            </tr>
        `).join('');
        
        console.log("📅 Reservas cargadas:", reservas.length, "Reservas hoy:", reservasHoy.length);
    }, (error) => {
        console.error("Error en onSnapshot reservas:", error);
        const tbody = document.querySelector('#tablaReservas tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error al cargar reservas</td></tr>';
    });
}

// ============================================
// CARGAR PEDIDOS EN TIEMPO REAL
// ============================================
function cargarPedidos() {
    if (unsubscribePedidos) unsubscribePedidos();
    
    const pedidosRef = collection(db, "pedidos");
    const q = query(pedidosRef, orderBy("fechaCreacion", "desc"));
    
    unsubscribePedidos = onSnapshot(q, (snapshot) => {
        const tbody = document.querySelector('#tablaPedidos tbody');
        if (!tbody) return;
        
        const pedidos = [];
        snapshot.forEach((doc) => {
            pedidos.push({ id: doc.id, ...doc.data() });
        });
        
        const pedidosPendientes = pedidos.filter(p => p.estado === 'pendiente');
        
        // Actualizar estadística
        const statPedidos = document.getElementById('statPedidos');
        if (statPedidos) statPedidos.textContent = pedidosPendientes.length;
        
        if (pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay pedidos registrados</td></tr>';
            return;
        }
        
        tbody.innerHTML = pedidos.map(pedido => `
            <tr>
                <td>${pedido.userEmail || 'Anónimo'}</td>
                <td>${pedido.items ? pedido.items.map(i => `${i.nombre} x${i.cantidad}`).join(', ') : '-'}</td>
                <td><strong>$${pedido.total?.toFixed(2) || '0'} MXN</strong></td>
                <td>${formatearFechaHora(pedido.fechaCreacion)}</td>
                <td><span class="estado-badge ${pedido.estado === 'pendiente' ? 'pendiente' : 'completado'}">${pedido.estado || 'pendiente'}</span></td>
                <td>
                    ${pedido.estado === 'pendiente' ? `<button class="btn-action btn-confirm" onclick="window.completarPedido('${pedido.id}')">✓ Completar</button>` : '✓ Completado'}
                </td>
            </tr>
        `).join('');
        
        console.log("🍽️ Pedidos cargados:", pedidos.length, "Pendientes:", pedidosPendientes.length);
    }, (error) => {
        console.error("Error en onSnapshot pedidos:", error);
        const tbody = document.querySelector('#tablaPedidos tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error al cargar pedidos</td></tr>';
    });
}

// ============================================
// CARGAR MESAS EN TIEMPO REAL
// ============================================
function cargarMesas() {
    if (unsubscribeMesas) unsubscribeMesas();
    
    // Definición de todas las mesas del restaurante
    const mesasDefinicion = [
        { id: 'M1', cap: 2, area: 'Salón Principal' },
        { id: 'M2', cap: 2, area: 'Salón Principal' },
        { id: 'M3', cap: 4, area: 'Salón Principal' },
        { id: 'M4', cap: 4, area: 'Salón Principal' },
        { id: 'M5', cap: 6, area: 'Salón Principal' },
        { id: 'M6', cap: 6, area: 'Salón Principal' },
        { id: 'M7', cap: 8, area: 'Salón Principal' },
        { id: 'M8', cap: 8, area: 'Salón Principal' },
        { id: 'T1', cap: 2, area: 'Terraza' },
        { id: 'T2', cap: 2, area: 'Terraza' },
        { id: 'T3', cap: 4, area: 'Terraza' },
        { id: 'T4', cap: 4, area: 'Terraza' },
        { id: 'T5', cap: 6, area: 'Terraza' },
        { id: 'T6', cap: 6, area: 'Terraza' },
        { id: 'V1', cap: 2, area: 'VIP' },
        { id: 'V2', cap: 4, area: 'VIP' },
        { id: 'V3', cap: 6, area: 'VIP' },
        { id: 'V4', cap: 8, area: 'VIP' },
        { id: 'B1', cap: 2, area: 'Bar' },
        { id: 'B2', cap: 2, area: 'Bar' },
        { id: 'B3', cap: 4, area: 'Bar' },
        { id: 'B4', cap: 4, area: 'Bar' }
    ];
    
    const mesasRef = collection(db, "mesas");
    
    unsubscribeMesas = onSnapshot(mesasRef, (snapshot) => {
        const container = document.getElementById('mesasAdminGrid');
        if (!container) return;
        
        const mesasState = {};
        snapshot.forEach((doc) => {
            mesasState[doc.id] = doc.data();
        });
        
        let ocupadas = 0;
        
        const mesasHTML = mesasDefinicion.map(mesa => {
            const estado = mesasState[mesa.id]?.estado || 'disponible';
            if (estado === 'ocupada') ocupadas++;
            
            return `
                <div class="mesa-admin-card ${estado}">
                    <h4>${mesa.id}</h4>
                    <p class="mesa-status">${estado === 'ocupada' ? '🔴 OCUPADA' : '🟢 DISPONIBLE'}</p>
                    <p>📍 ${mesa.area}</p>
                    <p>👥 ${mesa.cap} personas</p>
                    ${estado === 'ocupada' ? `
                        <button class="btn-action btn-confirm" onclick="window.liberarMesa('${mesa.id}')" style="margin-top: 10px;">
                            🔓 Liberar Mesa
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        container.innerHTML = mesasHTML;
        
        // Actualizar estadística
        const statMesas = document.getElementById('statMesas');
        if (statMesas) statMesas.textContent = ocupadas;
        
        console.log("🪑 Mesas actualizadas, Ocupadas:", ocupadas);
    }, (error) => {
        console.error("Error en onSnapshot mesas:", error);
        const container = document.getElementById('mesasAdminGrid');
        if (container) container.innerHTML = '<div style="text-align: center; color: red;">Error al cargar mesas</div>';
    });
}

// ============================================
// FUNCIONES GLOBALES (para usar desde onclick)
// ============================================

window.actualizarEstadoReserva = async function(id, estado) {
    try {
        const reservaRef = doc(db, "reservas", id);
        await updateDoc(reservaRef, { estado: estado });
        mostrarNotificacion('✅ Reserva actualizada correctamente', 'success');
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('❌ Error al actualizar reserva', 'error');
    }
};

window.cancelarReserva = async function(id) {
    if (confirm('¿Estás seguro de cancelar esta reserva?')) {
        try {
            const reservaRef = doc(db, "reservas", id);
            await deleteDoc(reservaRef);
            mostrarNotificacion('✅ Reserva cancelada correctamente', 'success');
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('❌ Error al cancelar reserva', 'error');
        }
    }
};

window.completarPedido = async function(id) {
    try {
        const pedidoRef = doc(db, "pedidos", id);
        await updateDoc(pedidoRef, { estado: 'completado' });
        mostrarNotificacion('✅ Pedido completado correctamente', 'success');
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('❌ Error al completar pedido', 'error');
    }
};

window.liberarMesa = async function(mesaId) {
    if (confirm(`¿Liberar la mesa ${mesaId}?`)) {
        try {
            await actualizarEstadoMesa(mesaId, 'disponible', null);
            mostrarNotificacion(`✅ Mesa ${mesaId} liberada correctamente`, 'success');
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('❌ Error al liberar mesa', 'error');
        }
    }
};

// ============================================
// UTILIDADES
// ============================================

function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    try {
        const fecha = new Date(fechaStr);
        return fecha.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return fechaStr;
    }
}

function formatearFechaHora(timestamp) {
    if (!timestamp) return '-';
    try {
        const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return fecha.toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '-';
    }
}

function mostrarNotificacion(mensaje, tipo) {
    const notifAnterior = document.querySelector('.notificacion-flotante');
    if (notifAnterior) notifAnterior.remove();
    
    const notif = document.createElement('div');
    notif.className = 'notificacion-flotante';
    notif.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        font-family: 'Poppins', sans-serif;
        font-size: 0.9rem;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Agregar estilos de animación
const styleNotif = document.createElement('style');
styleNotif.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(styleNotif);

console.log("🌟 Admin.js cargado correctamente");