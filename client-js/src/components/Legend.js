import '../styles/Legend.css';

// Leyenda con los cuatro estados de una silla (usa las mismas clases que SeatButton)
const ESTADOS = [
  { clase: 'seat-disponible', texto: 'Disponible' },
  { clase: 'seat-mia', texto: 'Seleccionada (mía)' },
  { clase: 'seat-otro', texto: 'Bloqueada (otro)' },
  { clase: 'seat-vendida', texto: 'Vendida' },
];

export class Legend {
  constructor(contenedor) {
    this.contenedor = contenedor;
  }

  mount() {
    const legend = document.createElement('div');
    legend.className = 'legend';

    const titulo = document.createElement('strong');
    titulo.textContent = 'Convenciones de estado:';
    legend.append(titulo);

    ESTADOS.forEach((estado) => {
      const item = document.createElement('span');
      item.className = 'legend-item';
      const muestra = document.createElement('span');
      muestra.className = 'legend-muestra ' + estado.clase;
      item.append(muestra, estado.texto);
      legend.append(item);
    });
    this.contenedor.append(legend);
  }
}
