import { getClientId } from '../utils/clientId.js';
import '../styles/SeatButton.css';

// Decide cómo se ve una silla: 'disponible' | 'mia' | 'otro' | 'vendida'
export function calcularEstado(seat) {
  const estado = seat.state.name; // 'AVAILABLE' | 'LOCKED' | 'BOOKED'
  if (estado === 'BOOKED') return 'vendida';
  if (estado === 'LOCKED') {
    // Un bloqueo vencido cuenta como disponible
    const vence = seat.lockTimestamp.toNumber() + seat.lockDurationSeconds.toNumber() * 1000;
    if (Date.now() > vence) return 'disponible';
    return seat.lockedByClientId === getClientId() ? 'mia' : 'otro';
  }
  return 'disponible';
}

const TEXTOS = {
  disponible: 'disponible',
  mia: 'seleccionada por ti',
  otro: 'bloqueada por otro',
  vendida: 'vendida',
};

// Un botón del plano. Se crea una vez y luego solo se actualiza su clase.
export class SeatButton {
  constructor(seat, onClick) {
    this.seat = seat;
    this.elemento = document.createElement('button');
    this.elemento.className = 'seat';
    this.elemento.textContent = seat.number;
    this.elemento.addEventListener('click', () => onClick(this.seat, this.estado));
    this.actualizar(seat);
  }

  // Cambia la clase y el texto de ayuda según los datos nuevos
  actualizar(seat) {
    this.seat = seat;
    this.estado = calcularEstado(seat);
    this.elemento.className = 'seat seat-' + this.estado;
    this.elemento.title = `${seat.id} - ${TEXTOS[this.estado]}`;
  }
}
