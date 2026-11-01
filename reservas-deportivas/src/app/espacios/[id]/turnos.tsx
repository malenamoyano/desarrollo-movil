import {
  useConexion,
  mostrarAvisoSinConexion,
} from "../../../hooks/useConexion";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { Turno } from "../../../tipos/types";
import { obtenerTurnosPorEspacio } from "../../../servicios/turnos";

function obtenerFechaISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function generarProximosDias() {
  const dias = [];
  const hoy = new Date();

  for (let i = 0; i < 7; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + i);

    dias.push({
      fecha: obtenerFechaISO(fecha),
      nombre: fecha.toLocaleDateString("es-AR", {
        weekday: "short",
      }),
      numero: fecha.getDate(),
      mes: fecha.toLocaleDateString("es-AR", {
        month: "short",
      }),
    });
  }

  return dias;
}

export default function DisponibilidadTurnos() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { sinConexion } = useConexion();

  const [dias] = useState(generarProximosDias);
  const [fechaSeleccionada, setFechaSeleccionada] =
    useState(dias[0].fecha);

  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (sinConexion) {
        mostrarAvisoSinConexion();
        router.back();
    }
  }, [sinConexion]);

  useEffect(() => {
    let activo = true;

    async function cargarTurnos() {
      if (sinConexion) {
        setCargando(false);
        return;
      }
      
      setCargando(true);  
      setError(null);
      setTurnos([]);

      try {
        if (!id) {
          throw new Error("No se identificó el espacio deportivo.");
        }

        const datos = await obtenerTurnosPorEspacio(
          id,
          fechaSeleccionada
        );

        if (activo) {
          setTurnos(datos);
        }
      } catch (e) {
        if (activo) {
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo consultar la disponibilidad."
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarTurnos();

    return () => {
      activo = false;
    };
  }, [id, fechaSeleccionada, recarga, sinConexion]);

  // Al seleccionar un turno libre, abrimos la
  // pantalla de confirmación con los datos del turno.
  function seleccionarTurno(turno: Turno) {
    if (turno.estado !== "libre") {
      return;
    }

    router.push({
      pathname: "/confirmar-reserva",
      params: {
        turnoId: turno.id,
        espacioId: turno.espacioId,
        fecha: turno.fecha,
        inicio: turno.inicio,
        fin: turno.fin,
      },
    });
  }

  function obtenerColor(estado: Turno["estado"]) {
    switch (estado) {
      case "libre":
        return "#E8F5E9";
      case "reservado":
        return "#FFEBEE";
      case "fijo":
        return "#FFF3E0";
      case "mantenimiento":
        return "#ECEFF1";
      default:
        return "#FFFFFF";
    }
  }

  function obtenerEtiqueta(estado: Turno["estado"]) {
    switch (estado) {
      case "libre":
        return "Disponible";
      case "reservado":
        return "Reservado";
      case "fijo":
        return "Turno fijo";
      case "mantenimiento":
        return "Mantenimiento";
      default:
        return estado;
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Disponibilidad",
          headerBackTitle: "Volver",
        }}
      />

      <ScrollView
        style={styles.pantalla}
        contentContainerStyle={styles.contenedor}
      >
        <Text style={styles.titulo}>
          Consultar disponibilidad
        </Text>

        <Text style={styles.descripcion}>
          Seleccioná un día para consultar los horarios de
          esta cancha. No necesitás iniciar sesión.
        </Text>

        <Text style={styles.subtitulo}>
          Próximos 7 días
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fechas}
        >
          {dias.map((dia) => {
            const seleccionado =
              fechaSeleccionada === dia.fecha;

            return (
              <Pressable
                key={dia.fecha}
                style={[
                  styles.tarjetaFecha,
                  seleccionado && styles.fechaActiva,
                ]}
                onPress={() =>
                  setFechaSeleccionada(dia.fecha)
                }
              >
                <Text
                  style={[
                    styles.nombreDia,
                    seleccionado && styles.textoActivo,
                  ]}
                >
                  {dia.nombre}
                </Text>

                <Text
                  style={[
                    styles.numeroDia,
                    seleccionado && styles.textoActivo,
                  ]}
                >
                  {dia.numero}
                </Text>

                <Text
                  style={[
                    styles.nombreDia,
                    seleccionado && styles.textoActivo,
                  ]}
                >
                  {dia.mes}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.encabezadoTurnos}>
          <Text style={styles.subtitulo}>
            Horarios
          </Text>

          <Pressable
            onPress={() => setRecarga((valor) => valor + 1)}
          >
            <Text style={styles.actualizar}>
              Actualizar
            </Text>
          </Pressable>
        </View>

        {cargando ? (
          <View style={styles.centrado}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.mensaje}>
              Consultando horarios...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centrado}>
            <Text style={styles.error}>
              {error}
            </Text>

            <Pressable
              onPress={() =>
                setRecarga((valor) => valor + 1)
              }
            >
              <Text style={styles.actualizar}>
                Reintentar
              </Text>
            </Pressable>
          </View>
        ) : turnos.length === 0 ? (
          <Text style={styles.mensaje}>
            No hay horarios publicados para este día.
          </Text>
        ) : (
          <View style={styles.grilla}>
            {turnos.map((turno) => {
              const disponible = turno.estado === "libre";

              return (
                <Pressable
                  key={turno.id}
                  disabled={!disponible}
                  onPress={() => seleccionarTurno(turno)}
                  style={[
                    styles.tarjetaTurno,
                    {
                      backgroundColor: obtenerColor(
                        turno.estado
                      ),
                    },
                  ]}
                >
                  <Text style={styles.horario}>
                    {turno.inicio} - {turno.fin}
                  </Text>

                  <Text
                    style={[
                      styles.estado,
                      disponible
                        ? styles.estadoDisponible
                        : styles.estadoNoDisponible,
                    ]}
                  >
                    {obtenerEtiqueta(turno.estado)}
                  </Text>

                  {disponible && (
                    <Text style={styles.precio}>
                      {turno.precio.toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                        maximumFractionDigits: 0,
                      })}
                    </Text>
                  )}

                  {!disponible &&
                    turno.motivoBloqueo && (
                      <Text style={styles.motivo}>
                        {turno.motivoBloqueo}
                      </Text>
                    )}
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.nota}>
          Los horarios se consultan en tiempo real.
          La disponibilidad puede cambiar hasta que
          se confirme la reserva.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  contenedor: {
    padding: 16,
    paddingBottom: 40,
  },

  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },

  descripcion: {
    fontSize: 15,
    color: "#666666",
    lineHeight: 22,
    marginBottom: 24,
  },

  subtitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 14,
  },

  fechas: {
    gap: 10,
    paddingBottom: 24,
  },

  tarjetaFecha: {
    width: 74,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },

  fechaActiva: {
    backgroundColor: "#1976D2",
    borderColor: "#1976D2",
  },

  nombreDia: {
    fontSize: 13,
    color: "#555555",
    textTransform: "capitalize",
  },

  numeroDia: {
    fontSize: 23,
    fontWeight: "bold",
    marginVertical: 5,
  },

  textoActivo: {
    color: "#FFFFFF",
  },

  encabezadoTurnos: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  actualizar: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1976D2",
  },

  centrado: {
    alignItems: "center",
    paddingVertical: 35,
    gap: 12,
  },

  mensaje: {
    color: "#666666",
    fontSize: 14,
    marginTop: 10,
  },

  error: {
    color: "#C62828",
    textAlign: "center",
    marginBottom: 12,
  },

  grilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },

  tarjetaTurno: {
    width: "48%",
    minHeight: 105,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    justifyContent: "center",
    gap: 6,
  },

  horario: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222222",
  },

  estado: {
    fontSize: 13,
    fontWeight: "600",
  },

  estadoDisponible: {
    color: "#2E7D32",
  },

  estadoNoDisponible: {
    color: "#555555",
  },

  precio: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2E7D32",
  },

  motivo: {
    fontSize: 12,
    color: "#666666",
  },

  nota: {
    marginTop: 24,
    fontSize: 13,
    lineHeight: 20,
    color: "#777777",
    textAlign: "center",
  },
});
