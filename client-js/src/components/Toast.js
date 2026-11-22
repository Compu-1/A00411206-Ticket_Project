import { eventBus } from '../state/EventBus.js';
import '../styles/Toast.css';

const DURACION_MS = 4000; // el toast desaparece solo a los 4 segundos

// Notificaciones temporales (esquina superior derecha).
// Escucha el evento 'toast' con { texto, tipo }; para emitirlo se usa notificar().
export class Toast {
  constructor(contenedor) {
    this.contenedor = contenedor;
  }

  mount() {
    this.lista = document.createElement('div');
    this.lista.className = 'toast-lista';
    this.lista.setAttribute('aria-live', 'polite');
    this.contenedor.append(this.lista);

    eventBus.on('toast', (datos) => this.mostrar(datos.texto, datos.tipo));
  }

  mostrar(texto, tipo) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + tipo;
    toast.textContent = texto;
    // Con un clic se cierra antes de tiempo
    toast.addEventListener('click', () => toast.remove());
    this.lista.append(toast);
    setTimeout(() => toast.remove(), DURACION_MS);
  }
}
