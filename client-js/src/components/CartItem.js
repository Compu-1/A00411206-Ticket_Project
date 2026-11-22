import { formatPrice } from '../utils/format.js';
import { quitarSilla } from '../services/CartActions.js';

// Nombres legibles de las zonas (el enum llega como ZONEVIP, ZONEPLATEA...)
const NOMBRES_ZONA = {
  ZONEVIP: 'VIP',
  ZONEPLATEA: 'Platea',
  ZONEGENERAL: 'General',
};

// Una tarjeta del carrito: "Silla A-1 (VIP)", precio y botón para quitarla
export class CartItem {
  constructor(item) {
    this.item = item;
  }

  // Devuelve el <li> ya armado
  crear() {
    const seat = this.item.seat;

    const li = document.createElement('li');
    li.className = 'cart-item';

    const nombre = document.createElement('span');
    nombre.className = 'cart-item-nombre';
    nombre.textContent = `Silla ${seat.id} (${NOMBRES_ZONA[seat.zone.name] || seat.zone.name})`;

    const precio = document.createElement('span');
    precio.className = 'cart-item-precio';
    precio.textContent = formatPrice(seat.price);

    const boton = document.createElement('button');
    boton.className = 'cart-item-quitar';
    boton.textContent = '×';
    boton.title = `Quitar silla ${seat.id}`;
    boton.addEventListener('click', async () => {
      boton.disabled = true; // evita clics repetidos mientras responde el servidor
      boton.textContent = '...';
      await quitarSilla(seat.id);
      boton.disabled = false;
      boton.textContent = '×';
    });

    li.append(nombre, precio, boton);
    return li;
  }
}
