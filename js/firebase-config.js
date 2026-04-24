import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, query, where, onSnapshot, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC_Q5WigKrNtsNBYl_VCtUVJZh0-EqkaxI",
    authDomain: "baseuno.firebaseapp.com",
    projectId: "baseuno",
    storageBucket: "baseuno.firebasestorage.app",
    messagingSenderId: "543622478506",
    appId: "1:543622478506:web:d450e1e1048e2108f7eed3",
    measurementId: "G-6DC4Z1E1R5"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ============================================
// VARIABLES GLOBALES
// ============================================
export let currentUser = null;
export let userRole = null;

// ============================================
// FUNCIONES DE AUTENTICACIÓN
// ============================================

// Guardar datos de usuario en Firestore
export async function guardarUsuario(userData) {
    try {
        await setDoc(doc(db, "usuarios", userData.uid), {
            nombre: userData.nombre,
            email: userData.email,
            telefono: userData.telefono || '',
            rol: userData.rol || 'cliente',
            fechaRegistro: new Date(),
            activo: true
        });
        return true;
    } catch (error) {
        console.error("Error guardando usuario:", error);
        return false;
    }
}

// Obtener rol del usuario
export async function obtenerRol(uid) {
    try {
        const docRef = doc(db, "usuarios", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().rol;
        }
        return 'cliente';
    } catch (error) {
        console.error("Error obteniendo rol:", error);
        return 'cliente';
    }
}

// Verificar estado de autenticación
export function verificarAuth(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            userRole = await obtenerRol(user.uid);
            actualizarUIAuth();
            if (callback) callback(user, userRole);
        } else {
            currentUser = null;
            userRole = null;
            actualizarUIAuth();
            if (callback) callback(null, null);
        }
    });
}

// Actualizar UI según estado de auth
function actualizarUIAuth() {
    const authLinks = document.getElementById('authLinks');
    if (!authLinks) return;
    
    if (currentUser) {
        authLinks.innerHTML = `
            <div class="user-menu" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span style="color: white; font-size: 0.9rem;">👤 ${currentUser.displayName || currentUser.email}</span>
                <button id="btnLogout" class="btn-small" style="background: transparent; border: 1px solid white; color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Salir</button>
            </div>
        `;
        
        setTimeout(() => {
            const btnLogout = document.getElementById('btnLogout');
            if (btnLogout) {
                btnLogout.addEventListener('click', () => {
                    signOut(auth).then(() => {
                        window.location.href = 'index.html';
                    });
                });
            }
        }, 100);
    } else {
        authLinks.innerHTML = `<a href="login.html" class="btn-login">Ingresar</a>`;
    }
}

// ============================================
// FUNCIONES DE RESERVAS
// ============================================

export async function crearReserva(reservaData) {
    try {
        const reservaRef = await addDoc(collection(db, "reservas"), {
            ...reservaData,
            userId: currentUser?.uid || auth.currentUser?.uid,
            userEmail: currentUser?.email || auth.currentUser?.email,
            userNombre: currentUser?.displayName || auth.currentUser?.email || 'Cliente',
            estado: 'confirmada',
            fechaCreacion: new Date()
        });
        return { id: reservaRef.id, ...reservaData };
    } catch (error) {
        console.error("Error creando reserva:", error);
        throw error;
    }
}

export function escucharMisReservas(callback) {
    if (!currentUser && !auth.currentUser) return;
    const userId = currentUser?.uid || auth.currentUser?.uid;
    
    const q = query(
        collection(db, "reservas"),
        where("userId", "==", userId)
    );
    
    return onSnapshot(q, (snapshot) => {
        const reservas = [];
        snapshot.forEach((doc) => {
            reservas.push({ id: doc.id, ...doc.data() });
        });
        callback(reservas);
    });
}

export function escucharTodasReservas(callback) {
    const q = query(collection(db, "reservas"));
    
    return onSnapshot(q, (snapshot) => {
        const reservas = [];
        snapshot.forEach((doc) => {
            reservas.push({ id: doc.id, ...doc.data() });
        });
        callback(reservas);
    });
}

// ============================================
// FUNCIONES DE MESAS
// ============================================

export async function actualizarEstadoMesa(mesaId, estado, reservaId = null) {
    try {
        await setDoc(doc(db, "mesas", mesaId), {
            estado: estado,
            reservaId: reservaId,
            actualizado: new Date()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Error actualizando mesa:", error);
        return false;
    }
}

export function escucharMesas(callback) {
    return onSnapshot(collection(db, "mesas"), (snapshot) => {
        const mesas = {};
        snapshot.forEach((doc) => {
            mesas[doc.id] = doc.data();
        });
        callback(mesas);
    });
}

// ============================================
// FUNCIONES DE PEDIDOS
// ============================================

export async function crearPedido(pedidoData) {
    try {
        const pedidoRef = await addDoc(collection(db, "pedidos"), {
            ...pedidoData,
            userId: currentUser?.uid || auth.currentUser?.uid,
            userEmail: currentUser?.email || auth.currentUser?.email,
            estado: 'pendiente',
            fechaCreacion: new Date()
        });
        return { id: pedidoRef.id, ...pedidoData };
    } catch (error) {
        console.error("Error creando pedido:", error);
        throw error;
    }
}

export function escucharMisPedidos(callback) {
    if (!currentUser && !auth.currentUser) return;
    const userId = currentUser?.uid || auth.currentUser?.uid;
    
    const q = query(
        collection(db, "pedidos"),
        where("userId", "==", userId)
    );
    
    return onSnapshot(q, (snapshot) => {
        const pedidos = [];
        snapshot.forEach((doc) => {
            pedidos.push({ id: doc.id, ...doc.data() });
        });
        callback(pedidos);
    });
}

export function escucharTodosPedidos(callback) {
    return onSnapshot(collection(db, "pedidos"), (snapshot) => {
        const pedidos = [];
        snapshot.forEach((doc) => {
            pedidos.push({ id: doc.id, ...doc.data() });
        });
        callback(pedidos);
    });
}

// ============================================
// INICIALIZACIÓN
// ============================================
verificarAuth((user, role) => {
    console.log("🌞 Inti Raymi - Auth verificado:", user ? user.email : "Sin sesión", "Rol:", role);
});