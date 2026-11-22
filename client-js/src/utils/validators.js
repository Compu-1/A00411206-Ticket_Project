// Validaciones simples del formulario de compra
export function nombreValido(nombre) {
  return nombre.trim().length > 0;
}

// Expresión sencilla: algo@algo.algo, sin espacios
export function correoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
}
