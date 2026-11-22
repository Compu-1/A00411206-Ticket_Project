import { eventBus } from '../state/EventBus.js';
import { store } from '../state/Store.js';
import { BookingApi } from '../services/BookingApi.js';
import { seatPolling } from '../services/SeatPolling.js';
import { getClientId } from '../utils/clientId.js';
import { formatPrice } from '../utils/format.js';
import { nombreValido, correoValido } from '../utils/validators.js';
import { Receipt } from './Receipt.js';
import '../styles/CheckoutModal.css';

// Modal de compra: resumen + formulario. Si todo sale bien muestra el comprobante.
// Se abre con eventBus.emit('checkout:abrir')
export class CheckoutModal {
  constructor(contenedor) {
    this.contenedor = contenedor;
    this.reloj = null;
    this.enFormulario = false;
  }

  mount() {
    this.fondo = document.createElement('div');
    this.fondo.className = 'modal-fondo';
    this.fondo.hidden = true;

    this.caja = document.createElement('div');
    this.caja.className = 'modal-caja';
    this.fondo.append(this.caja);
    this.contenedor.append(this.fondo);

    eventBus.on('checkout:abrir', () => this.abrir());
    // Si el carrito se vacía (por expiración) con el formulario abierto, se cierra
    eventBus.on('cart:changed', () => {
      if (this.enFormulario && store.get('cart').length === 0) this.cerrar();
    });
  }

  abrir() {
    if (store.get('cart').length === 0) return;
    this.enFormulario = true;
    this.dibujarFormulario();
    this.fondo.hidden = false;
    // El tiempo restante se actualiza cada segundo mientras el modal está abierto
    clearInterval(this.reloj);
    this.reloj = setInterval(() => this.actualizarTiempo(), 1000);
  }

  cerrar() {
    this.fondo.hidden = true;
    this.enFormulario = false;
    clearInterval(this.reloj);
  }

  // Tiempo hasta que venza la silla más próxima
  textoTiempo() {
    const carrito = store.get('cart');
    if (carrito.length === 0) return '';
    const vence = Math.min(...carrito.map((item) => item.expiresAt));
    const seg = Math.max(0, Math.ceil((vence - Date.now()) / 1000));
    const mm = String(Math.floor(seg / 60)).padStart(2, '0');
    const ss = String(seg % 60).padStart(2, '0');
    return `Retención activa: ${mm}:${ss} restantes`;
  }

  actualizarTiempo() {
    if (this.tiempo) this.tiempo.textContent = this.textoTiempo();
  }

  dibujarFormulario() {
    const carrito = store.get('cart');
    const total = carrito.reduce((suma, item) => suma + item.seat.price, 0);

    this.caja.replaceChildren();

    // Barra superior con la X para cerrar
    const barra = document.createElement('div');
    barra.className = 'modal-barra';
    const flujo = document.createElement('span');
    flujo.textContent = 'Flujo: Modal de Confirmación';
    const equis = document.createElement('button');
    equis.type = 'button';
    equis.className = 'modal-cerrar';
    equis.textContent = 'X';
    equis.addEventListener('click', () => this.cerrar());
    barra.append(flujo, equis);

    const titulo = document.createElement('h2');
    titulo.textContent = 'Datos del Comprador';

    const subtitulo = document.createElement('p');
    subtitulo.className = 'modal-subtitulo';
    subtitulo.textContent = 'Ingrese su información para emitir el boleto.';

    // Cuadro gris: sillas, valor total y tiempo que queda
    const resumen = document.createElement('div');
    resumen.className = 'modal-resumen';
    const sillas = document.createElement('p');
    sillas.textContent =
      `Sillas: ${carrito.map((item) => item.seat.id).join(', ')} · Valor total: ${formatPrice(total)}`;
    this.tiempo = document.createElement('p');
    this.tiempo.className = 'modal-tiempo';
    this.tiempo.textContent = this.textoTiempo();
    resumen.append(sillas, this.tiempo);

    const form = document.createElement('form');
    form.noValidate = true;

    const nombre = this.crearCampo('Nombre Completo:', 'text', 'Estudiante Icesi', form);
    const correo = this.crearCampo('Correo Electrónico:', 'email', 'estudiante@u.icesi.edu.co', form);

    // Zona de mensajes (errores de validación o del servidor)
    this.mensaje = document.createElement('p');
    this.mensaje.className = 'modal-error';

    this.botonPagar = document.createElement('button');
    this.botonPagar.type = 'submit';
    this.botonPagar.className = 'modal-pagar';
    this.botonPagar.textContent = 'Finalizar y Pagar';

    const cancelar = document.createElement('button');
    cancelar.type = 'button';
    cancelar.textContent = 'Volver al Plano';
    cancelar.addEventListener('click', () => this.cerrar());

    form.append(this.mensaje, this.botonPagar, cancelar);
    form.addEventListener('submit', (evento) => {
      evento.preventDefault();
      this.enviar(nombre.value, correo.value);
    });

    this.caja.append(barra, titulo, subtitulo, resumen, form);
  }

  // Crea una etiqueta con su input y devuelve el input
  crearCampo(texto, tipo, ejemplo, form) {
    const etiqueta = document.createElement('label');
    etiqueta.textContent = texto;
    const input = document.createElement('input');
    input.type = tipo;
    input.placeholder = ejemplo;
    etiqueta.append(input);
    form.append(etiqueta);
    return input;
  }

  async enviar(nombre, correo) {
    if (!nombreValido(nombre)) {
      this.mensaje.textContent = 'Escribe tu nombre completo.';
      return;
    }
    if (!correoValido(correo)) {
      this.mensaje.textContent = 'Escribe un correo válido (ej: nombre@correo.com).';
      return;
    }

    this.mensaje.textContent = '';
    this.botonPagar.disabled = true; // evita doble envío mientras responde el servidor
    const ids = store.get('cart').map((item) => item.seat.id);

    try {
      const resultado = await BookingApi.confirmBooking(ids, getClientId(), nombre.trim(), correo.trim());
      if (resultado.success) {
        this.mostrarComprobante(resultado);
      } else {
        this.mensaje.textContent = resultado.message;
        this.botonPagar.disabled = false;
      }
    } catch (error) {
      // Las excepciones Slice (InvalidBooking, Booking, LockExpired) traen "reason"
      console.error('Error al confirmar:', error);
      this.mensaje.textContent = error.reason || 'No se pudo confirmar la reserva. Intenta de nuevo.';
      this.botonPagar.disabled = false;
    }
    // Pase lo que pase, se refresca el plano para ver el estado real
    seatPolling.refrescar();
  }

  mostrarComprobante(resultado) {
    this.enFormulario = false;
    clearInterval(this.reloj);
    store.setCart([]); // las sillas ya fueron compradas, el carrito queda vacío

    const volver = document.createElement('button');
    volver.textContent = 'Volver al Plano';
    volver.addEventListener('click', () => this.cerrar());

    this.caja.replaceChildren(new Receipt(resultado).crear(), volver);
  }
}
