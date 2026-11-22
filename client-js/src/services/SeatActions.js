import { BookingApi } from './BookingApi.js';
import { seatPolling } from './SeatPolling.js';
import { resincronizar } from './Resync.js';
import { mensajeDeError, esErrorDeConexion } from './errorMapper.js';
import { store } from '../state/Store.js';
import { getClientId } from '../utils/clientId.js';
import { notificar } from '../utils/notificar.js';

// Se llama al hacer clic en una silla. "estado" viene de SeatButton:
// 'disponible' | 'mia' | 'otro' | 'vendida'
export async function clicEnSilla(seat, estado) {
  // Solo las sillas disponibles llaman al servidor
  if (estado === 'vendida') {
    notificar(`La silla ${seat.id} ya está vendida.`, 'aviso');
    return;
  }
  if (estado === 'otro') {
    notificar(`La silla ${seat.id} está bloqueada por otro cliente.`, 'aviso');
    return;
  }
  if (estado === 'mia') {
    notificar(`Ya tienes seleccionada la silla ${seat.id}.`, 'aviso');
    return;
  }
  if (!store.estaConectado()) {
    notificar('Sin conexión con el servidor.', 'error');
    return;
  }

  try {
    const resultado = await BookingApi.lockSeat(seat.id, getClientId());
    if (resultado.success) {
      // El carrito solo cambia después de la respuesta exitosa del servidor
      const carrito = store.get('cart').filter((item) => item.seat.id !== seat.id);
      carrito.push({ seat: seat, expiresAt: resultado.expiresAt.toNumber() });
      store.setCart(carrito);
      notificar(`Silla ${seat.id} bloqueada por 90 segundos.`, 'exito');
      seatPolling.refrescar();
    } else {
      notificar(resultado.message, 'aviso');
      await resincronizar();
    }
  } catch (error) {
    console.error('Error al bloquear:', error);
    notificar(mensajeDeError(error), 'error');
    // Ante un fallo se vuelve a pedir el estado real (si cayó el servidor lo hace Reconnection)
    if (!esErrorDeConexion(error)) await resincronizar();
  }
}
