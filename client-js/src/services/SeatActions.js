import { BookingApi } from './BookingApi.js';
import { seatPolling } from './SeatPolling.js';
import { eventBus } from '../state/EventBus.js';
import { store } from '../state/Store.js';
import { getClientId } from '../utils/clientId.js';
import { BookingApp } from './ConnectionManager.js';

function avisar(texto) {
  eventBus.emit('aviso', texto);
}

// Se llama al hacer clic en una silla. "estado" viene de SeatButton:
// 'disponible' | 'mia' | 'otro' | 'vendida'
export async function clicEnSilla(seat, estado) {
  // Solo las sillas disponibles llaman al serv
  // idor
  if (estado === 'vendida') {
    avisar(`La silla ${seat.id} ya está vendida.`);
    return;
  }
  if (estado === 'otro') {
    avisar(`La silla ${seat.id} está bloqueada por otro cliente.`);
    return;
  }
  if (estado === 'mia') {
    avisar(`Ya tienes seleccionada la silla ${seat.id}.`);
    return;
  }

  try {
    const resultado = await BookingApi.lockSeat(seat.id, getClientId());
    if (!resultado.success) {
      avisar(resultado.message);
    } else {
      // Guarda la silla en el carrito con su hora de expiración
      const carrito = store.get('cart').filter((item) => item.seat.id !== seat.id);
      carrito.push({ seat: seat, expiresAt: resultado.expiresAt.toNumber() });
      store.setCart(carrito);
      avisar(`Silla ${seat.id} bloqueada por 90 segundos.`);
    }
  } catch (error) {
    if (error instanceof BookingApp.SeatNotAvailableException) {
      avisar(`La silla ${seat.id} ya fue tomada por otro cliente.`);
    } else {
      console.error('Error al bloquear:', error);
      avisar('No se pudo bloquear la silla. Intenta de nuevo.');
    }
  }
  // En todos los casos se refresca el plano para ver el estado real
  seatPolling.refrescar();
}
