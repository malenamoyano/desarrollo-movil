import { useCallback, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  obtenerAgenda,
  obtenerReservasPorFecha,
  registrarAusencia,
} from "../../servicios/encargado/encargado";

import type { Turno, Reserva } from "../../tipos/types";

// Obtener una fecha en formato AAAA-MM-DD usando el horario local.
function obtenerFechaLocal(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

// Convertir una fecha ISO en una fecha local para mostrarla.
function formatearFecha(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia, 12);

  return fecha.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Sumar o restar días sin utilizar conversiones UTC.
function desplazarFecha(fechaISO: string, cantidad: number): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);

  const fecha = new Date(
    anio,
    mes - 1,
    dia + cantidad,
    12
  );

  return obtenerFechaLocal(fecha);
}

function obtenerColorEstado(estado: string): string {
  switch (estado) {
    case "libre":
      return "#2E7D32";

    case "reservado":
      return "#1565C0";

    case "fijo":
      return "#EF6C00";

    case "mantenimiento":
      return "#757575";

    case "ausente":
      return "#C62828";

    case "cumplida":
      return "#2E7D32";

    case "cancelada":
      return "#757575";

    default:
      return "#757575";
  }
}

// Comprueba si una reserva puede marcarse como ausente
function puedeRegistrarAusencia(
  turno: Turno,
  reserva: Reserva | undefined,
  ahora: number
): boolean {
  if (!reserva) return false;

  if (reserva.estado !== "confirmada") return false;

  if (turno.estado !== "reservado") return false;

  if (turno.reservaId !== reserva.id) return false;

  // Solamente se permiten ausencias del día actual.
  if (turno.fecha !== obtenerFechaLocal(new Date(ahora))) {
    return false;
  }

  const [anio, mes, dia] = turno.fecha.split("-").map(Number);
  const [hora, minuto] = turno.inicio.split(":").map(Number);

  const inicioTurno = new Date(
    anio,
    mes - 1,
    dia,
    hora,
    minuto
  );

  const momentoPermitido =
    inicioTurno.getTime() + 15 * 60 * 1000;

  return ahora >= momentoPermitido;
}

