import { connectionManager } from './ConnectionManager.js';
import { esErrorDeConexion } from './errorMapper.js';
import { store } from '../state/Store.js';

// Ejecuta una llamada al servidor. Si falla por conexión, el Store pasa a 'error'
// (OFFLINE) y Reconnection se encarga de reintentar. El error se vuelve a lanzar
// para que quien llamó sepa que no hubo respuesta.
async function llamar(operacion) {
  try {
    return await operacion(connectionManager.getProxy());
  } catch (error) {
    if (esErrorDeConexion(error) && store.get('connection') === 'conectado') {
      store.setConnection('error');
    }
    throw error;
  }
}

// Un método async por cada operación del contrato Slice
export const BookingApi = {
  getEventInfo: () => llamar((p) => p.getEventInfo()),
  getAllSeats: () => llamar((p) => p.getAllSeats()),
  getSeatsByZone: (zone) => llamar((p) => p.getSeatsByZone(zone)),
  getSeat: (seatId) => llamar((p) => p.getSeat(seatId)),
  lockSeat: (seatId, clientId) => llamar((p) => p.lockSeat(seatId, clientId)),
  releaseSeat: (seatId, clientId) => llamar((p) => p.releaseSeat(seatId, clientId)),
  confirmBooking: (seatIds, clientId, nombre, correo) =>
    llamar((p) => p.confirmBooking(seatIds, clientId, nombre, correo)),
  getMyLockedSeats: (clientId) => llamar((p) => p.getMyLockedSeats(clientId)),
  getMyBookings: (clientId) => llamar((p) => p.getMyBookings(clientId)),
  resetSeats: () => llamar((p) => p.resetSeats()),
};
