import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { obtenerAgenda } from "../../servicios/encargado/encargado";
import type { Turno } from "../../tipos/types";

function formatearFecha(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
    default:
      return "#757575";
  }
}

export default function Agenda() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [fecha, setFecha] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargarAgenda() {
      setCargando(true);
      setError(null);

      try {
        const datos = await obtenerAgenda(fecha);
        if (!activo) return;
        setTurnos(datos);
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

    cargarAgenda();

    return () => {
      activo = false;
    };
  }, [fecha]);

  const turnosOrdenados = [...turnos].sort(
    (a, b) => a.inicio.localeCompare(b.inicio)
  );

  function diaAnterior() {
    const d = new Date(fecha);
    d.setDate(d.getDate() - 1);
    setFecha(d.toISOString().split("T")[0]);
  }

  function diaSiguiente() {
    const d = new Date(fecha);
    d.setDate(d.getDate() + 1);
    setFecha(d.toISOString().split("T")[0]);
  }

  if (cargando) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.textoCargando}>Cargando agenda...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContenedor}>
        <Ionicons name="alert-circle-outline" size={56} color="#C62828" />
        <Text style={styles.tituloError}>No se pudo cargar la agenda</Text>
        <Text style={styles.mensajeError}>{error}</Text>
        <Pressable style={styles.botonReintentar} onPress={() => setFecha(fecha)}>
          <Text style={styles.textoBotonReintentar}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <View style={styles.header}>
        <Pressable style={styles.botonNavegacion} onPress={diaAnterior}>
          <Ionicons name="chevron-back-outline" size={24} color="#1565C0" />
        </Pressable>

        <Text style={styles.fechaActual}>
          {formatearFecha(fecha)}
        </Text>

        <Pressable style={styles.botonNavegacion} onPress={diaSiguiente}>
          <Ionicons name="chevron-forward-outline" size={24} color="#1565C0" />
        </Pressable>
      </View>

      <Text style={styles.subtitulo}>
        {turnosOrdenados.length} turno{turnosOrdenados.length !== 1 ? "s" : ""}
      </Text>

      {turnosOrdenados.length === 0 ? (
        <View style={styles.vacio}>
          <Ionicons name="calendar-outline" size={48} color="#9E9E9E" />
          <Text style={styles.textoVacio}>No hay turnos para esta fecha.</Text>
        </View>
      ) : (
        <FlatList
          data={turnosOrdenados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <Pressable style={styles.tarjetaTurno}>
              <View style={styles.horario}>
                <Text style={styles.horaInicio}>{item.inicio}</Text>
                <Text style={styles.horaFin}>{item.fin}</Text>
              </View>

              <View style={styles.detalleTurno}>
                <Text style={styles.espacioId}>
                  Espacio: {item.espacioId}
                </Text>
                {item.reservaId && (
                  <Text style={styles.reservaId}>
                    Reserva: {item.reservaId}
                  </Text>
                )}
              </View>

              <View style={styles.estadoContenedor}>
                <Text
                  style={[
                    styles.estadoTexto,
                    { color: obtenerColorEstado(item.estado) },
                  ]}
                >
                  {item.estado}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Ionicons name="calendar-outline" size={48} color="#9E9E9E" />
              <Text style={styles.textoVacio}>No hay turnos para esta fecha.</Text>
            </View>
          }
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
    justifyContent: "space-between",
    marginBottom: 20,
  },

  botonNavegacion: {
    padding: 8,
  },

  fechaActual: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#212121",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 1,
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