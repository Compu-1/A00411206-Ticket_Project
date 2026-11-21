package co.icesi.booking.server;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.Before;
import org.junit.Test;

import BookingApp.BookingException;
import BookingApp.SeatNotAvailableException;
import BookingApp.SeatState;

/**
 * Pruebas de estres de concurrencia sobre BookingServiceImpl.
 * Se llama al servicio directamente (sin Ice): cada Thread hace de un hilo del pool de Ice.
 */
public class BookingServiceConcurrencyTest {

    private static final int NUM_THREADS = 50;

    private BookingServiceImpl service;

    @Before
    public void setUp() {
        service = new BookingServiceImpl();
    }

    // 50 hilos intentan bloquear A-1 al mismo tiempo: solo uno debe ganar.
    @Test
    public void lockSeat_50HilosMismaSilla_unSoloExito() throws Exception {
        AtomicInteger exitos = new AtomicInteger();
        AtomicInteger rechazos = new AtomicInteger();
        AtomicInteger otros = new AtomicInteger();

        runConcurrently(NUM_THREADS, i -> {
            try {
                service.lockSeat("A-1", "CLIENT-" + i, null);
                exitos.incrementAndGet();
            } catch (SeatNotAvailableException e) {
                rechazos.incrementAndGet();
            } catch (Exception e) {
                otros.incrementAndGet();
            }
        });

        assertEquals("Debe haber exactamente 1 bloqueo exitoso", 1, exitos.get());
        assertEquals("Los demas deben recibir SeatNotAvailableException", NUM_THREADS - 1, rechazos.get());
        assertEquals("No debe haber otras excepciones", 0, otros.get());
        assertEquals(SeatState.LOCKED, service.getSeat("A-1", null).state);
    }

    // 50 hilos confirman la misma silla con el MISMO clientId (todos pasan la validacion de dueno):
    // solo la atomicidad de confirmBooking evita que se creen varias reservas.
    @Test
    public void confirmBooking_50HilosMismaSilla_unaSolaReserva() throws Exception {
        service.lockSeat("A-1", "CLIENT-0", null);

        AtomicInteger exitos = new AtomicInteger();
        AtomicInteger rechazos = new AtomicInteger();
        AtomicInteger otros = new AtomicInteger();

        runConcurrently(NUM_THREADS, i -> {
            try {
                service.confirmBooking(new String[] {"A-1"}, "CLIENT-0", "Cliente " + i, "c" + i + "@icesi.edu.co", null);
                exitos.incrementAndGet();
            } catch (BookingException e) {
                rechazos.incrementAndGet();
            } catch (Exception e) {
                otros.incrementAndGet();
            }
        });

        assertEquals("Debe haber exactamente 1 reserva confirmada", 1, exitos.get());
        assertEquals(NUM_THREADS - 1, rechazos.get());
        assertEquals(0, otros.get());
        assertEquals("bookingsList debe tener 1 sola reserva", 1, service.getMyBookings("CLIENT-0", null).length);
        assertEquals(SeatState.BOOKED, service.getSeat("A-1", null).state);
    }

    // Todo o nada: si una silla de la lista no es valida, ninguna debe quedar vendida.
    @Test
    public void confirmBooking_unaSillaInvalida_noVendeNinguna() throws Exception {
        service.lockSeat("A-1", "CLIENT-0", null);
        // A-2 NO esta bloqueada, asi que la reserva completa debe fallar

        try {
            service.confirmBooking(new String[] {"A-1", "A-2"}, "CLIENT-0", "Ana", "ana@icesi.edu.co", null);
            fail("Debio lanzar BookingException");
        } catch (BookingException expected) {
            // correcto
        }

        assertEquals(SeatState.LOCKED, service.getSeat("A-1", null).state);
        assertEquals(SeatState.AVAILABLE, service.getSeat("A-2", null).state);
        assertEquals(0, service.getMyBookings("CLIENT-0", null).length);
    }

    // Cada hilo bloquea y compra una silla distinta: sin perder reservas ni repetir codigos.
    @Test
    public void confirmBooking_sillasDistintas_codigosUnicos() throws Exception {
        int n = 40; // 4 filas (A..D) x 10
        String[] filas = {"A", "B", "C", "D"};
        AtomicInteger errores = new AtomicInteger();

        runConcurrently(n, i -> {
            String seatId = filas[i / 10] + "-" + (i % 10 + 1);
            String client = "CLIENT-" + i;
            try {
                service.lockSeat(seatId, client, null);
                service.confirmBooking(new String[] {seatId}, client, "Cliente " + i, "c" + i + "@icesi.edu.co", null);
            } catch (Exception e) {
                errores.incrementAndGet();
            }
        });

        assertEquals(0, errores.get());
        java.util.Set<String> codigos = new java.util.HashSet<>();
        for (int i = 0; i < n; i++) {
            BookingApp.BookingRecord[] mias = service.getMyBookings("CLIENT-" + i, null);
            assertEquals(1, mias.length);
            assertTrue("Formato RES-XXXXXX", mias[0].bookingCode.matches("RES-[A-Z0-9]{6}"));
            codigos.add(mias[0].bookingCode);
        }
        assertEquals("Los codigos de reserva deben ser unicos", n, codigos.size());
    }

    // Ejecuta 'tarea' en numThreads hilos que arrancan todos a la vez (con un CountDownLatch).
    private void runConcurrently(int numThreads, Tarea tarea) throws InterruptedException {
        CountDownLatch inicio = new CountDownLatch(1);
        CountDownLatch fin = new CountDownLatch(numThreads);

        for (int i = 0; i < numThreads; i++) {
            final int id = i;
            new Thread(() -> {
                try {
                    inicio.await(); // todos esperan la senal de salida
                    tarea.ejecutar(id);
                } catch (InterruptedException ignored) {
                } finally {
                    fin.countDown();
                }
            }).start();
        }

        inicio.countDown();
        fin.await();
    }

    private interface Tarea {
        void ejecutar(int i);
    }
}
