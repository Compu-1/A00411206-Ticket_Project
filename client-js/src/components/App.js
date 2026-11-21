import { HeaderStats } from './HeaderStats.js';

// Componente raíz: arma la página y monta los demás componentes.
// Aquí se montarán después el plano de sillas (Sprint 3) y el carrito (Sprint 4).
export class App {
  constructor(contenedor) {
    this.contenedor = contenedor;
  }

  mount() {
    new HeaderStats(this.contenedor).mount();

    this.main = document.createElement('main');
    this.main.className = 'app-main';
    this.contenedor.append(this.main);
  }
}
