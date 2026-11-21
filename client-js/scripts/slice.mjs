// Genera el JavaScript del contrato Slice del backend en src/generated/
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const slice2js = require('slice2js');

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Se usa el MISMO .ice del backend, sin copiarlo
const archivoIce = path.resolve(raiz, '../codigo_base/common/src/main/slice/BookingService.ice');
const salida = path.resolve(raiz, 'src/generated');

fs.mkdirSync(salida, { recursive: true });

const proceso = slice2js.compile(['--output-dir', salida, archivoIce], { stdio: 'inherit' });
proceso.on('exit', (codigo) => {
  if (codigo === 0) console.log('Slice generado en src/generated/');
  process.exit(codigo);
});
