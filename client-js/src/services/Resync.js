import { BookingApi } from './BookingApi.js';
import { construirCarrito } from './CartRecovery.js';
import { store } from '../state/Store.js';
import { getClientId } from '../utils/clientId.js';

// Vuelve a pedir TODO al servidor y reemplaza el estado local.
// Se usa tras un error y al reconectar. Devuelve true si funcionó.
export async function resincronizar() {
  try {
    const seats = await BookingApi.getAllSeats();
    const info = await BookingApi.getEventInfo();
    const mias = await BookingApi.getMyLockedSeats(getClientId());
    store.setSeats(seats);
    store.setEvent(info);
    store.setCart(construirCarrito(mias));
    return true;
  } catch (error) {
    console.error('No se pudo resincronizar:', error);
    return false;
  }
}
