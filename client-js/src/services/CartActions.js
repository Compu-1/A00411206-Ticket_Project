import { BookingApi } from './BookingApi.js';
import { seatPolling } from './SeatPolling.js';
import { eventBus } from '../state/EventBus.js';
import { store } from '../state/Store.js';
import { getClientId } from '../utils/clientId.js';

function avisar(texto) {
  eventBus.emit('aviso', texto);
}

// Quita una silla del carrito, pero solo si el servidor confirma la liberación
export async function quitarSilla(seatId) {
  try {
    const liberada = await BookingApi.releaseSeat(seatId, getClientId());
    if (liberada) {
      const carrito = store.get('cart').filter((item) => item.seat.id !== seatId);
      store.setCart(carrito);
      avisar(`Silla ${seatId} liberada.`);
    } else {
      avisar(`No se pudo liberar la silla ${seatId}.`);
    }
  } catch (error) {
    console.error('Error al liberar:', error);
    avisar('No se pudo liberar la silla. Intenta de nuevo.');
  }
  seatPolling.refrescar();
}

// Libera todas las sillas del carrito, una por una
export async function liberarTodas() {
  const ids = store.get('cart').map((item) => item.seat.id);
  for (const id of ids) {
    await quitarSilla(id);
  }
}
