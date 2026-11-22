import { eventBus } from '../state/EventBus.js';
import { store } from '../state/Store.js';
import { formatPrice } from '../utils/format.js';
import { liberarTodas } from '../services/CartActions.js';
import { CartItem } from './CartItem.js';
import { CountdownTimer } from './CountdownTimer.js';
import '../styles/CartPanel.css';

// Panel "Resumen de Selección": reloj, sillas retenidas, total y botones
export class CartPanel {
  constructor(contenedor) {
    this.contenedor = contenedor;
  }

  mount() {
    this.panel = document.createElement('section');
    this.panel.className = 'panel-carrito';

    const titulo = document.createElement('h2');
    titulo.textContent = 'Resumen de Selección';

    this.subtitulo = document.createElement('p');
    this.subtitulo.className = 'cart-subtitulo';

    this.vacio = document.createElement('p');
    this.vacio.className = 'cart-vacio';
    this.vacio.textContent = 'No has seleccionado sillas.';

    this.lista = document.createElement('ul');
    this.lista.className = 'cart-lista';

    // Pie del panel: total a pagar y los dos botones
    const pie = document.createElement('div');
    pie.className = 'cart-pie';

    const filaTotal = document.createElement('div');
    filaTotal.className = 'cart-fila-total';
    const rotulo = document.createElement('span');
    rotulo.textContent = 'Total a pagar:';
    this.total = document.createElement('strong');
    this.total.className = 'cart-total';
    filaTotal.append(rotulo, this.total);

    // Abre el modal de compra (CheckoutModal escucha este evento)
    this.botonConfirmar = document.createElement('button');
    this.botonConfirmar.className = 'cart-confirmar';
    this.botonConfirmar.textContent = 'Confirmar Reserva';
    this.botonConfirmar.addEventListener('click', () => eventBus.emit('checkout:abrir'));

    this.botonLiberar = document.createElement('button');
    this.botonLiberar.className = 'cart-liberar';
    this.botonLiberar.textContent = 'Liberar Sillas';
    this.botonLiberar.addEventListener('click', async () => {
      this.botonLiberar.disabled = true;
      this.botonLiberar.textContent = 'Liberando...';
      await liberarTodas();
      this.botonLiberar.textContent = 'Liberar Sillas';
      this.render();
    });

    pie.append(filaTotal, this.botonConfirmar, this.botonLiberar);

    this.panel.append(titulo);
    new CountdownTimer(this.panel).mount();
    this.panel.append(this.subtitulo, this.vacio, this.lista, pie);
    this.contenedor.append(this.panel);

    // El panel se redibuja solo cada vez que cambia el carrito
    eventBus.on('cart:changed', () => this.render());
    eventBus.on('connection:changed', () => this.render());
    this.render();
  }

  render() {
    const carrito = store.get('cart');

    this.lista.replaceChildren();
    carrito.forEach((item) => this.lista.append(new CartItem(item).crear()));

    const suma = carrito.reduce((acumulado, item) => acumulado + item.seat.price, 0);
    this.total.textContent = formatPrice(suma);
    this.subtitulo.textContent = `Sillas en retención (${carrito.length}):`;

    // Los botones siempre se ven; sin sillas o sin conexión quedan deshabilitados
    const hayItems = carrito.length > 0;
    const puedeActuar = hayItems && store.estaConectado();
    this.vacio.hidden = hayItems;
    this.botonConfirmar.disabled = !puedeActuar;
    this.botonLiberar.disabled = !puedeActuar;
  }
}
