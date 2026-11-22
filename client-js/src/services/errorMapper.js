import { BookingApp } from './ConnectionManager.js';

const Ice = window.Ice;

// ¿La excepción significa que no hay comunicación con el servidor?
export function esErrorDeConexion(error) {
  return (
    error instanceof Ice.ConnectFailedException ||
    error instanceof Ice.SocketException || // incluye ConnectionLostException
    error instanceof Ice.TimeoutException ||
    error instanceof Ice.CloseConnectionException ||
    error instanceof Ice.DNSException ||
    error instanceof Ice.CommunicatorDestroyedException
  );
}

// Convierte cualquier excepción (Slice, Ice o de red) en un mensaje claro en español
export function mensajeDeError(error) {
  if (esErrorDeConexion(error)) {
    return 'Se perdió la conexión con el servidor.';
  }
  // Las excepciones Slice más específicas van primero (heredan de BookingException)
  if (error instanceof BookingApp.SeatNotAvailableException) {
    return 'La silla ya no está disponible: otro cliente la tomó.';
  }
  if (error instanceof BookingApp.SeatNotFoundException) {
    return 'La silla indicada no existe.';
  }
  if (error instanceof BookingApp.LockExpiredException) {
    return 'Tu tiempo de retención expiró. Selecciona las sillas de nuevo.';
  }
  if (error instanceof BookingApp.InvalidBookingException) {
    return 'La reserva no es válida: ' + (error.reason || 'revisa los datos.');
  }
  if (error instanceof BookingApp.BookingException) {
    return error.reason || 'El servidor no pudo completar la operación.';
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
