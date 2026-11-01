import { useCallback, useState } from "react";
import { router, Stack, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Network from "expo-network";
import { useAuth } from "../contextos/AuthContext";
import {
  guardarReservasLocales,
  obtenerReservasLocales,
  eliminarReservasLocales,
  guardarReservaLocal,
} from "../servicios/almacenamientoLocal";

import type { Espacio, Reserva, Turno } from "../tipos/types";
import { obtenerEspacios } from "../servicios/espacios";
import { obtenerTurnosPorEspacio } from "../servicios/turnos";
import {
  cancelarReserva,
  obtenerMisReservas,
} from "../servicios/reservas";

type Vista = "proximas" | "pasadas";

// Campos adicionales en la copia local; no modifican el contrato de la API.
type ReservaGuardada = Reserva & {
  _nombreEspacio?: string;
  _fecha?: string;
  _inicio?: string;
  _fin?: string;
};

async function hayConexion(): Promise<boolean> {
  try {
    const red = await Network.getNetworkStateAsync();
    return red.isConnected !== false && red.isInternetReachable !== false;
  } catch {
    // Ante un estado indeterminado probamos la API.
    return true;
  }
}

const nombresEstados: Record<Reserva["estado"], string> = {
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  cumplida: "Cumplida",
  ausente: "Ausente",
};

function fechaLocalISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function obtenerProximosSieteDias(): string[] {
  const fechas: string[] = [];

  for (let i = 0; i < 7; i++) {
    const fecha = new Date();
    fecha.setHours(12, 0, 0, 0);
    fecha.setDate(fecha.getDate() + i);

    fechas.push(fechaLocalISO(fecha));
  }

  return fechas;
}

function formatearFecha(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);

  const fecha = new Date(anio, mes - 1, dia);

  return fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function MisReservas() {
  const { usuario } = useAuth();
  const [reservas, setReservas] = useState<ReservaGuardada[]>([]);
  const [sinConexion, setSinConexion] = useState(false);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [turnosPorId, setTurnosPorId] = useState<
    Record<string, Turno>
  >({});

  const [vista, setVista] = useState<Vista>("proximas");
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [cancelandoId, setCancelandoId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const cargarReservas = useCallback(
    async (esActualizacion = false) => {
      if (esActualizacion) setActualizando(true);
      else setCargando(true);
      setError(null);

      try {
        if (!usuario) {
          throw new Error("Iniciá sesión para consultar tus reservas.");
        }

        const conectado = await hayConexion();
        setSinConexion(!conectado);

        if (!conectado) {
          if (vista === "pasadas") {
            setReservas([]);
            setTurnosPorId({});
            setError("El historial necesita conexión a Internet.");
            return;
          }

          const guardadas = (await obtenerReservasLocales(usuario.id)) as ReservaGuardada[];
          // Nunca presentamos QR de reservas ya canceladas o cumplidas.
          const proximas = guardadas.filter((r) =>
            r.estado === "confirmada" &&
            (!r._fecha || r._fecha >= fechaLocalISO(new Date()))
          );
          setReservas(proximas);
          setTurnosPorId({});
          return;
        }

        // La API es la fuente de verdad cuando hay conexión.
        const datosReservas = await obtenerMisReservas(vista);
        const resultadoEspacios = await Promise.allSettled([obtenerEspacios()]);
        const datosEspacios = resultadoEspacios[0].status === "fulfilled"
          ? resultadoEspacios[0].value
          : [];
        setEspacios(datosEspacios);

        if (vista === "pasadas") {
          setReservas(datosReservas);
          setTurnosPorId({});
          return; // El historial no se guarda en SQLite.
        }

        const idsEspacios = [...new Set(datosReservas.map((r) => r.espacioId))];
        const fechas = obtenerProximosSieteDias();
        const consultas = idsEspacios.flatMap((espacioId) =>
          fechas.map((fecha) => obtenerTurnosPorEspacio(espacioId, fecha))
        );
        const resultados = await Promise.allSettled(consultas);
        const encontrados: Record<string, Turno> = {};
        for (const resultado of resultados) {
          if (resultado.status === "fulfilled") {
            for (const turno of resultado.value) encontrados[turno.id] = turno;
          }
        }
        setTurnosPorId(encontrados);

        // Solo próximas confirmadas se guardan para mostrar QR offline.
        const guardables: ReservaGuardada[] = datosReservas
          .filter((r) => r.estado === "confirmada")
          .map((r) => {
            const turno = encontrados[r.turnoId];
            return {
              ...r,
              _nombreEspacio: datosEspacios.find((e) => e.id === r.espacioId)?.nombre,
              _fecha: turno?.fecha,
              _inicio: turno?.inicio,
              _fin: turno?.fin,
            };
          });

        // Sustituir el caché anterior elimina QR de reservas
        // que ya no aparecen como próximas/confirmadas.
        try {
          await eliminarReservasLocales(usuario.id);
          await guardarReservasLocales(usuario.id, guardables);
        } catch (err) {
          console.error("No se pudo actualizar la copia offline:", err);
        }
        setReservas(datosReservas);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar las reservas.");
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [vista, usuario?.id]
  );

  useFocusEffect(
    useCallback(() => {
      cargarReservas();
    }, [cargarReservas])
  );

  function obtenerNombreEspacio(reserva: ReservaGuardada): string {
    return reserva._nombreEspacio ??
      espacios.find((espacio) => espacio.id === reserva.espacioId)?.nombre ??
      `Espacio ${reserva.espacioId}`;
  }

  function sePuedeCancelar(reserva: Reserva): boolean {
    if (
      reserva.estado !== "confirmada" ||
      !reserva.cancelableHasta
    ) {
      return false;
    }

    const limite = new Date(
      reserva.cancelableHasta
    ).getTime();

    return (
      Number.isFinite(limite) &&
      Date.now() < limite
    );
  }

  async function ejecutarCancelacion(reserva: Reserva) {
    if (sinConexion || !(await hayConexion())) {
      Alert.alert("No hay conexión", "Necesitás Internet para cancelar una reserva.");
      return;
    }
    setCancelandoId(reserva.id);

    try {
      await cancelarReserva(reserva.id);
      if (usuario) {
        // Desactivar de inmediato el QR almacenado antes de resincronizar.
        await guardarReservaLocal(usuario.id, {
          ...reserva, estado: "cancelada", codigoQr: "",
        }).catch((e) => console.error("Error actualizando reserva local:", e));
      }

      Alert.alert(
        "Reserva cancelada",
        "La reserva se canceló correctamente."
      );

      await cargarReservas();
    } catch (err) {
      Alert.alert(
        "No se pudo cancelar",
        err instanceof Error
          ? err.message
          : "Intentá nuevamente."
      );
    } finally {
      setCancelandoId(null);
    }
  }

  function confirmarCancelacion(reserva: Reserva) {
    Alert.alert(
      "Cancelar reserva",
      "¿Estás seguro de que querés cancelar esta reserva?",
      [
        {
          text: "Volver",
          style: "cancel",
        },
        {
          text: "Sí, cancelar",
          style: "destructive",
          onPress: () => ejecutarCancelacion(reserva),
        },
      ]
    );
  }

  function renderizarReserva({ item }: { item: ReservaGuardada }) {
    const turno = turnosPorId[item.turnoId];
    const cancelable = !sinConexion && sePuedeCancelar(item);

    return (
      <View style={styles.tarjeta}>
        {/* Nombre de la cancha y estado */}
        <View style={styles.encabezado}>
          <Text style={styles.nombreEspacio}>
            {obtenerNombreEspacio(item)}
          </Text>

          <Text
            style={[
              styles.estado,
              item.estado === "confirmada"
                ? styles.confirmada
                : item.estado === "cancelada"
                  ? styles.cancelada
                  : styles.otroEstado,
            ]}
          >
            {nombresEstados[item.estado]}
          </Text>
        </View>

        {/* Fecha */}
        <View style={styles.fila}>
          <Ionicons
            name="calendar-outline"
            size={20}
            color="#1565C0"
          />

          <Text style={styles.detalle}>
            {turno
              ? formatearFecha(turno.fecha)
              : item._fecha ? formatearFecha(item._fecha) : "Fecha no disponible"}
          </Text>
        </View>

        {/* Horario */}
        <View style={styles.fila}>
          <Ionicons
            name="time-outline"
            size={20}
            color="#1565C0"
          />

          <Text style={styles.detalle}>
            {turno
              ? `${turno.inicio} a ${turno.fin}`
              : item._inicio && item._fin ? `${item._inicio} a ${item._fin}` : "Horario no disponible"}
          </Text>
        </View>

        {/* Cantidad de personas */}
        <View style={styles.fila}>
          <Ionicons
            name="people-outline"
            size={20}
            color="#1565C0"
          />

          <Text style={styles.detalle}>
            {item.cantidadPersonas}{" "}
            {item.cantidadPersonas === 1
              ? "persona"
              : "personas"}
          </Text>
        </View>

        <View style={styles.separador} />

        {item.estado === "confirmada" && (
        <Pressable
            style={styles.botonQR}
            onPress={() =>
            router.push({
                pathname: "/qr-reserva",
                params: { reservaId: item.id },
            })
            }
        >
            <Ionicons
            name="qr-code-outline"
            size={23}
            color="#FFFFFF"
            />

            <Text style={styles.textoBotonQR}>
            Ver QR de ingreso
            </Text>
        </Pressable>
        )}

        {sinConexion && item.estado === "confirmada" && (
          <Text style={styles.aviso}>Sin conexión: no se puede cancelar la reserva.</Text>
        )}

        {/* Cancelación */}
        {cancelable && (
          <>
            <Text style={styles.aviso}>
              Podés cancelar hasta el{" "}
              {new Date(
                item.cancelableHasta
              ).toLocaleString("es-AR")}.
            </Text>

            <Pressable
              style={[
                styles.botonCancelar,
                cancelandoId !== null &&
                  styles.botonDeshabilitado,
              ]}
              onPress={() => confirmarCancelacion(item)}
              disabled={cancelandoId !== null}
            >
              {cancelandoId === item.id ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.textoCancelar}>
                  Cancelar reserva
                </Text>
              )}
            </Pressable>
          </>
        )}

        {item.estado === "confirmada" && !cancelable && !sinConexion && (
          <Text style={styles.aviso}>
            El plazo de cancelación venció. Si necesitás
            cancelar, comunicate con el encargado.
          </Text>
        )}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ title: "Mis reservas" }}
      />

      <View style={styles.contenedor}>
        {/* Pestañas */}
        <View style={styles.pestanas}>
          <Pressable
            style={[
              styles.pestana,
              vista === "proximas" &&
                styles.pestanaActiva,
            ]}
            onPress={() => setVista("proximas")}
          >
            <Text
              style={[
                styles.textoPestana,
                vista === "proximas" &&
                  styles.textoPestanaActivo,
              ]}
            >
              Próximas
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.pestana,
              vista === "pasadas" &&
                styles.pestanaActiva,
            ]}
            onPress={async () => {
              if (!(await hayConexion())) {
                Alert.alert("No hay conexión", "El historial solo está disponible con Internet.");
                return;
              }
              setVista("pasadas");
            }}
          >
            <Text
              style={[
                styles.textoPestana,
                vista === "pasadas" &&
                  styles.textoPestanaActivo,
              ]}
            >
              Historial
            </Text>
          </Pressable>
        </View>

        {sinConexion && vista === "proximas" && !cargando && (
          <View style={styles.avisoOffline}>
            <Ionicons name="cloud-offline-outline" size={20} color="#E65100" />
            <Text style={styles.textoOffline}>
              Sin conexión. Se muestran reservas guardadas; su estado puede haber cambiado.
            </Text>
          </View>
        )}

        {cargando ? (
          <View style={styles.centrado}>
            <ActivityIndicator
              size="large"
              color="#1565C0"
            />

            <Text style={styles.textoSecundario}>
              Cargando tus reservas...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centrado}>
            <Text style={styles.error}>
              {error}
            </Text>

            <Pressable
              style={styles.botonReintentar}
              onPress={() => cargarReservas()}
            >
              <Text style={styles.textoBlanco}>
                Reintentar
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={reservas}
            keyExtractor={(item) => item.id}
            renderItem={renderizarReserva}
            contentContainerStyle={styles.lista}
            refreshControl={
              <RefreshControl
                refreshing={actualizando}
                onRefresh={() =>
                  cargarReservas(true)
                }
              />
            }
            ListHeaderComponent={
              <Text style={styles.contador}>
                {reservas.length}{" "}
                {reservas.length === 1
                  ? "reserva"
                  : "reservas"}
              </Text>
            }
            ListEmptyComponent={
              <View style={styles.centrado}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={60}
                  color="#BDBDBD"
                />

                <Text style={styles.textoSecundario}>
                  {vista === "proximas"
                    ? sinConexion ? "No hay reservas próximas guardadas. Consultalas una vez con Internet." : "No tenés reservas próximas."
                    : "No hay reservas en tu historial."}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  pestanas: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 8,
  },

  pestana: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
  },

  pestanaActiva: {
    backgroundColor: "#1565C0",
  },

  textoPestana: {
    color: "#555555",
    fontWeight: "600",
  },

  textoPestanaActivo: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  lista: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },

  contador: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 14,
  },

  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    gap: 13,
  },

  encabezado: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },

  nombreEspacio: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212121",
    flex: 1,
  },

  estado: {
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
  },

  confirmada: {
    color: "#2E7D32",
    backgroundColor: "#E8F5E9",
  },

  cancelada: {
    color: "#C62828",
    backgroundColor: "#FFEBEE",
  },

  otroEstado: {
    color: "#616161",
    backgroundColor: "#EEEEEE",
  },

  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  detalle: {
    color: "#424242",
    fontSize: 15,
    flex: 1,
  },

  separador: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginTop: 4,
  },

  identificador: {
    fontSize: 12,
    color: "#9E9E9E",
  },

  aviso: {
    fontSize: 13,
    color: "#795548",
    lineHeight: 19,
  },

  botonCancelar: {
    backgroundColor: "#C62828",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },

  botonDeshabilitado: {
    opacity: 0.6,
  },

  textoCancelar: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },

  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },

  textoSecundario: {
    fontSize: 15,
    color: "#757575",
    textAlign: "center",
  },

  error: {
    color: "#C62828",
    textAlign: "center",
    fontSize: 15,
  },

  botonReintentar: {
    backgroundColor: "#1565C0",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },

  textoBlanco: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  botonQR: {
    backgroundColor: "#1565C0",
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  avisoOffline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF3E0",
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
  },
  textoOffline: {
    color: "#E65100",
    flex: 1,
    fontSize: 13,
  },

  textoBotonQR: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});