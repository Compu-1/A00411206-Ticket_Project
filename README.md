# Icesi Live Arena — Sistema distribuido de reserva de boletas

Proyecto final de **Computación en Internet I (09810 - TIC)**, Universidad Icesi, periodo 2026-2.

Sistema de reserva de boletas para un concierto con 90 sillas (20 VIP, 30 Platea, 40 General). Varios usuarios compiten a la vez por las mismas sillas y el servidor garantiza que **nunca se vende ni se bloquea la misma silla dos veces**.

| Capa | Tecnología | Puerto |
|---|---|---|
| Frontend | JavaScript vainilla (ES Modules) + Webpack, sin frameworks | `3000` (desarrollo) |
| Canal navegador ↔ servidor | ZeroC Ice por **WebSocket** | `10002` |
| Canal clientes nativos y pruebas | ZeroC Ice por **TCP** | `10000` |
| Backend | Java 17 + ZeroC Ice 3.7 | — |

Ciclo de vida de una silla: `AVAILABLE` → `LOCKED` (bloqueo temporal de 90 s) → `BOOKED` (venta definitiva con código `RES-XXXXXX`).

---

## 1. Requisitos de software

| Herramienta | Versión | Para qué |
|---|---|---|
| JDK | 17 o superior (probado con 17 y 21) | Compilar y ejecutar el servidor |
| Node.js | 18 o superior (probado con 24) | Frontend |
| npm **o** pnpm | npm 9+ / pnpm 9+ | Instalar dependencias del frontend |

Gradle **no** hay que instalarlo: el proyecto incluye el wrapper (`gradlew` / `gradlew.bat`). La primera ejecución descarga Gradle 8.6 y las dependencias, así que necesita internet.

---

## 2. Estructura del repositorio

```text
.
├── codigo_base/                 # Backend Java (Gradle multi-módulo)
│   ├── common/                  #   Contrato Slice: BookingService.ice
│   ├── server/                  #   Servidor Ice (TCP 10000 + WebSocket 10002) y pruebas JUnit
│   └── client/                  #   Cliente Java de consola y prueba de estrés
├── client-js/                   # Frontend (Webpack + JS vainilla)
│   ├── webpack.config.mjs
│   ├── scripts/slice.mjs        #   Genera el JS del contrato Slice
│   └── src/
│       ├── components/          #   Componentes de interfaz (un archivo, una responsabilidad)
│       ├── services/            #   Conexión Ice, llamadas RPC, polling, reconexión
│       ├── state/               #   Store y EventBus
│       ├── styles/              #   Un CSS por componente
│       ├── utils/               #   Utilidades (clientId, validaciones, formato)
│       └── generated/           #   JS generado desde el .ice (no editar a mano)
└── docs/                        # Evidencias (salida de la prueba de concurrencia "antes")
```

---

## 3. Backend (Java + ZeroC Ice)

Todos los comandos se ejecutan desde la carpeta `codigo_base/`.

### 3.1 Levantar el servidor

```powershell
cd codigo_base
.\gradlew runServer
```

(En Linux/macOS: `./gradlew runServer`.) Debe mostrar que escucha en `TCP 10000` y `WebSocket 10002`. Déjalo corriendo en su propia terminal; se detiene con `Ctrl+C`.

### 3.2 Prueba de estrés de concurrencia

Con el servidor corriendo, en **otra** terminal:

```powershell
cd codigo_base
.\gradlew runClient --args="--test-concurrency"
```

La prueba dispara 10 hilos que intentan bloquear a la vez la silla `A-1`.

| Versión del servidor | Resultado |
|---|---|
| Original (sin sincronización) | **10 de 10** hilos logran el bloqueo → condición de carrera. Salida guardada en `docs/evidencia/HU-01_antes_test_concurrencia.txt` |
| Corregida (este repositorio) | **1 éxito** y 9 rechazados con `SeatNotAvailableException` |

> Si ya hay una silla bloqueada de una prueba anterior, reinicia el servidor (o usa la opción de reinicio de inventario del cliente) antes de repetir.

