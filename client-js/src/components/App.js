import { HeaderStats } from './HeaderStats.js';
import { SeatMap } from './SeatMap.js';
import { Legend } from './Legend.js';
import '../styles/App.css';

// Componente raíz: arma la página y monta los demás componentes.
// Aquí se montará después el carrito (Sprint 4).
export class App {
  constructor(contenedor) {
    this.contenedor = contenedor;
  }

  mount() {
    new HeaderStats(this.contenedor).mount();

    this.main = document.createElement('main');
    this.main.className = 'app-main';

    // Panel del plano: título, sillas y leyenda
    const panel = document.createElement('section');
    panel.className = 'panel-plano';
    const titulo = document.createElement('h2');
    titulo.textContent = 'Distribución de Sillas';
    panel.append(titulo);

    // El clic en una silla se conecta en HU-13
    new SeatMap(panel, () => {}).mount();
    new Legend(panel).mount();

    this.main.append(panel);
    this.contenedor.append(this.main);
  }
}
