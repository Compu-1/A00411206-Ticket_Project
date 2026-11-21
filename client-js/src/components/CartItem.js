import { formatPrice } from '../utils/format.js';
import { quitarSilla } from '../services/CartActions.js';

// Nombres legibles de las zonas (el enum llega como ZONEVIP, ZONEPLATEA...)
const NOMBRES_ZONA = {
  ZONEVIP: 'VIP',
  ZONEPLATEA: 'Platea',
  ZONEGENERAL: 'General',
};

// Una fila del carrito: silla, zona, precio y botón para quitarla
export class CartItem {
  constructor(item) {
    this.item = item;
  }

  // Devuelve el <li> ya armado
  crear() {
    const seat = this.item.seat;

    const li = document.createElement('li');
    li.className = 'cart-item';

    const info = document.createElement('span');
    info.textContent =
      `${seat.id} · ${NOMBRES_ZONA[seat.zone.name] || seat.zone.name} · ${formatPrice(seat.price)}`;

    const boton = document.createElement('button');
    boton.className = 'cart-item-quitar';
    boton.textContent = 'Quitar';
    boton.addEventListener('click', async () => {
      boton.disabled = true; // evita clics repetidos mientras responde el servidor
      await quitarSilla(seat.id);
      boton.disabled = false;
    });

    li.append(info, boton);
    return li;
  }
}
