// ============================================
// MENÚ - CARRITO Y PEDIDOS
// ============================================

import { currentUser, crearPedido } from './firebase-config.js';

// ============================================
// VARIABLES
// ============================================
let cart = [];
let currentCategory = 'platos';

// ============================================
// TABS DEL MENÚ
// ============================================
const menuTabs = document.querySelectorAll('.menu-tab');
const menuSections = document.querySelectorAll('.menu-section');

menuTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const category = tab.dataset.category;
        currentCategory = category;
        
        menuTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        menuSections.forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(category).classList.add('active');
    });
});

// ============================================
// CARRITO
// ============================================
const cartFloating = document.getElementById('cartFloating');
const cartCount = document.getElementById('cartCount');
const btnVerPedido = document.getElementById('btnVerPedido');
const modalPedido = document.getElementById('modalPedido');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const btnHacerPedido = document.getElementById('btnHacerPedido');

document.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.dataset.item;
        const price = parseFloat(btn.dataset.price);
        
        const existingItem = cart.find(i => i.nombre === item);
        if (existingItem) {
            existingItem.cantidad++;
        } else {
            cart.push({
                nombre: item,
                precio: price,
                cantidad: 1
            });
        }
        
        actualizarBoton(btn, item);
        actualizarCarrito();
        mostrarNotificacion(`${item} agregado al pedido`);
    });
});

function actualizarBoton(btn, itemNombre) {
    const itemEnCarrito = cart.find(i => i.nombre === itemNombre);
    const cantidadSpan = btn.querySelector('.cantidad');
    const textoSpan = btn.querySelector('.texto-btn');
    
    if (itemEnCarrito) {
        btn.classList.add('has-items');
        cantidadSpan.textContent = itemEnCarrito.cantidad;
        textoSpan.textContent = 'Agregado';
    } else {
        btn.classList.remove('has-items');
        cantidadSpan.textContent = '0';
        textoSpan.textContent = 'Agregar';
    }
}

function actualizarCarrito() {
    const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
    const totalPrecio = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    cartCount.textContent = totalItems;
    cartTotal.textContent = totalPrecio.toFixed(2);
    
    if (totalItems > 0) {
        cartFloating.classList.remove('hidden');
    } else {
        cartFloating.classList.add('hidden');
    }
    
    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div>
                <strong>${item.nombre}</strong>
                <p>$ ${item.precio.toFixed(2)} MXN x ${item.cantidad}</p>
            </div>
            <div>
                <span>$ ${(item.precio * item.cantidad).toFixed(2)} MXN</span>
                <button onclick="modificarCantidad(${index}, -1)" style="margin-left:10px;color:#f44336;border:none;background:none;cursor:pointer;font-size:1.2rem;">−</button>
                <button onclick="modificarCantidad(${index}, 1)" style="color:#4CAF50;border:none;background:none;cursor:pointer;font-size:1.2rem;">+</button>
                <button onclick="eliminarDelCarrito(${index})" style="margin-left:10px;color:#f44336;border:none;background:none;cursor:pointer;">🗑️</button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.btn-add').forEach(btn => {
        const itemName = btn.dataset.item;
        actualizarBoton(btn, itemName);
    });
}

window.modificarCantidad = function(index, cambio) {
    cart[index].cantidad += cambio;
    if (cart[index].cantidad <= 0) {
        cart.splice(index, 1);
    }
    actualizarCarrito();
};

window.eliminarDelCarrito = function(index) {
    cart.splice(index, 1);
    actualizarCarrito();
};

if (btnVerPedido) {
    btnVerPedido.addEventListener('click', () => {
        modalPedido.classList.add('active');
    });
}

document.querySelectorAll('.modal .close').forEach(close => {
    close.addEventListener('click', () => {
        modalPedido.classList.remove('active');
    });
});

modalPedido.addEventListener('click', (e) => {
    if (e.target === modalPedido) {
        modalPedido.classList.remove('active');
    }
});

if (btnHacerPedido) {
    btnHacerPedido.addEventListener('click', async () => {
        if (!currentUser) {
            alert('Debes iniciar sesión para hacer un pedido');
            window.location.href = 'login.html';
            return;
        }
        
        if (cart.length === 0) {
            alert('Tu carrito está vacío');
            return;
        }
        
        try {
            const total = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
            
            const pedidoData = {
                items: cart,
                total: total,
                estado: 'pendiente'
            };
            
            await crearPedido(pedidoData);
            
            cart = [];
            actualizarCarrito();
            modalPedido.classList.remove('active');
            
            mostrarNotificacion('¡Pedido realizado con éxito!');
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al realizar el pedido');
        }
    });
}

function mostrarNotificacion(mensaje) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #722F37 0%, #4A1C23 100%);
        color: #C9A962;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.4);
        z-index: 3000;
        animation: slideInRight 0.4s ease;
        font-weight: 500;
        letter-spacing: 1px;
        border: 1px solid #C9A962;
    `;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notif.remove(), 400);
    }, 3000);
}

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
    .cart-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #eee;
    }
    .cart-item:last-child { border-bottom: none; }
    .cart-total {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 2px solid #C9A962;
        text-align: right;
        font-size: 1.3rem;
        color: #722F37;
    }
`;
document.head.appendChild(style);