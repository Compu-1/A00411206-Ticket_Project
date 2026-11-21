import { eventBus } from '../state/EventBus.js';
import { store } from '../state/Store.js';

// Componente raíz: dibuja el encabezado y se actualiza cuando cambia el estado.
// Aquí se montarán después el plano de sillas (Sprint 3) y el carrito (Sprint 4).
export class App {
  constructor(contenedor) {
    this.contenedor = contenedor;
  }

  // Crea la estructura básica y se suscribe a los cambios del Store
  mount() {
    this.titulo = document.createElement('h1');
    this.conexion = document.createElement('div');
    this.conexion.className = 'estado-conexion';

    const header = document.createElement('header');
    header.className = 'app-header';
    header.append(this.titulo, this.conexion);

    this.main = document.createElement('main');
    this.main.className = 'app-main';

    this.contenedor.append(header, this.main);

    eventBus.on('event:changed', () => this.renderEvento());
    eventBus.on('connection:changed', () => this.renderConexion());

    this.renderEvento();
    this.renderConexion();
  }

  renderEvento() {
    const event = store.get('event');
    this.titulo.textContent = event ? event.name : 'Icesi Live Arena';
    if (event) {
      this.main.textContent = `${event.venue} - ${event.date} - ` +
        `${event.availableSeats}/${event.totalSeats} sillas disponibles`;
    }
  }

  renderConexion() {
    this.conexion.textContent = 'Conexión: ' + store.get('connection');
  }
}
