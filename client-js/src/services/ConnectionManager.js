// Build de la librería 'ice' para navegador: deja el objeto Ice en window.Ice
import 'ice/lib/Ice.js';
// El código generado (debe cargarse después de Ice) deja BookingApp en window
import '../generated/BookingService.js';

const Ice = window.Ice;
const BookingApp = window.BookingApp;

// Host del servidor (el servidor Java corre en esta misma máquina)
const HOST = 'localhost';
const PUERTO_WS = 10002;

// Maneja el Communicator de Ice y el proxy al servidor (solo WebSocket)
class ConnectionManager {
  constructor() {
    this.communicator = null;
    this.proxy = null;
  }

  // Crea el communicator y el proxy tipado BookingService
  async connect() {
    this.communicator = Ice.initialize();
    const base = this.communicator.stringToProxy(`BookingService:ws -h ${HOST} -p ${PUERTO_WS}`);
    this.proxy = await BookingApp.BookingServicePrx.checkedCast(base);
    if (!this.proxy) {
      throw new Error('No se pudo conectar con BookingService');
    }
    return this.proxy;
  }

  getProxy() {
    return this.proxy;
  }

  async disconnect() {
    if (this.communicator) {
      await this.communicator.destroy();
      this.communicator = null;
      this.proxy = null;
    }
  }
}

export const connectionManager = new ConnectionManager();
export { BookingApp };
