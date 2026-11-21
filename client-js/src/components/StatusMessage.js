import { eventBus } from '../state/EventBus.js';
import '../styles/StatusMessage.css';

// Div de avisos simples. Otros módulos publican: eventBus.emit('aviso', 'texto')
// (el Toast completo es del Sprint 5)
export class StatusMessage {
  constructor(contenedor) {
    this.contenedor = contenedor;
    this.timer = null;
  }

  mount() {
    this.div = document.createElement('div');
    this.div.className = 'status-message';
    this.contenedor.append(this.div);

    eventBus.on('aviso', (texto) => this.mostrar(texto));
  }

  // Muestra el texto y lo borra a los 4 segundos
  mostrar(texto) {
    this.div.textContent = texto;
    this.div.classList.add('visible');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.div.classList.remove('visible'), 4000);
  }
}
