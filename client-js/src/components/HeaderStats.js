import { eventBus } from '../state/EventBus.js';
import { store } from '../state/Store.js';
import { formatPrice } from '../utils/format.js';
import '../styles/HeaderStats.css';

// Encabezado: datos del evento, precios por zona, contadores y estado de conexión
export class HeaderStats {
  constructor(contenedor) {
    this.contenedor = contenedor;
  }

  // Crea los elementos una sola vez y se suscribe al Store
  mount() {
    this.header = document.createElement('header');
    this.header.className = 'header-stats';

    // Lado izquierdo: nombre, detalle y precios
    const info = document.createElement('div');
    info.className = 'header-info';
    this.titulo = document.createElement('h1');
    this.detalle = document.createElement('p');
    this.detalle.className = 'header-detalle';
    this.precios = document.createElement('p');
    this.precios.className = 'header-precios';
    info.append(this.titulo, this.detalle, this.precios);

    // Lado derecho: cuatro cajas (disponibles, retenidas, ocupadas, estado)
    const cajas = document.createElement('div');
    cajas.className = 'header-cajas';
    this.disponibles = this.crearCaja('Disponibles', cajas);
    this.retenidas = this.crearCaja('Retenidas', cajas);
    this.ocupadas = this.crearCaja('Ocupadas', cajas);
    this.estado = this.crearCaja('Estado', cajas);

    this.header.append(info, cajas);
    this.contenedor.append(this.header);

    eventBus.on('event:changed', () => this.renderEvento());
    eventBus.on('connection:changed', () => this.renderConexion());

    this.renderEvento();
    this.renderConexion();
  }

  // Crea una caja con rótulo y valor; devuelve el elemento del valor
  crearCaja(rotulo, padre) {
    const caja = document.createElement('div');
    caja.className = 'stat-caja';
    const etiqueta = document.createElement('span');
    etiqueta.className = 'stat-rotulo';
    etiqueta.textContent = rotulo;
    const valor = document.createElement('strong');
    valor.className = 'stat-valor';
    valor.textContent = '-';
    caja.append(etiqueta, valor);
    padre.append(caja);
    return valor;
  }

  renderEvento() {
    const event = store.get('event');
    if (!event) {
      this.titulo.textContent = 'Icesi Live Arena';
      return;
    }
    this.titulo.textContent = event.name;
    this.detalle.textContent =
      `${event.date} · ${event.venue} · Aforo total: ${event.totalSeats} sillas`;
    this.precios.textContent =
      `VIP ${formatPrice(event.vipPrice)} · Platea ${formatPrice(event.plateaPrice)} · ` +
      `General ${formatPrice(event.generalPrice)}`;
    this.disponibles.textContent = event.availableSeats;
    this.retenidas.textContent = event.lockedSeats;
    this.ocupadas.textContent = event.bookedSeats;
  }

  // ONLINE solo cuando la conexión está 'conectado'
  renderConexion() {
    const online = store.get('connection') === 'conectado';
    this.estado.textContent = online ? 'ONLINE' : 'OFFLINE';
    this.estado.classList.toggle('offline', !online);
  }
}
