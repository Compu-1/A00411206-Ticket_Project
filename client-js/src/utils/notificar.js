import { eventBus } from '../state/EventBus.js';

// Muestra un toast. tipo: 'exito' | 'error' | 'aviso' (el componente Toast lo dibuja)
export function notificar(texto, tipo = 'aviso') {
  eventBus.emit('toast', { texto, tipo });
}
