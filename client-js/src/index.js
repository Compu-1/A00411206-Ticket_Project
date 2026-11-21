import './styles/main.css';
import { connectionManager } from './services/ConnectionManager.js';
import { BookingApi } from './services/BookingApi.js';
import { store } from './state/Store.js';
import { App } from './components/App.js';

// Monta la aplicación en el div #app
const app = new App(document.getElementById('app'));
app.mount();

// Conecta con el servidor y guarda la información del evento en el Store
async function iniciar() {
  store.setConnection('conectando');
  try {
    await connectionManager.connect();
    store.setConnection('conectado');
    const info = await BookingApi.getEventInfo();
    store.setEvent(info);
    // Carga inicial de las sillas (el refresco automático es HU-12)
    store.setSeats(await BookingApi.getAllSeats());
  } catch (error) {
    console.error('Error de conexión:', error);
    store.setConnection('error');
  }
}

iniciar();
