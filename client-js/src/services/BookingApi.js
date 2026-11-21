import { connectionManager } from './ConnectionManager.js';

// Un método async por cada operación del contrato Slice
export const BookingApi = {
  getEventInfo: () => connectionManager.getProxy().getEventInfo(),
  getAllSeats: () => connectionManager.getProxy().getAllSeats(),
  getSeatsByZone: (zone) => connectionManager.getProxy().getSeatsByZone(zone),
  getSeat: (seatId) => connectionManager.getProxy().getSeat(seatId),
  lockSeat: (seatId, clientId) => connectionManager.getProxy().lockSeat(seatId, clientId),
  releaseSeat: (seatId, clientId) => connectionManager.getProxy().releaseSeat(seatId, clientId),
  confirmBooking: (seatIds, clientId, nombre, correo) =>
    connectionManager.getProxy().confirmBooking(seatIds, clientId, nombre, correo),
  getMyLockedSeats: (clientId) => connectionManager.getProxy().getMyLockedSeats(clientId),
  getMyBookings: (clientId) => connectionManager.getProxy().getMyBookings(clientId),
  resetSeats: () => connectionManager.getProxy().resetSeats(),
};
