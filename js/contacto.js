import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
const contactForm = document.getElementById('contactForm');
const btnEnviar = document.getElementById('btnEnviar');
const mensajeEstado = document.getElementById('mensajeEstado');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validarFormulario()) {
            return;
        }
        setLoading(true);
        ocultarMensaje();
        const formData = {
            nombre: document.getElementById('contactNombre').value.trim(),
            email: document.getElementById('contactEmail').value.trim(),
            telefono: document.getElementById('contactTelefono').value.trim(),
            asunto: document.getElementById('contactAsunto').value,
            mensaje: document.getElementById('contactMensaje').value.trim(),
            newsletter: document.getElementById('contactNewsletter').checked,
            fecha: serverTimestamp(),
            estado: 'nuevo'
        };
        
        try {
            // Guardar en Firestore
            await addDoc(collection(db, "contactos"), formData);
            
            // Éxito
            mostrarMensaje('success', '✓ Mensaje enviado exitosamente. Te contactaremos pronto.');
            contactForm.reset();
            
            // Enviar email con EmailJS (opcional)
            await enviarEmailNotificacion(formData);
            
        } catch (error) {
            console.error('Error al enviar:', error);
            mostrarMensaje('error', '⚠ Error al enviar el mensaje. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    });
}

// ============================================
// VALIDACIÓN
// ============================================
function validarFormulario() {
    const nombre = document.getElementById('contactNombre').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const mensaje = document.getElementById('contactMensaje').value.trim();
    
    // Validar nombre
    if (nombre.length < 3) {
        mostrarMensaje('error', '⚠ El nombre debe tener al menos 3 caracteres');
        document.getElementById('contactNombre').focus();
        return false;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        mostrarMensaje('error', '⚠ Ingresa un correo electrónico válido');
        document.getElementById('contactEmail').focus();
        return false;
    }
    
    // Validar mensaje
    if (mensaje.length < 10) {
        mostrarMensaje('error', '⚠ El mensaje debe tener al menos 10 caracteres');
        document.getElementById('contactMensaje').focus();
        return false;
    }
    
    return true;
}
async function enviarEmailNotificacion(data) {
    try {
        if (typeof emailjs === 'undefined') {
            console.log('EmailJS no configurado');
            return;
        }
        
        const templateParams = {
            to_name: 'Inti Raymi Restaurant',
            from_name: data.nombre,
            from_email: data.email,
            telefono: data.telefono || 'No proporcionado',
            asunto: data.asunto,
            message: data.mensaje,
            reply_to: data.email
        };
        
        await emailjs.send(
            'service_0z6lp49', 
            'template_inlbxge', 
            templateParams
        );
        
        console.log('Email de notificación enviado');
    } catch (error) {
        console.error('Error enviando email:', error);
    }
}

// ============================================
// UI HELPERS
// ============================================
function setLoading(loading) {
    if (btnEnviar) {
        if (loading) {
            btnEnviar.disabled = true;
            btnEnviar.classList.add('loading');
        } else {
            btnEnviar.disabled = false;
            btnEnviar.classList.remove('loading');
        }
    }
}

function mostrarMensaje(tipo, texto) {
    if (mensajeEstado) {
        mensajeEstado.className = `mensaje-estado ${tipo}`;
        mensajeEstado.textContent = texto;
        mensajeEstado.style.display = 'block';
        
        // Auto-ocultar después de 5 segundos si es éxito
        if (tipo === 'success') {
            setTimeout(() => {
                ocultarMensaje();
            }, 5000);
        }
    }
}

function ocultarMensaje() {
    if (mensajeEstado) {
        mensajeEstado.style.display = 'none';
        mensajeEstado.className = 'mensaje-estado';
    }
}

// ============================================
// ANIMACIONES DE ENTRADA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const elementos = document.querySelectorAll('.info-item, .form-group');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    }, { threshold: 0.1 });
    
    elementos.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
});

// ============================================
// MÁSCARA DE TELÉFONO
// ============================================
const telefonoInput = document.getElementById('contactTelefono');
if (telefonoInput) {
    telefonoInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 10) value = value.slice(0, 10);
        
        // Formato: 999 999 999
        if (value.length >= 6) {
            value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6);
        } else if (value.length >= 3) {
            value = value.slice(0, 3) + ' ' + value.slice(3);
        }
        
        e.target.value = value;
    });
}

console.log('📧 Sistema de contacto cargado');