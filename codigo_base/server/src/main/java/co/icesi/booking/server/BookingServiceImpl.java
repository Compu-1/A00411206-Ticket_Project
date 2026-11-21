package co.icesi.booking.server;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import com.zeroc.Ice.Current;

import BookingApp.BookingException;
import BookingApp.BookingRecord;
import BookingApp.BookingResult;
import BookingApp.BookingService;
import BookingApp.EventInfo;
import BookingApp.InvalidBookingException;
import BookingApp.LockExpiredException;
import BookingApp.LockResult;
import BookingApp.Seat;
import BookingApp.SeatNotAvailableException;
import BookingApp.SeatNotFoundException;
import BookingApp.SeatState;
import BookingApp.SeatZone;

public class BookingServiceImpl implements BookingService {

    public static final long DEFAULT_LOCK_DURATION_SECONDS = 90;

    private final EventInfo eventInfo;
    // Colecciones thread-safe: Ice atiende cada llamada en un hilo distinto del pool.
    // ConcurrentHashMap permite get/put/iterar desde varios hilos sin corromper el mapa.
    private final Map<String, Seat> seatsMap = new ConcurrentHashMap<>();
    // CopyOnWriteArrayList: pocas escrituras (una por reserva) y muchas lecturas (getMyBookings).
    private final List<BookingRecord> bookingsList = new CopyOnWriteArrayList<>();

    // Candado global del inventario: todo check-then-act sobre las sillas se hace dentro de este bloque.
    private final Object lock = new Object();

