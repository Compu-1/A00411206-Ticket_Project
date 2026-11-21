// Pub/sub mínimo: los componentes se suscriben a eventos y el Store los emite
class EventBus {
  constructor() {
    this.listeners = {}; // { nombreEvento: [funciones] }
  }

  // Suscribe una función a un evento
  on(evento, funcion) {
    if (!this.listeners[evento]) {
      this.listeners[evento] = [];
    }
    this.listeners[evento].push(funcion);
  }

  // Quita una suscripción
  off(evento, funcion) {
    if (!this.listeners[evento]) return;
    this.listeners[evento] = this.listeners[evento].filter((f) => f !== funcion);
  }

  // Avisa a todos los suscriptores del evento
  emit(evento, datos) {
    if (!this.listeners[evento]) return;
    this.listeners[evento].forEach((funcion) => funcion(datos));
  }
}

export const eventBus = new EventBus();
