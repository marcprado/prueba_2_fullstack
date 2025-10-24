// Funciones para el manejo del carrito
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

// Función para actualizar el contador del carrito
function actualizarContadorCarrito() {
    const contador = document.querySelector('.carrito-contador');
    if (contador) {
        contador.textContent = carrito.reduce((total, item) => total + item.cantidad, 0);
    }
}

// Función para agregar un producto al carrito
function agregarAlCarrito(id, nombre, precio) {
    // Buscar si el producto ya está en el carrito
    const productoExistente = carrito.find(item => item.id === id);
    
    if (productoExistente) {
        productoExistente.cantidad++;
    } else {
        carrito.push({
            id: id,
            nombre: nombre,
            precio: precio,
            cantidad: 1
        });
    }
    
    // Guardar en localStorage
    localStorage.setItem('carrito', JSON.stringify(carrito));
    
    // Mostrar notificación
    mostrarNotificacion(`${nombre} agregado al carrito`);
    
    // Actualizar contador
    actualizarContadorCarrito();
}

// Función para mostrar notificación
function mostrarNotificacion(mensaje) {
    const notificacion = document.createElement('div');
    notificacion.classList.add('notificacion');
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);
    
    // Eliminar la notificación después de 2 segundos
    setTimeout(() => {
        notificacion.remove();
    }, 2000);
}

// Función para calcular totales
function calcularTotales() {
    const subtotal = carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
    const iva = subtotal * 0.19;
    const total = subtotal + iva;
    
    // Actualizar elementos en la página
    if (document.getElementById('subtotal')) {
        document.getElementById('subtotal').textContent = formatearPrecio(subtotal);
        document.getElementById('iva').textContent = formatearPrecio(iva);
        document.getElementById('total').textContent = formatearPrecio(total);
    }
}

// Función para formatear precio
function formatearPrecio(precio) {
    return `$${precio.toLocaleString('es-CL')}`;
}

// Función para renderizar items del carrito
function renderizarCarrito() {
    const contenedor = document.querySelector('.carrito-items');
    if (!contenedor) return;
    
    if (carrito.length === 0) {
        contenedor.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío</p>';
        return;
    }
    
    contenedor.innerHTML = carrito.map(item => `
        <div class="carrito-item">
            <div class="item-info">
                <h3>${item.nombre}</h3>
                <p class="item-precio">${formatearPrecio(item.precio)}</p>
            </div>
            <div class="item-cantidad">
                <button class="btn-cantidad" onclick="actualizarCantidad(${item.id}, -1)">-</button>
                <span>${item.cantidad}</span>
                <button class="btn-cantidad" onclick="actualizarCantidad(${item.id}, 1)">+</button>
            </div>
            <button class="btn-eliminar" onclick="eliminarDelCarrito(${item.id})">Eliminar</button>
        </div>
    `).join('');
    
    calcularTotales();
}

// Función para actualizar cantidad
function actualizarCantidad(id, cambio) {
    const producto = carrito.find(item => item.id === id);
    if (producto) {
        producto.cantidad += cambio;
        if (producto.cantidad <= 0) {
            carrito = carrito.filter(item => item.id !== id);
        }
        localStorage.setItem('carrito', JSON.stringify(carrito));
        renderizarCarrito();
        actualizarContadorCarrito();
    }
}

// Función para eliminar del carrito
function eliminarDelCarrito(id) {
    carrito = carrito.filter(item => item.id !== id);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    renderizarCarrito();
    actualizarContadorCarrito();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Agregar contador del carrito al header
    const nav = document.querySelector('.nav-menu');
    if (nav) {
        const carritoLink = nav.querySelector('a[href="carrito.html"]').parentElement;
        const contador = document.createElement('span');
        contador.classList.add('carrito-contador');
        carritoLink.appendChild(contador);
    }
    
    // Inicializar contador
    actualizarContadorCarrito();
    
    // Renderizar carrito si estamos en la página del carrito
    if (window.location.href.includes('carrito.html')) {
        renderizarCarrito();
    }
    
    // Agregar event listeners a los botones de agregar al carrito
    document.querySelectorAll('.btn-agregar-carrito').forEach(button => {
        button.addEventListener('click', (e) => {
            const { id, nombre, precio } = e.target.dataset;
            agregarAlCarrito(parseInt(id), nombre, parseInt(precio));
        });
    });
});