    public BookingServiceImpl() {
        this.eventInfo = new EventInfo(
                "EVT-2026-LIVE",
                "Concierto Icesi Live Rock & Pop 2026",
                "2026-11-28 20:00",
                "Auditorio Manuelita - Universidad Icesi",
                90, 90, 0, 0,
                120000.0, 75000.0, 45000.0
        );
        initSeats();

        // Barrido periodico: cada 1 s libera las sillas cuyo bloqueo ya vencio (HU-05).
        // Hilo daemon para que no impida cerrar el servidor.
        ScheduledExecutorService sweeper = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "lock-sweeper");
            t.setDaemon(true);
            return t;
        });
        sweeper.scheduleAtFixedRate(this::releaseExpiredLocks, 1, 1, TimeUnit.SECONDS);
    }

    private void initSeats() {
        // Reinicio completo del inventario: nadie debe leer a medias mientras se limpia y se recrea.
        synchronized (lock) {
            initSeatsLocked();
        }
    }

    private void initSeatsLocked() {
        seatsMap.clear();
        bookingsList.clear();

        createSeatsForZone("A", 1, 10, SeatZone.ZONEVIP, 120000.0);
        createSeatsForZone("B", 1, 10, SeatZone.ZONEVIP, 120000.0);

        createSeatsForZone("C", 1, 10, SeatZone.ZONEPLATEA, 75000.0);
        createSeatsForZone("D", 1, 10, SeatZone.ZONEPLATEA, 75000.0);
        createSeatsForZone("E", 1, 10, SeatZone.ZONEPLATEA, 75000.0);

        createSeatsForZone("F", 1, 10, SeatZone.ZONEGENERAL, 45000.0);
        createSeatsForZone("G", 1, 10, SeatZone.ZONEGENERAL, 45000.0);
        createSeatsForZone("H", 1, 10, SeatZone.ZONEGENERAL, 45000.0);
        createSeatsForZone("I", 1, 10, SeatZone.ZONEGENERAL, 45000.0);

        updateEventCounters();
        System.out.printf("[INFO] Inventario inicializado con %d sillas en 3 zonas (VIP, Platea, General).%n", seatsMap.size());
    }

    private void createSeatsForZone(String row, int startNum, int endNum, SeatZone zone, double price) {
        for (int num = startNum; num <= endNum; num++) {
            String seatId = String.format("%s-%d", row, num);
            Seat seat = new Seat(
                    seatId,
                    zone,
                    row,
                    num,
                    price,
                    SeatState.AVAILABLE,
                    "",
                    0L,
                    DEFAULT_LOCK_DURATION_SECONDS
            );
            seatsMap.put(seatId, seat);
        }
    }

    private boolean isLockExpired(Seat seat) {
        if (seat.state != SeatState.LOCKED) return false;
        long elapsedSeconds = (System.currentTimeMillis() - seat.lockTimestamp) / 1000L;
        return elapsedSeconds > seat.lockDurationSeconds;
    }

    // Libera las sillas LOCKED cuyo tiempo de retencion ya vencio.
    // Corre en el hilo del barrido, asi que toma el mismo lock que lockSeat/confirmBooking/releaseSeat.
    private void releaseExpiredLocks() {
        try {
            synchronized (lock) {
                for (Seat seat : seatsMap.values()) {
                    if (isLockExpired(seat)) {
                        seat.state = SeatState.AVAILABLE;
                        seat.lockedByClientId = "";
                        seat.lockTimestamp = 0L;
                        System.out.printf("[SWEEP] Bloqueo vencido: silla %s liberada.%n", seat.id);
                    }
                }
            }
        } catch (Exception e) {
            // Si una ejecucion lanza excepcion, scheduleAtFixedRate cancelaria las siguientes: se captura.
            System.err.println("[SWEEP-ERROR] " + e);
        }
    }

    // Debe llamarse con el lock tomado: recorre las sillas y escribe eventInfo (lectura + escritura compuesta).
    private void updateEventCounters() {
        int avail = 0;
        int locked = 0;
        int booked = 0;
        for (Seat s : seatsMap.values()) {
            if (s.state == SeatState.BOOKED) {
                booked++;
            } else if (s.state == SeatState.LOCKED && !isLockExpired(s)) {
                locked++;
            } else {
                avail++;
            }
        }
        eventInfo.totalSeats = seatsMap.size();
        eventInfo.availableSeats = avail;
        eventInfo.lockedSeats = locked;
        eventInfo.bookedSeats = booked;
    }

    @Override
    public EventInfo getEventInfo(Current current) {
        // Se devuelve una COPIA: Ice serializa la respuesta fuera del lock y otro hilo podria modificar eventInfo.
        synchronized (lock) {
            updateEventCounters();
            return eventInfo.clone();
        }
    }

    @Override
    public Seat[] getAllSeats(Current current) {
        // Se copian las sillas dentro del lock para que el cliente reciba una foto consistente.
        synchronized (lock) {
            List<Seat> list = new ArrayList<>();
            for (Seat s : seatsMap.values()) { //Se copian las sillas para que si mientra ice lee el archivo fuera del synchronized y alguien decide cambiar seatmaps no llegue la lista con datos vacios
                list.add(s.clone());
            }
            list.sort(Comparator.comparing((Seat s) -> s.row).thenComparingInt(s -> s.number));
            return list.toArray(new Seat[0]);
        }
    }

    @Override
    public Seat[] getSeatsByZone(SeatZone zone, Current current) {
        synchronized (lock) {
            List<Seat> list = new ArrayList<>();
            for (Seat s : seatsMap.values()) {
                if (s.zone == zone) {
                    list.add(s.clone());
                }
            }
            list.sort(Comparator.comparing((Seat s) -> s.row).thenComparingInt(s -> s.number));
            return list.toArray(new Seat[0]);
        }
    }

    @Override
    public Seat getSeat(String seatId, Current current) throws SeatNotFoundException {
        synchronized (lock) {
            Seat seat = seatsMap.get(seatId);
            if (seat == null) {
                throw new SeatNotFoundException("Silla no encontrada en inventario: " + seatId);
            }
            return seat.clone();
        }
    }

    @Override
    public LockResult lockSeat(String seatId, String clientId, Current current)
            throws SeatNotFoundException, SeatNotAvailableException {

        // Seccion critica: verificar el estado y escribirlo debe ser UN solo paso atomico.
        // Sin esto, varios hilos ven AVAILABLE a la vez (durante el sleep) y todos bloquean la silla.
        synchronized (lock) {
            Seat seat = seatsMap.get(seatId);
            if (seat == null) {
                throw new SeatNotFoundException("Silla no encontrada: " + seatId);
            }

            // Si estaba bloqueada pero expiro el tiempo de retencion, liberarla
            if (seat.state == SeatState.LOCKED && isLockExpired(seat)) {
                System.out.printf("[LOCK-EXPIRED] El bloqueo de la silla %s expiró. Liberando.%n", seatId);
                seat.state = SeatState.AVAILABLE;
                seat.lockedByClientId = "";
            }

            // Validacion de disponibilidad
            if (seat.state != SeatState.AVAILABLE) {
                if (seat.state == SeatState.LOCKED && clientId.equals(seat.lockedByClientId)) {
                    // El mismo cliente renueva el bloqueo
                    seat.lockTimestamp = System.currentTimeMillis();
                    long expiresAt = seat.lockTimestamp + (seat.lockDurationSeconds * 1000L);
                    return new LockResult(true, seatId, "Bloqueo renovado con éxito.", expiresAt);
                }
                throw new SeatNotAvailableException(String.format("La silla %s ya no se encuentra disponible (Estado: %s).", seatId, seat.state));
            }

            // Simulación de latencia de red / I/O en base de datos (No remover)
            try {
                Thread.sleep(25);
            } catch (InterruptedException ignored) {
            }

            seat.state = SeatState.LOCKED;
            seat.lockedByClientId = clientId;
            seat.lockTimestamp = System.currentTimeMillis();
            seat.lockDurationSeconds = DEFAULT_LOCK_DURATION_SECONDS;

            long expiresAt = seat.lockTimestamp + (DEFAULT_LOCK_DURATION_SECONDS * 1000L);
            System.out.printf("[LOCK-OK] Silla %s bloqueada exitosamente para cliente: %s (expira en %ds)%n",
                    seatId, clientId, DEFAULT_LOCK_DURATION_SECONDS);

            return new LockResult(true, seatId, "Silla bloqueada exitosamente.", expiresAt);
        }
    }

    @Override
    public boolean releaseSeat(String seatId, String clientId, Current current) throws SeatNotFoundException {
        // Verificar el dueno y liberar debe ser atomico: si no, podria liberar una silla que
        // otro hilo acaba de comprar (confirmBooking) o de bloquear.
        synchronized (lock) {
            Seat seat = seatsMap.get(seatId);
            if (seat == null) {
                throw new SeatNotFoundException("Silla no encontrada: " + seatId);
            }

            // Solo puede liberar el cliente que la bloqueo o si ya expiro
            if (seat.state == SeatState.LOCKED) {
                if (clientId.equals(seat.lockedByClientId) || isLockExpired(seat)) {
                    seat.state = SeatState.AVAILABLE;
                    seat.lockedByClientId = "";
                    seat.lockTimestamp = 0L;
                    System.out.printf("[RELEASE-OK] Silla %s liberada por cliente: %s%n", seatId, clientId);
                    return true;
                }
            }
            return false;
        }
    }

    @Override
    public BookingResult confirmBooking(String[] seatIds, String clientId, String customerName, String customerEmail, Current current)
            throws InvalidBookingException, BookingException {

        if (seatIds == null || seatIds.length == 0) {
            throw new InvalidBookingException("Debe seleccionar al menos una silla para completar la reserva.");
        }
        if (customerName == null || customerName.trim().isEmpty()) {
            throw new InvalidBookingException("El nombre del comprador es obligatorio.");
        }
        if (customerEmail == null || !customerEmail.contains("@")) {
            throw new InvalidBookingException("El correo electrónico del comprador es inválido.");
        }

        // Una silla repetida en la lista se cobraria dos veces
        if (new HashSet<>(Arrays.asList(seatIds)).size() != seatIds.length) {
            throw new InvalidBookingException("La lista de sillas contiene sillas repetidas.");
        }

        // Seccion critica: validar TODAS las sillas y marcarlas BOOKED es un solo paso atomico.
        // Si una falla se lanza la excepcion antes de escribir nada (todo o nada).
        synchronized (lock) {
            double totalAmount = 0.0;
            List<Seat> validatedSeats = new ArrayList<>();

            // Paso 1: validar (no se modifica ninguna silla)
            for (String seatId : seatIds) {
                Seat seat = seatsMap.get(seatId);
                if (seat == null) {
                    throw new SeatNotFoundException("Silla no existe: " + seatId);
                }
                if (seat.state == SeatState.BOOKED) {
                    throw new BookingException("La silla " + seatId + " ya fue vendida definitivamente.");
                }
                // Solo se puede comprar una silla que ESTE cliente tenga bloqueada y vigente
                if (seat.state != SeatState.LOCKED) {
                    throw new BookingException("La silla " + seatId + " no está bloqueada; debe bloquearla antes de comprar.");
                }
                if (isLockExpired(seat)) {
                    throw new LockExpiredException("El bloqueo temporal de la silla " + seatId + " ha expirado.");
                }
                if (!clientId.equals(seat.lockedByClientId)) {
                    throw new BookingException("La silla " + seatId + " se encuentra bloqueada por otro comprador.");
                }
                totalAmount += seat.price;
                validatedSeats.add(seat);
            }

            // Paso 2: confirmar. Ya se validaron todas, aqui no puede fallar a la mitad.
            for (Seat s : validatedSeats) {
                s.state = SeatState.BOOKED;
                s.lockedByClientId = clientId;
            }

            String bookingCode = generateBookingCode();
            long now = System.currentTimeMillis();

            BookingRecord record = new BookingRecord(
                    bookingCode,
                    eventInfo.id,
                    clientId,
                    customerName.trim(),
                    customerEmail.trim(),
                    seatIds,
                    totalAmount,
                    now
            );
            bookingsList.add(record);

            System.out.printf("[BOOKING-CONFIRMED] Código: %s | Cliente: %s (%s) | %d sillas | Total: $%,.0f COP%n",
                    bookingCode, customerName, clientId, seatIds.length, totalAmount);

            return new BookingResult(
                    true,
                    bookingCode,
                    "Reserva confirmada con éxito. Disfrute del evento.",
                    seatIds,
                    totalAmount,
                    now
            );
        }
    }

    // Codigo RES-XXXXXX (6 alfanumericos). Se llama dentro del lock, asi que nadie mas
    // puede registrar el mismo codigo entre la verificacion y el bookingsList.add.
    private String generateBookingCode() {
        while (true) {
            String code = "RES-" + UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
            boolean exists = false;
            for (BookingRecord b : bookingsList) {
                if (b.bookingCode.equals(code)) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                return code;
            }
        }
    }

    @Override
    public Seat[] getMyLockedSeats(String clientId, Current current) {
        synchronized (lock) {
            List<Seat> list = new ArrayList<>();
            if (clientId != null && !clientId.isEmpty()) {
                for (Seat s : seatsMap.values()) {
                    if (s.state == SeatState.LOCKED && clientId.equals(s.lockedByClientId) && !isLockExpired(s)) {
                        list.add(s.clone());
                    }
                }
            }
            return list.toArray(new Seat[0]);
        }
    }

    @Override
    public BookingRecord[] getMyBookings(String clientId, Current current) {
        // bookingsList es CopyOnWriteArrayList (recorrido seguro), pero se toma el lock
        // para que la lista sea consistente con el estado de las sillas.
        synchronized (lock) {
            List<BookingRecord> list = new ArrayList<>();
            if (clientId != null && !clientId.isEmpty()) {
                for (BookingRecord b : bookingsList) {
                    if (clientId.equals(b.clientId)) {
                        list.add(b);
                    }
                }
            }
            return list.toArray(new BookingRecord[0]);
        }
    }

    @Override
    public void resetSeats(Current current) {
        initSeats(); // ya toma el lock internamente
        System.out.println("[RESET] Inventario y reservas reiniciadas a estado de fábrica.");
    }
}
