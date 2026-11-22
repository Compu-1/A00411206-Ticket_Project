import { BookingApi } from './BookingApi.js';
import { eventBus } from '../state/EventBus.js';
import { store } from '../state/Store.js';

const INTERVALO_MS = 2500; // cada 2.5 segundos

// Refresco automático: pide sillas e info del evento y las guarda en el Store
class SeatPolling {
  constructor() {
    this.timer = null;
    this.ocupado = false; // evita dos refrescos al mismo tiempo
  }

  // Un refresco: también se puede llamar a mano (por ejemplo tras un error al bloquear)
  async refrescar() {
    if (this.ocupado) return;
    this.ocupado = true;
    try {
      const seats = await BookingApi.getAllSeats();
      const info = await BookingApi.getEventInfo();
      store.setSeats(seats);
      store.setEvent(info);
    } catch (error) {
      // Si fue por conexión, BookingApi ya pasó el Store a OFFLINE (y el polling se pausa)
      console.error('Error al refrescar:', error);
    } finally {
      this.ocupado = false;
    }
  }

  start() {
    if (this.timer) return;
    this.refrescar();
    this.timer = setInterval(() => this.refrescar(), INTERVALO_MS);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  // Arranca con la conexión y se pausa o reanuda según su estado
  init() {
    eventBus.on('connection:changed', (estado) => {
      if (estado === 'conectado') this.start();
      else this.stop();
    });
    if (store.get('connection') === 'conectado') this.start();
  }
}

export const seatPolling = new SeatPolling();
