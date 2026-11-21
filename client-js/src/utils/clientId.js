// Id del cliente: se genera una vez y se guarda en localStorage.
// Si localStorage falla, se usa uno en memoria mientras dure la página.
const CLAVE = 'clientId';
let idEnMemoria = null;

function generarId() {
  return 'cli-' + Math.random().toString(36).slice(2, 10);
}

export function getClientId() {
  if (idEnMemoria) return idEnMemoria;
  try {
    idEnMemoria = localStorage.getItem(CLAVE);
    if (!idEnMemoria) {
      idEnMemoria = generarId();
      localStorage.setItem(CLAVE, idEnMemoria);
    }
  } catch (error) {
    if (!idEnMemoria) idEnMemoria = generarId();
  }
  return idEnMemoria;
}
