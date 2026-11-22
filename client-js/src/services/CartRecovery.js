import { BookingApi } from './BookingApi.js';
import { eventBus } from '../state/EventBus.js';
import { store } from '../state/Store.js';
import { getClientId } from '../utils/clientId.js';

// Al iniciar: pide al servidor las sillas que este cliente (clientId guardado
// en localStorage) todavía tiene bloqueadas y reconstruye el carrito con ellas.
export async function recuperarCarrito() {
  try {
    const sillas = await BookingApi.getMyLockedSeats(getClientId());

    // La expiración se calcula igual que en lockSeat: inicio del bloqueo + duración
    const carrito = sillas
      .map((seat) => ({
        seat: seat,
        expiresAt: seat.lockTimestamp.toNumber() + seat.lockDurationSeconds.toNumber() * 1000,
      }))
      .filter((item) => item.expiresAt > Date.now()); // descarta las ya vencidas

    store.setCart(carrito);
    if (carrito.length > 0) {
      eventBus.emit('aviso', `Recuperamos tu selección: ${carrito.length} silla(s).`);
    }
  } catch (error) {
    console.error('No se pudo recuperar el carrito:', error);
  }
}
