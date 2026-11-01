
import { useEffect, useState } from "react";
import {
  router,
  Stack,
  useLocalSearchParams,
} from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../contextos/AuthContext";
import { obtenerEspacios } from "../servicios/espacios";
import { crearReserva } from "../servicios/reservas";
import type { Espacio } from "../tipos/types";

export default function ConfirmarReserva() {
  const { turnoId, espacioId, fecha, inicio, fin } =
    useLocalSearchParams<{
      turnoId: string;
      espacioId: string;
      fecha: string;
      inicio: string;
      fin: string;
    }>();

  const { usuario, cargandoSesion } = useAuth();

  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [cantidadPersonas, setCantidadPersonas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargarEspacio() {
      if (!espacioId) {
        setError("No se recibió el espacio seleccionado.");
        setCargando(false);
        return;
      }

      try {
        const espacios = await obtenerEspacios();

        if (!activo) return;

        const encontrado = espacios.find(
          (item) => item.id === espacioId
        );

        if (!encontrado) {
          throw new Error("No se encontró el espacio deportivo.");
        }

        setEspacio(encontrado);
      } catch (err) {
        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el espacio."
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarEspacio();

    return () => {
      activo = false;
    };
  }, [espacioId]);

  function formatearFecha(valor: string): string {
    const [anio, mes, dia] = valor.split("-").map(Number);

    if (!anio || !mes || !dia) return valor;

    return new Date(anio, mes - 1, dia).toLocaleDateString(
      "es-AR",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  }

  async function realizarReserva() {
    if (!turnoId || !espacio) {
      Alert.alert("Error", "Faltan datos del turno seleccionado.");
      return;
    }

    if (!usuario) {
      Alert.alert(
        "Iniciar sesión",
        "Debés iniciar sesión para confirmar una reserva.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Iniciar sesión",
            onPress: () => router.push("/login"),
          },
        ]
      );
      return;
    }

    if (
      cantidadPersonas < 1 ||
      cantidadPersonas > espacio.capacidad
    ) {
      Alert.alert(
        "Cantidad inválida",
        `La capacidad máxima es de ${espacio.capacidad} personas.`
      );
      return;
    }

    setConfirmando(true);

    try {
      await crearReserva(turnoId, cantidadPersonas);

      Alert.alert(
        "¡Reserva confirmada!",
        "Tu reserva se registró correctamente. Podés consultarla en Mis reservas.",
        [
          {
            text: "Ver mis reservas",
            onPress: () => router.replace("/mis-reservas"),
          },
          {
            text: "Volver al inicio",
            onPress: () => router.replace("/"),
          },
        ]
      );
    } catch (err) {
      Alert.alert(
        "No se pudo reservar",
        err instanceof Error
          ? err.message
          : "Ocurrió un error al realizar la reserva."
      );
    } finally {
      setConfirmando(false);
    }
  }

  if (cargando || cargandoSesion) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text>Cargando datos del turno...</Text>
      </View>
    );
  }

  if (error || !espacio || !turnoId) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.error}>
          {error ?? "No se encontró el turno."}
        </Text>
        <Pressable
          style={styles.botonPrincipal}
          onPress={() => router.back()}
        >
          <Text style={styles.textoBlanco}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Confirmar reserva" }} />

      <ScrollView
        style={styles.contenedor}
        contentContainerStyle={styles.contenido}
      >
        <Text style={styles.titulo}>
          Confirmá tu turno
        </Text>

        <View style={styles.tarjeta}>
          <Text style={styles.nombreEspacio}>
            {espacio.nombre}
          </Text>

          <Text style={styles.complejo}>
            {espacio.complejo}
          </Text>

          <View style={styles.fila}>
            <Ionicons
              name="calendar-outline"
              size={21}
              color="#1565C0"
            />
            <Text style={styles.detalle}>
              {formatearFecha(fecha)}
            </Text>
          </View>

          <View style={styles.fila}>
            <Ionicons
              name="time-outline"
              size={21}
              color="#1565C0"
            />
            <Text style={styles.detalle}>
              {inicio} a {fin}
            </Text>
          </View>

          <View style={styles.fila}>
            <Ionicons
              name="people-outline"
              size={21}
              color="#1565C0"
            />
            <Text style={styles.detalle}>
              Capacidad máxima: {espacio.capacidad} personas
            </Text>
          </View>
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.tituloSeccion}>
            Cantidad de personas
          </Text>

          <Text style={styles.ayuda}>
            Indicá cuántas personas utilizarán la cancha.
          </Text>

          <View style={styles.selector}>
            <Pressable
              style={styles.botonCantidad}
              onPress={() =>
                setCantidadPersonas((actual) =>
                  Math.max(1, actual - 1)
                )
              }
              disabled={cantidadPersonas <= 1}
            >
              <Ionicons name="remove" size={25} color="#1565C0" />
            </Pressable>

            <Text style={styles.numero}>
              {cantidadPersonas}
            </Text>

            <Pressable
              style={styles.botonCantidad}
              onPress={() =>
                setCantidadPersonas((actual) =>
                  Math.min(espacio.capacidad, actual + 1)
                )
              }
              disabled={cantidadPersonas >= espacio.capacidad}
            >
              <Ionicons name="add" size={25} color="#1565C0" />
            </Pressable>
          </View>
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.tituloSeccion}>
            Precio del turno
          </Text>

          <Text style={styles.precio}>
            {espacio.precioPorHora.toLocaleString("es-AR", {
              style: "currency",
              currency: "ARS",
              maximumFractionDigits: 0,
            })}
          </Text>

          <Text style={styles.ayuda}>
            Precio de referencia del espacio por hora.
          </Text>
        </View>

        {!usuario && (
          <View style={styles.aviso}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#1565C0"
            />
            <Text style={styles.textoAviso}>
              Necesitás iniciar sesión para confirmar el turno.
            </Text>
          </View>
        )}

        <Pressable
          style={[
            styles.botonPrincipal,
            confirmando && styles.botonDeshabilitado,
          ]}
          onPress={realizarReserva}
          disabled={confirmando}
        >
          {confirmando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.textoBlanco}>
              {usuario
                ? "Confirmar reserva"
                : "Iniciar sesión para reservar"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  contenido: {
    padding: 16,
    paddingBottom: 36,
    gap: 16,
  },
  titulo: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#212121",
    marginBottom: 4,
  },
  tarjeta: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 14,
    gap: 14,
  },
  nombreEspacio: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#212121",
  },
  complejo: {
    fontSize: 14,
    color: "#757575",
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detalle: {
    fontSize: 15,
    color: "#424242",
    flex: 1,
  },
  tituloSeccion: {
    fontSize: 17,
    fontWeight: "bold",
  },
  ayuda: {
    fontSize: 13,
    color: "#757575",
  },
  selector: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 28,
    paddingVertical: 10,
  },
  botonCantidad: {
    backgroundColor: "#E3F2FD",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  numero: {
    fontSize: 28,
    fontWeight: "bold",
    minWidth: 40,
    textAlign: "center",
  },
  precio: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  aviso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    backgroundColor: "#E3F2FD",
    borderRadius: 10,
  },
  textoAviso: {
    flex: 1,
    fontSize: 14,
    color: "#1565C0",
  },
  botonPrincipal: {
    backgroundColor: "#1565C0",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 11,
    alignItems: "center",
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoBlanco: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  error: {
    color: "#C62828",
    textAlign: "center",
    fontSize: 15,
  },
});
