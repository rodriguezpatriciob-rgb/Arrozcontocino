import { auth, guardarUsuario, obtenerRol } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signInWithPopup, 
    GoogleAuthProvider,
    GithubAuthProvider,
    TwitterAuthProvider,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// ============================================
// ELEMENTOS DEL DOM
// ============================================
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabBtns = document.querySelectorAll('.tab-btn');
const loginError = document.getElementById('loginError');
const regError = document.getElementById('regError');

// Botones sociales
const btnGoogle = document.getElementById('btnGoogle');
const btnGithub = document.getElementById('btnGithub');
const btnTwitter = document.getElementById('btnTwitter');

// ============================================
// TABS CON ANIMACIÓN DE LUJO
// ============================================
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Actualizar tabs
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Mostrar formulario con animación
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        
        const targetForm = document.getElementById(tab === 'login' ? 'loginForm' : 'registerForm');
        targetForm.classList.add('active');
        
        // Efecto de transición suave
        targetForm.style.opacity = '0';
        targetForm.style.transform = 'translateY(20px)';
        setTimeout(() => {
            targetForm.style.transition = 'all 0.5s ease';
            targetForm.style.opacity = '1';
            targetForm.style.transform = 'translateY(0)';
        }, 50);
    });
});

// ============================================
// REGISTRO CON EMAIL
// ============================================
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        regError.textContent = '';
        
        const nombre = document.getElementById('regNombre').value;
        const email = document.getElementById('regEmail').value;
        const telefono = document.getElementById('regTelefono').value;
        const password = document.getElementById('regPassword').value;
        
        // Mostrar loading
        const btn = registerForm.querySelector('.btn-submit');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>Procesando...</span>';
        btn.disabled = true;
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await updateProfile(user, { displayName: nombre });
            
            await guardarUsuario({
                uid: user.uid,
                nombre: nombre,
                email: email,
                telefono: telefono,
                rol: 'cliente'
            });
            
            mostrarExito('Cuenta creada exitosamente');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            console.error("Error registro:", error);
            regError.textContent = traducirError(error.code);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// ============================================
// LOGIN CON EMAIL
// ============================================
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rolSeleccionado = document.querySelector('input[name="role"]:checked').value;
        
        // Mostrar loading
        const btn = loginForm.querySelector('.btn-submit');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>Verificando...</span>';
        btn.disabled = true;
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            const rolUsuario = await obtenerRol(user.uid);
            
            if (rolSeleccionado === 'admin' && rolUsuario !== 'admin') {
                loginError.textContent = 'No tienes permisos de administrador';
                await auth.signOut();
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
            
            mostrarExito('Bienvenido a Inti Raymi');
            setTimeout(() => {
                if (rolUsuario === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 1000);
            
        } catch (error) {
            console.error("Error login:", error);
            loginError.textContent = traducirError(error.code);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// ============================================
// LOGIN CON GOOGLE
// ============================================
if (btnGoogle) {
    btnGoogle.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        // Animación de carga
        btnGoogle.style.opacity = '0.7';
        btnGoogle.style.pointerEvents = 'none';
        
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            const rol = await obtenerRol(user.uid);
            if (!rol || rol === 'cliente') {
                await guardarUsuario({
                    uid: user.uid,
                    nombre: user.displayName,
                    email: user.email,
                    telefono: '',
                    rol: 'cliente'
                });
            }
            
            mostrarExito(`Bienvenido ${user.displayName || ''}`);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error("Error Google:", error);
            loginError.textContent = traducirError(error.code);
            btnGoogle.style.opacity = '1';
            btnGoogle.style.pointerEvents = 'auto';
        }
    });
}

// ============================================
// LOGIN CON GITHUB
// ============================================
if (btnGithub) {
    btnGithub.addEventListener('click', async () => {
        const provider = new GithubAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        btnGithub.style.opacity = '0.7';
        btnGithub.style.pointerEvents = 'none';
        
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            const rol = await obtenerRol(user.uid);
            if (!rol || rol === 'cliente') {
                await guardarUsuario({
                    uid: user.uid,
                    nombre: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    telefono: '',
                    rol: 'cliente'
                });
            }
            
            mostrarExito(`Bienvenido ${user.displayName || ''}`);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error("Error GitHub:", error);
            loginError.textContent = traducirError(error.code);
            btnGithub.style.opacity = '1';
            btnGithub.style.pointerEvents = 'auto';
        }
    });
}

// ============================================
// LOGIN CON TWITTER/X
// ============================================
if (btnTwitter) {
    btnTwitter.addEventListener('click', async () => {
        const provider = new TwitterAuthProvider();
        
        btnTwitter.style.opacity = '0.7';
        btnTwitter.style.pointerEvents = 'none';
        
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            const rol = await obtenerRol(user.uid);
            if (!rol || rol === 'cliente') {
                await guardarUsuario({
                    uid: user.uid,
                    nombre: user.displayName || user.email?.split('@')[0] || 'Usuario X',
                    email: user.email || '',
                    telefono: '',
                    rol: 'cliente'
                });
            }
            
            mostrarExito(`Bienvenido ${user.displayName || ''}`);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error("Error Twitter:", error);
            loginError.textContent = traducirError(error.code);
            btnTwitter.style.opacity = '1';
            btnTwitter.style.pointerEvents = 'auto';
        }
    });
}

// ============================================
// NOTIFICACIÓN DE ÉXITO DE LUJO
// ============================================
function mostrarExito(mensaje) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(201,169,98,0.95) 0%, rgba(154,123,61,0.95) 100%);
        color: var(--negro-mate);
        padding: 30px 50px;
        border-radius: 10px;
        font-family: var(--font-cuerpo);
        font-size: 1.1rem;
        font-weight: 500;
        letter-spacing: 2px;
        text-align: center;
        z-index: 10000;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        animation: scaleIn 0.5s ease;
        border: 1px solid rgba(255,255,255,0.2);
    `;
    notif.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 10px;">✦</div>
        <div>${mensaje}</div>
    `;
    document.body.appendChild(notif);
    
    // Sonido sutil (opcional)
    // const audio = new Audio('success.mp3');
    // audio.volume = 0.3;
    // audio.play();
}

// ============================================
// UTILIDADES
// ============================================
function traducirError(code) {
    const errores = {
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/invalid-email': 'Correo electrónico inválido',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/invalid-credential': 'Credenciales inválidas',
        'auth/popup-closed-by-user': 'Ventana cerrada por el usuario',
        'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este email',
        'auth/cancelled-popup-request': 'Operación cancelada',
        'auth/operation-not-allowed': 'Operación no permitida',
        'auth/invalid-api-key': 'Error de configuración',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet'
    };
    return errores[code] || 'Error en la autenticación. Intente nuevamente.';
}

// Efecto de entrada para inputs
document.querySelectorAll('.luxury-input input').forEach(input => {
    input.addEventListener('focus', () => {
        input.parentElement.style.transform = 'scale(1.02)';
    });
    
    input.addEventListener('blur', () => {
        input.parentElement.style.transform = 'scale(1)';
    });
});

console.log('🌟 Inti Raymi - Sistema de Autenticación de Lujo cargado');
