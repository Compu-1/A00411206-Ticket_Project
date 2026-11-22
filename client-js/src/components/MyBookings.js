import { eventBus } from '../state/EventBus.js';
import { store } from '../state/Store.js';
import { BookingApi } from '../services/BookingApi.js';
import { mensajeDeError } from '../services/errorMapper.js';
import { getClientId } from '../utils/clientId.js';
import { formatPrice } from '../utils/format.js';
import { notificar } from '../utils/notificar.js';
import '../styles/MyBookings.css';

// Ventana "Mis reservas": lista las compras confirmadas de este cliente.
// Se abre con eventBus.emit('reservas:abrir') y se recarga tras cada compra exitosa.
export class MyBookings {
  constructor(contenedor) {
    this.contenedor = contenedor;
    this.abierto = false;
  }

  mount() {
    this.fondo = document.createElement('div');
    this.fondo.className = 'reservas-fondo';
    this.fondo.hidden = true;

    const caja = document.createElement('div');
    caja.className = 'reservas-caja';

    const barra = document.createElement('div');
    barra.className = 'reservas-barra';
    const titulo = document.createElement('h2');
    titulo.textContent = 'Mis reservas';
    const cerrar = document.createElement('button');
    cerrar.textContent = 'X';
    cerrar.addEventListener('click', () => this.cerrar());
    barra.append(titulo, cerrar);

    this.mensaje = document.createElement('p');
    this.mensaje.className = 'reservas-mensaje';
    this.lista = document.createElement('ul');
    this.lista.className = 'reservas-lista';

    caja.append(barra, this.mensaje, this.lista);
    this.fondo.append(caja);
    this.contenedor.append(this.fondo);

    eventBus.on('reservas:abrir', () => this.abrir());
    eventBus.on('bookings:changed', () => this.render());
    // Después de comprar, la lista se actualiza aunque la ventana esté cerrada
    eventBus.on('checkout:exito', () => this.cargar());
  }

  abrir() {
    this.abierto = true;
    this.fondo.hidden = false;
    this.cargar();
  }

  cerrar() {
    this.abierto = false;
    this.fondo.hidden = true;
  }

  // Pide las reservas al servidor; el Store solo cambia si la respuesta fue exitosa
  async cargar() {
    this.mensaje.textContent = 'Cargando...';
    try {
      const reservas = await BookingApi.getMyBookings(getClientId());
      store.setBookings(reservas);
    } catch (error) {
      console.error('Error al cargar reservas:', error);
      notificar(mensajeDeError(error), 'error');
      this.mensaje.textContent = 'No se pudieron cargar las reservas.';
    }
  }

  render() {
    // Más recientes primero
    const reservas = [...store.get('bookings')].sort(
      (a, b) => b.timestamp.toNumber() - a.timestamp.toNumber()
    );
    this.mensaje.textContent = reservas.length === 0 ? 'Aún no tienes reservas confirmadas.' : '';
    this.lista.replaceChildren();

    reservas.forEach((reserva) => {
      const li = document.createElement('li');
      li.className = 'reserva';

      const codigo = document.createElement('strong');
      codigo.textContent = reserva.bookingCode;
      const sillas = document.createElement('span');
      sillas.textContent = 'Sillas: ' + reserva.seatIds.join(', ');
      const total = document.createElement('span');
      total.textContent = 'Total: ' + formatPrice(reserva.totalAmount);
      const fecha = document.createElement('span');
      fecha.className = 'reserva-fecha';
      fecha.textContent = new Date(reserva.timestamp.toNumber()).toLocaleString('es-CO');

      li.append(codigo, sillas, total, fecha);
      this.lista.append(li);
    });
  }
}
