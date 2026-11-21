import { eventBus } from './EventBus.js';

// Estado central de la aplicación. Cada cambio avisa por el EventBus
// con el evento "<clave>:changed" (por ejemplo "seats:changed").
class Store {
  constructor() {
    this.state = {
      event: null,          // información del evento (getEventInfo)
      seats: [],            // lista de sillas
      cart: [],             // sillas bloqueadas por este cliente
      bookings: [],         // reservas confirmadas
      connection: 'desconectado', // 'desconectado' | 'conectando' | 'conectado' | 'error'
    };
  }

  get(clave) {
    return this.state[clave];
  }

  // Cambia una parte del estado y notifica
  set(clave, valor) {
    this.state[clave] = valor;
    eventBus.emit(`${clave}:changed`, valor);
  }

  setEvent(event) { this.set('event', event); }
  setSeats(seats) { this.set('seats', seats); }
  setCart(cart) { this.set('cart', cart); }
  setBookings(bookings) { this.set('bookings', bookings); }
  setConnection(estado) { this.set('connection', estado); }
}

export const store = new Store();
