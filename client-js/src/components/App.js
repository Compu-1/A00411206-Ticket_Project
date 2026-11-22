import { HeaderStats } from './HeaderStats.js';
import { SeatMap } from './SeatMap.js';
import { Legend } from './Legend.js';
import { CartPanel } from './CartPanel.js';
import { CheckoutModal } from './CheckoutModal.js';
import { MyBookings } from './MyBookings.js';
import { Toast } from './Toast.js';
import { eventBus } from '../state/EventBus.js';
import { clicEnSilla } from '../services/SeatActions.js';
import '../styles/App.css';

// Componente raíz: arma la página y monta los demás componentes.
export class App {
  constructor(contenedor) {
    this.contenedor = contenedor;
  }

  mount() {
    new Toast(this.contenedor).mount();
    new HeaderStats(this.contenedor).mount();

    this.main = document.createElement('main');
    this.main.className = 'app-main';

    // Panel del plano: título, sillas y leyenda
    const panel = document.createElement('section');
    panel.className = 'panel-plano';
    const cabecera = document.createElement('div');
    cabecera.className = 'panel-cabecera';
    const titulo = document.createElement('h2');
    titulo.textContent = 'Distribución de Sillas';
    // Abre la ventana "Mis reservas" (MyBookings escucha este evento)
    const botonReservas = document.createElement('button');
    botonReservas.textContent = 'Mis reservas';
    botonReservas.addEventListener('click', () => eventBus.emit('reservas:abrir'));
    cabecera.append(titulo, botonReservas);
    panel.append(cabecera);

    new SeatMap(panel, clicEnSilla).mount();
    new Legend(panel).mount();

    this.main.append(panel);
    new CartPanel(this.main).mount();
    this.contenedor.append(this.main);

    // Modal de compra: queda oculto hasta que se pulsa "Confirmar reserva"
    new CheckoutModal(this.contenedor).mount();
    new MyBookings(this.contenedor).mount();
  }
}
