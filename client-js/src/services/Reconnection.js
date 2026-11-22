import { connectionManager } from './ConnectionManager.js';
import { resincronizar } from './Resync.js';
import { eventBus } from '../state/EventBus.js';
import { store } from '../state/Store.js';
import { notificar } from '../utils/notificar.js';

const ESPERA_INICIAL_MS = 1000;
const ESPERA_MAXIMA_MS = 10000;

// Cuando la conexión pasa a 'error' reintenta con espera creciente: 1 s, 2 s, 4 s, 8 s, 10 s...
class Reconnection {
  constructor() {
    this.timer = null;
    this.intentos = 0;
    this.activa = false;     // hay una caída en curso
    this.intentando = false; // un intento está en marcha
  }

  init() {
    eventBus.on('connection:changed', (estado) => {
      if (estado !== 'error') return;
      if (!this.activa) {
        this.activa = true;
        this.intentos = 0;
        notificar('Sin conexión con el servidor. Reintentando...', 'error');
      }
      this.programar();
    });
  }

  programar() {
    if (this.timer || this.intentando) return;
    const espera = Math.min(ESPERA_INICIAL_MS * 2 ** this.intentos, ESPERA_MAXIMA_MS);
    this.intentos++;
    this.timer = setTimeout(() => this.intentar(), espera);
  }

  async intentar() {
    this.timer = null;
    this.intentando = true;
    try {
      await connectionManager.disconnect();
      await connectionManager.connect();
      // Se resincroniza ANTES de pasar a ONLINE para no mostrar datos viejos
      if (!(await resincronizar())) throw new Error('Falló la resincronización');
      this.activa = false;
      this.intentando = false;
      store.setConnection('conectado'); // el polling se reanuda solo
      notificar('Conexión restablecida.', 'exito');
    } catch (error) {
      console.error('Reintento fallido:', error);
      this.intentando = false;
      this.programar();
    }
  }
}

export const reconnection = new Reconnection();
