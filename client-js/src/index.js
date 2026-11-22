import './styles/main.css';
import { connectionManager } from './services/ConnectionManager.js';
import { seatPolling } from './services/SeatPolling.js';
import { recuperarCarrito } from './services/CartRecovery.js';
import { store } from './state/Store.js';
import { App } from './components/App.js';

// Monta la aplicación en el div #app
const app = new App(document.getElementById('app'));
app.mount();

// El polling arranca solo cuando la conexión pasa a 'conectado'
seatPolling.init();

// Conecta con el servidor
async function iniciar() {
  store.setConnection('conectando');
  try {
    await connectionManager.connect();
    store.setConnection('conectado');
    // Si recargaron la página, se recupera el carrito desde el servidor
    await recuperarCarrito();
  } catch (error) {
    console.error('Error de conexión:', error);
    store.setConnection('error');
  }
}

iniciar();
