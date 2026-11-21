// Da formato de pesos colombianos a un número (ej: 150000 -> $150.000)
export function formatPrice(valor) {
  return '$' + Number(valor).toLocaleString('es-CO');
}