### 3.3 Pruebas unitarias (JUnit)

```powershell
cd codigo_base
.\gradlew :server:test
```

Incluyen 50 hilos compitiendo por la misma silla (un solo éxito), 50 hilos confirmando la misma silla (una sola reserva), confirmación todo-o-nada y unicidad de los códigos de reserva.

### 3.4 Cliente Java de consola

```powershell
.\gradlew runClient
```

Menú interactivo para consultar el aforo, ver el mapa de sillas, bloquear, confirmar compras y reiniciar el inventario. Admite `--host <ip>` y `--port <n>` para apuntar a otro servidor.

### 3.5 Cómo se garantiza la consistencia (RNF-1)

En `BookingServiceImpl.java`:

- Un único `lock` (`synchronized`) protege todas las operaciones que leen o escriben el inventario: `lockSeat`, `releaseSeat`, `confirmBooking`, `resetSeats` y las consultas.
- `confirmBooking` valida y vende dentro del mismo bloque: **o se confirman todas las sillas o ninguna**, y solo si cada una está bloqueada por ese cliente y vigente.
- `ConcurrentHashMap` y `CopyOnWriteArrayList` para el inventario y el historial de compras.
- Un hilo de barrido (`ScheduledExecutorService`, cada 1 s) libera los bloqueos vencidos aunque el navegador se haya cerrado.
- El código de reserva `RES-XXXXXX` (6 caracteres) se genera dentro del lock y se verifica que no se repita.

---

## 4. Frontend (JavaScript vainilla + Webpack)

Todos los comandos se ejecutan desde la carpeta `client-js/`. Funciona con **npm** o con **pnpm** (elige uno).

| Acción | npm | pnpm |
|---|---|---|
| Instalar dependencias | `npm install` | `pnpm install` |
| Desarrollo (puerto 3000) | `npm start` | `pnpm start` |
| Build de producción (`dist/`) | `npm run build` | `pnpm build` |
| Regenerar el JS del contrato Slice | `npm run slice` | `pnpm slice` |

```powershell
cd client-js
npm install
npm start
```

Con el servidor Java corriendo, abre <http://localhost:3000>.

Notas:

- El JS del contrato ya viene generado en `src/generated/`. `npm run slice` solo hace falta si se modifica `BookingService.ice`; usa el **mismo** archivo del backend (`codigo_base/common/src/main/slice/`).
- Hay un `package-lock.json` (npm) y un `pnpm-lock.yaml` (pnpm). Si cambias dependencias, actualiza el lockfile del gestor que uses.
- Si cambias de gestor y ya hay un `node_modules/` del otro, bórralo antes de instalar.
- Para probar la concurrencia visualmente, abre **varias ventanas** del navegador en `http://localhost:3000`: cada una tiene su propio identificador de cliente.
- Si `localhost:3000` no muestra la aplicación, verifica que ningún otro programa esté usando el puerto 3000: `netstat -ano | findstr :3000`.

### 4.1 Funcionalidades

- Información del evento, precios por zona y contadores (disponibles / retenidas / ocupadas) en tiempo real, con indicador ONLINE / OFFLINE.
- Plano de 90 sillas con 4 estados (disponible, seleccionada por mí, bloqueada por otro, vendida), actualizado cada pocos segundos.
- Bloqueo exclusivo de 90 s al hacer clic, con temporizador reactivo calculado desde la expiración que informa el servidor y liberación automática.
- Carrito con total, liberación manual (una silla o todas) y recuperación del carrito al recargar la página.
- Checkout con validación de nombre y correo, y comprobante con el código `RES-XXXXXX`.
- Vista "Mis reservas".
- Manejo de errores remotos con notificaciones y reconexión automática con espera creciente cuando se cae el servidor.

---

## 5. Entrega

- **Repositorio:** `codigo_base/` (servidor con la concurrencia corregida y probada) y `client-js/` (frontend completo).
- **Commits:** historial continuo bajo Conventional Commits (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`).
- **Video demostrativo (máx. 6 min):** _pendiente — agregar aquí el enlace_.