export default function Agenda() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  const [fecha, setFecha] = useState(() =>
    obtenerFechaLocal()
  );

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reservaEnProceso, setReservaEnProceso] =
    useState<string | null>(null);

  const [intentoCarga, setIntentoCarga] = useState(0);

  const [ahora, setAhora] = useState(() => Date.now());

  // Recargar cada vez que se entra a la agenda o se cambia de fecha.
  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function cargarAgenda() {
        setCargando(true);
        setError(null);

        try {
          const [datosTurnos, datosReservas] = await Promise.all([
            obtenerAgenda(fecha),
            obtenerReservasPorFecha(fecha),
          ]);

          if (!activo) return;

          setTurnos(datosTurnos);
          setReservas(datosReservas);
        } catch (err) {
          if (!activo) return;

          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la agenda."
          );
        } finally {
          if (activo) {
            setCargando(false);
          }
        }
      }

      setAhora(Date.now());
      void cargarAgenda();

      // Actualizar la hora para habilitar las ausencias
      // cuando se cumplan los 15 minutos.
      const intervalo = setInterval(() => {
        setAhora(Date.now());
      }, 30000);

      return () => {
        activo = false;
        clearInterval(intervalo);
      };
    }, [fecha, intentoCarga])
  );

  const turnosOrdenados = [...turnos].sort(
    (a, b) =>
      a.espacioId.localeCompare(b.espacioId) ||
      a.inicio.localeCompare(b.inicio)
  );

  const reservasPorId = new Map<string, Reserva>(
    reservas.map((reserva) => [reserva.id, reserva])
  );

  async function marcarAusencia(reservaId: string) {
    if (reservaEnProceso !== null) return;

    const turno = turnos.find(
      (item) => item.reservaId === reservaId
    );

    const reserva = reservasPorId.get(reservaId);

    if (
      !turno ||
      !puedeRegistrarAusencia(turno, reserva, Date.now())
    ) {
      Alert.alert(
        "No se puede registrar la ausencia",
        "Solo podés marcar como ausente una reserva confirmada del día actual, cuando hayan pasado al menos 15 minutos desde el inicio del turno."
      );
      return;
    }

    setReservaEnProceso(reservaId);

    try {
      const reservaActualizada =
        await registrarAusencia(reservaId);

      // Actualizar el estado local con la respuesta del servidor.
      setReservas((actuales) =>
        actuales.map((item) =>
          item.id === reservaId
            ? reservaActualizada
            : item
        )
      );

      Alert.alert(
        "Ausencia registrada",
        `La reserva ${reservaActualizada.id} fue marcada como ausente.`
      );
    } catch (err) {
      Alert.alert(
        "No se pudo registrar la ausencia",
        err instanceof Error
          ? err.message
          : "Ocurrió un error al registrar la ausencia."
      );
    } finally {
      setReservaEnProceso(null);
    }
  }

  function confirmarAusencia(reservaId: string) {
    const turno = turnos.find(
      (item) => item.reservaId === reservaId
    );

    const reserva = reservasPorId.get(reservaId);

    if (
      !turno ||
      !puedeRegistrarAusencia(turno, reserva, Date.now())
    ) {
      Alert.alert(
        "No se puede registrar la ausencia",
        "Esta reserva no cumple las condiciones para registrar una ausencia."
      );
      return;
    }

    Alert.alert(
      "Marcar como ausente",
      "¿Confirmás que el jugador no se presentó?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Confirmar ausencia",
          style: "destructive",
          onPress: () => {
            void marcarAusencia(reservaId);
          },
        },
      ]
    );
  }

  function diaAnterior() {
    setFecha((actual) => desplazarFecha(actual, -1));
  }

  function diaSiguiente() {
    setFecha((actual) => desplazarFecha(actual, 1));
  }

  if (cargando) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.textoCargando}>
          Cargando agenda...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContenedor}>
        <Ionicons
          name="alert-circle-outline"
          size={56}
          color="#C62828"
        />

        <Text style={styles.tituloError}>
          No se pudo cargar la agenda
        </Text>

        <Text style={styles.mensajeError}>
          {error}
        </Text>

        <Pressable
          style={styles.botonReintentar}
          onPress={() =>
            setIntentoCarga((actual) => actual + 1)
          }
        >
          <Text style={styles.textoBotonReintentar}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      {/* Navegación entre fechas */}
      <View style={styles.header}>
        <Pressable
          style={styles.botonNavegacion}
          onPress={diaAnterior}
          hitSlop={8}
        >
          <Ionicons
            name="chevron-back-outline"
            size={25}
            color="#1565C0"
          />
        </Pressable>

        <Text style={styles.fechaActual}>
          {formatearFecha(fecha)}
        </Text>

        <Pressable
          style={styles.botonNavegacion}
          onPress={diaSiguiente}
          hitSlop={8}
        >
          <Ionicons
            name="chevron-forward-outline"
            size={25}
            color="#1565C0"
          />
        </Pressable>
      </View>

      <Text style={styles.subtitulo}>
        {turnosOrdenados.length} turno
        {turnosOrdenados.length !== 1 ? "s" : ""}
      </Text>

      {turnosOrdenados.length === 0 ? (
        <View style={styles.vacio}>
          <Ionicons
            name="calendar-outline"
            size={48}
            color="#9E9E9E"
          />

          <Text style={styles.textoVacio}>
            No hay turnos para esta fecha.
          </Text>
        </View>
      ) : (
        <FlatList
          data={turnosOrdenados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => {
            const reservaId = item.reservaId;

            const reserva = reservaId
              ? reservasPorId.get(reservaId)
              : undefined;

            const estadoReserva = reserva?.estado;

            const estadoVisible =
              estadoReserva === "ausente" ||
              estadoReserva === "cumplida" ||
              estadoReserva === "cancelada"
                ? estadoReserva
                : item.estado;

            const procesandoAusencia =
              reservaId !== null &&
              reservaEnProceso === reservaId;

            const mostrarBotonAusencia =
              reservaId !== null &&
              puedeRegistrarAusencia(
                item,
                reserva,
                ahora
              );

            return (
              <View style={styles.tarjetaTurno}>
                <Pressable
                  style={styles.filaTurno}
                  onPress={() =>
                    router.push({
                      pathname: "/encargado/estado-cancha",
                      params: {
                        espacioId: item.espacioId,
                      },
                    })
                  }
                >
                  <View style={styles.horario}>
                    <Text style={styles.horaInicio}>
                      {item.inicio}
                    </Text>

                    <Text style={styles.horaFin}>
                      {item.fin}
                    </Text>
                  </View>

                  <View style={styles.detalleTurno}>
                    <Text style={styles.espacioId}>
                      Espacio: {item.espacioId}
                    </Text>

                  </View>

                  <View style={styles.estadoContenedor}>
                    <Text
                      style={[
                        styles.estadoTexto,
                        {
                          color:
                            obtenerColorEstado(estadoVisible),
                        },
                      ]}
                    >
                      {estadoVisible}
                    </Text>
                  </View>
                </Pressable>

                {mostrarBotonAusencia && reservaId && (
                  <Pressable
                    style={[
                      styles.botonAusencia,
                      reservaEnProceso !== null &&
                        styles.botonAusenciaDeshabilitado,
                    ]}
                    onPress={() =>
                      confirmarAusencia(reservaId)
                    }
                    disabled={reservaEnProceso !== null}
                  >
                    {procesandoAusencia ? (
                      <ActivityIndicator
                        color="#C62828"
                        size="small"
                      />
                    ) : (
                      <Ionicons
                        name="person-remove-outline"
                        size={19}
                        color="#C62828"
                      />
                    )}

                    <Text style={styles.textoBotonAusencia}>
                      {procesandoAusencia
                        ? "Marcando ausencia..."
                        : "Marcar como ausente"}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 4,
  },

  botonNavegacion: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  fechaActual: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "bold",
    color: "#212121",
    textAlign: "center",
  },

  subtitulo: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 12,
  },

  cargando: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  textoCargando: {
    marginTop: 12,
    color: "#666666",
    fontSize: 15,
  },

  errorContenedor: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  tituloError: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#C62828",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },

  mensajeError: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },

  botonReintentar: {
    backgroundColor: "#1565C0",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  textoBotonReintentar: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  vacio: {
    alignItems: "center",
    paddingVertical: 40,
  },

  textoVacio: {
    marginTop: 12,
    color: "#9E9E9E",
    fontSize: 15,
  },

  lista: {
    paddingBottom: 24,
  },

  tarjetaTurno: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },

  filaTurno: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  botonAusencia: {
    marginTop: 14,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },

  botonAusenciaDeshabilitado: {
    opacity: 0.6,
  },

  textoBotonAusencia: {
    color: "#C62828",
    fontSize: 13,
    fontWeight: "bold",
  },

  horario: {
    gap: 4,
  },

  horaInicio: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#212121",
  },

  horaFin: {
    fontSize: 14,
    color: "#666666",
  },

  detalleTurno: {
    flex: 1,
    marginHorizontal: 12,
  },

  espacioId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#212121",
    marginBottom: 4,
  },

  reservaId: {
    fontSize: 13,
    color: "#666666",
  },

  estadoContenedor: {
    alignItems: "flex-end",
  },

  estadoTexto: {
    fontSize: 13,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});