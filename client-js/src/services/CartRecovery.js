import { BookingApi } from './BookingApi.js';
import { notificar } from '../utils/notificar.js';
import { store } from '../state/Store.js';
import { getClientId } from '../utils/clientId.js';

// Convierte las sillas que el servidor dice que son mías en elementos del carrito.
// La expiración se calcula igual que en lockSeat: inicio del bloqueo + duración.
export function construirCarrito(sillas) {
  return sillas
    .map((seat) => ({
      seat: seat,
      expiresAt: seat.lockTimestamp.toNumber() + seat.lockDurationSeconds.toNumber() * 1000,
    }))
    .filter((item) => item.expiresAt > Date.now()); // descarta las ya vencidas
}

// Al iniciar: pide al servidor las sillas que este cliente (clientId guardado
// en localStorage) todavía tiene bloqueadas y reconstruye el carrito con ellas.
export async function recuperarCarrito() {
  try {
    const sillas = await BookingApi.getMyLockedSeats(getClientId());
    const carrito = construirCarrito(sillas);
    store.setCart(carrito);
    if (carrito.length > 0) {
      notificar(`Recuperamos tu selección: ${carrito.length} silla(s).`, 'aviso');
    }
  } catch (error) {
    console.error('No se pudo recuperar el carrito:', error);
  }
}
