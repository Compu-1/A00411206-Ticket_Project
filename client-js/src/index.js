import { connectionManager } from './services/ConnectionManager.js';
import { BookingApi } from './services/BookingApi.js';

const app = document.getElementById('app');

// Prueba mínima: conectar con el servidor y mostrar getEventInfo()
async function iniciar() {
  app.textContent = 'Conectando con el servidor...';
  try {
    await connectionManager.connect();
    const info = await BookingApi.getEventInfo();
    console.log('getEventInfo:', info);
    app.textContent = `Conectado: ${info.name} (${info.availableSeats}/${info.totalSeats} sillas disponibles)`;
  } catch (error) {
    console.error('Error de conexión:', error);
    app.textContent = 'No se pudo conectar con el servidor: ' + error;
  }
}

iniciar();
