import { formatPrice } from '../utils/format.js';

// Comprobante de compra: recibe el BookingResult que devolvió el servidor
export class Receipt {
  constructor(resultado) {
    this.resultado = resultado;
  }

  // Devuelve el <div> con código, sillas y total
  crear() {
    const div = document.createElement('div');
    div.className = 'receipt';

    const titulo = document.createElement('h3');
    titulo.textContent = '--- COMPROBANTE GENERADO ---';

    const exito = document.createElement('p');
    exito.textContent = 'Reserva confirmada con éxito';

    const codigo = document.createElement('p');
    codigo.className = 'receipt-codigo';
    codigo.textContent = `CÓDIGO: ${this.resultado.bookingCode}`;

    const sillas = document.createElement('p');
    sillas.textContent = 'Sillas: ' + this.resultado.seatIds.join(', ');

    const total = document.createElement('p');
    total.textContent = 'Total pagado: ' + formatPrice(this.resultado.totalAmount);

    div.append(titulo, exito, codigo, sillas, total);
    return div;
  }
}
