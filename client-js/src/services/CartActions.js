import { BookingApi } from './BookingApi.js';
import { resincronizar } from './Resync.js';
import { mensajeDeError, esErrorDeConexion } from './errorMapper.js';
import { store } from '../state/Store.js';
import { getClientId } from '../utils/clientId.js';
import { notificar } from '../utils/notificar.js';

// Quita una silla del carrito, pero solo si el servidor confirma la liberación
export async function quitarSilla(seatId) {
  if (!store.estaConectado()) {
    notificar('Sin conexión con el servidor.', 'error');
    return;
  }
  try {
    const liberada = await BookingApi.releaseSeat(seatId, getClientId());
    if (liberada) {
      const carrito = store.get('cart').filter((item) => item.seat.id !== seatId);
      store.setCart(carrito);
      notificar(`Silla ${seatId} liberada.`, 'exito');
    } else {
      notificar(`No se pudo liberar la silla ${seatId}.`, 'aviso');
    }
  } catch (error) {
    console.error('Error al liberar:', error);
    notificar(mensajeDeError(error), 'error');
    if (esErrorDeConexion(error)) return; // Reconnection resincroniza al volver
  }
  // Éxito o fallo: se pide el estado real al servidor (plano, contadores y carrito)
  await resincronizar();
}

// Libera todas las sillas del carrito, una por una
export async function liberarTodas() {
  const ids = store.get('cart').map((item) => item.seat.id);
  for (const id of ids) {
    await quitarSilla(id);
  }
}
