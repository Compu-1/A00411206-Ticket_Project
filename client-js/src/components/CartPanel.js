import { eventBus } from '../state/EventBus.js';
import { store } from '../state/Store.js';
import { formatPrice } from '../utils/format.js';
import { liberarTodas } from '../services/CartActions.js';
import { CartItem } from './CartItem.js';
import '../styles/CartPanel.css';

// Panel del carrito: lista de sillas retenidas, total y botones
export class CartPanel {
  constructor(contenedor) {
    this.contenedor = contenedor;
  }

  mount() {
    this.panel = document.createElement('section');
    this.panel.className = 'panel-carrito';

    const titulo = document.createElement('h2');
    titulo.textContent = 'Tu Carrito';

    this.vacio = document.createElement('p');
    this.vacio.className = 'cart-vacio';
    this.vacio.textContent = 'No has seleccionado sillas.';

    this.lista = document.createElement('ul');
    this.lista.className = 'cart-lista';

    this.total = document.createElement('p');
    this.total.className = 'cart-total';

    this.botonLiberar = document.createElement('button');
    this.botonLiberar.className = 'cart-liberar';
    this.botonLiberar.textContent = 'Liberar sillas';
    this.botonLiberar.addEventListener('click', async () => {
      this.botonLiberar.disabled = true;
      await liberarTodas();
      this.render();
    });

    this.panel.append(titulo, this.vacio, this.lista, this.total, this.botonLiberar);
    this.contenedor.append(this.panel);

    // El panel se redibuja solo cada vez que cambia el carrito
    eventBus.on('cart:changed', () => this.render());
    this.render();
  }

  render() {
    const carrito = store.get('cart');

    this.lista.replaceChildren();
    carrito.forEach((item) => this.lista.append(new CartItem(item).crear()));

    const suma = carrito.reduce((acumulado, item) => acumulado + item.seat.price, 0);
    this.total.textContent = `Total: ${formatPrice(suma)}`;

    const hayItems = carrito.length > 0;
    this.vacio.hidden = hayItems;
    this.total.hidden = !hayItems;
    this.botonLiberar.hidden = !hayItems;
    this.botonLiberar.disabled = false;
  }
}
