import { eventBus } from '../state/EventBus.js';
import { store } from '../state/Store.js';
import { SeatButton } from './SeatButton.js';
import '../styles/SeatMap.css';

// Zonas del teatro con sus filas
const ZONAS = [
  { titulo: 'Zona VIP', filas: ['A', 'B'] },
  { titulo: 'Zona Platea', filas: ['C', 'D', 'E'] },
  { titulo: 'Zona General', filas: ['F', 'G', 'H', 'I'] },
];

// Plano de sillas: se dibuja una vez y después solo se actualizan los botones
export class SeatMap {
  constructor(contenedor, onSeatClick) {
    this.contenedor = contenedor;
    this.onSeatClick = onSeatClick;
    this.botones = {}; // { 'A-1': SeatButton }
  }

  mount() {
    this.plano = document.createElement('div');
    this.plano.className = 'seat-map';
    this.contenedor.append(this.plano);

    eventBus.on('seats:changed', () => this.render());
    // Sin conexión no se puede bloquear: el plano se ve apagado y no responde
    eventBus.on('connection:changed', () => this.actualizarConexion());
    this.actualizarConexion();
    this.render();
  }

  actualizarConexion() {
    this.plano.classList.toggle('sin-conexion', !store.estaConectado());
  }

  render() {
    const seats = store.get('seats');
    if (seats.length === 0) return;

    // Primera vez: se crea todo el DOM
    if (Object.keys(this.botones).length === 0) {
      this.construir(seats);
      return;
    }
    // Después: solo se actualiza cada botón existente
    seats.forEach((seat) => {
      if (this.botones[seat.id]) this.botones[seat.id].actualizar(seat);
    });
  }

  construir(seats) {
    const escenario = document.createElement('div');
    escenario.className = 'escenario';
    escenario.textContent = '--- ESCENARIO ---';
    this.plano.append(escenario);

    ZONAS.forEach((zona) => {
      const titulo = document.createElement('h3');
      titulo.className = 'zona-titulo';
      titulo.textContent = zona.titulo;
      this.plano.append(titulo);

      zona.filas.forEach((fila) => {
        const filaDiv = document.createElement('div');
        filaDiv.className = 'seat-row';
        const letra = document.createElement('span');
        letra.className = 'seat-row-letra';
        letra.textContent = fila;
        filaDiv.append(letra);

        seats
          .filter((seat) => seat.row === fila)
          .sort((a, b) => a.number - b.number)
          .forEach((seat) => {
            const boton = new SeatButton(seat, this.onSeatClick);
            this.botones[seat.id] = boton;
            filaDiv.append(boton.elemento);
          });
        this.plano.append(filaDiv);
      });
    });
  }
}
