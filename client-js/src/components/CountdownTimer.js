import { eventBus } from '../state/EventBus.js';
import { store } from '../state/Store.js';
import { notificar } from '../utils/notificar.js';
import { quitarSilla } from '../services/CartActions.js';
import '../styles/CountdownTimer.css';


export class CountdownTimer {
  constructor(contenedor) {
    this.contenedor = contenedor;
    this.expirando = []; // ids que ya se están liberando (evita llamarlas dos veces)
  }

  mount() {
    this.div = document.createElement('div');
    this.div.className = 'countdown';
    const rotulo = document.createElement('span');
    rotulo.textContent = 'Tiempo de retención:';
    this.tiempo = document.createElement('strong');
    this.div.append(rotulo, this.tiempo);
    this.contenedor.append(this.div);

    // Un tick por segundo; también se redibuja si cambia el carrito
    setInterval(() => this.tick(), 1000);
    eventBus.on('cart:changed', () => this.tick());
    this.tick();
  }

  tick() {
    const carrito = store.get('cart');
    this.div.hidden = carrito.length === 0;
    if (carrito.length === 0) return;

    // Silla con el menor expiresAt
    const proxima = carrito.reduce((a, b) => (b.expiresAt < a.expiresAt ? b : a));
    const segundos = Math.max(0, Math.ceil((proxima.expiresAt - Date.now()) / 1000));

    const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
    const ss = String(segundos % 60).padStart(2, '0');
    this.tiempo.textContent = `${mm}:${ss}`;
    this.div.title = `Silla más próxima a vencer: ${proxima.seat.id}`;
    this.div.classList.toggle('urgente', segundos <= 15);

    // Revisa todas las sillas vencidas (no solo la próxima)
    carrito.forEach((item) => {
      if (item.expiresAt <= Date.now()) this.expirar(item.seat.id);
    });
  }

  // Al llegar a 0: libera en el servidor, quita del carrito y avisa
  async expirar(seatId) {
    // Sin conexión no se puede liberar: al reconectar, la resincronización limpia el carrito
    if (!store.estaConectado()) return;
    if (this.expirando.includes(seatId)) return;
    this.expirando.push(seatId);
    await quitarSilla(seatId);
    this.expirando = this.expirando.filter((id) => id !== seatId);
    notificar(`Se acabó el tiempo: la silla ${seatId} fue liberada.`, 'aviso');
  }
}
