import { useCallback, useState } from "react";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import * as Network from "expo-network";

import type { Reserva } from "../tipos/types";
import { obtenerReservaPorId } from "../servicios/reservas";
import { useAuth } from "../contextos/AuthContext";
import {
  guardarReservaLocal,
  obtenerReservaLocal,
} from "../servicios/almacenamientoLocal";

export default function QRReserva() {
  const { reservaId } = useLocalSearchParams<{
    reservaId: string;
  }>();

  const { usuario, cargandoSesion } = useAuth();

  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modoSinConexion, setModoSinConexion] = useState(false);

  const cargarReserva = useCallback(async () => {
    setCargando(true);
    setError(null);
    setReserva(null);
    setModoSinConexion(false);

    try {
      if (!reservaId) {
        throw new Error(
          "No se recibió el identificador de la reserva."
        );
      }

      if (!usuario) {
        throw new Error(
          "Necesitás iniciar sesión para consultar este código QR."
        );
      }

      // Comprobar el estado de la conexión.
      let sinConexion = false;

      try {
        const estadoRed = await Network.getNetworkStateAsync();

        sinConexion =
          estadoRed.isConnected === false ||
          estadoRed.isInternetReachable === false;
      } catch {
        // Si no podemos determinar la conectividad,
        // intentamos consultar primero el servidor.
      }

      if (!sinConexion) {
        try {
          // Obtener la información actual desde el backend.
          const datos = await obtenerReservaPorId(reservaId);

          setReserva(datos);

          // Guardar el QR actualizado para uso sin conexión.
          try {
            await guardarReservaLocal(usuario.id, datos);
          } catch (errorGuardado) {
            console.error(
              "No se pudo guardar el QR localmente:",
              errorGuardado
            );
          }

          return;
        } catch (errorServidor) {
          // Si la API responde un error, no mostramos una
          // copia antigua como si siguiera vigente.
          // El modo offline se reserva para fallos de red.
          const estadoActual = await Network.getNetworkStateAsync()
            .catch(() => null);

          const conexionPerdida =
            estadoActual?.isConnected === false ||
            estadoActual?.isInternetReachable === false;

          if (!conexionPerdida) {
            throw errorServidor;
          }
        }
      }

      // Sin conexión: recuperar la copia guardada en SQLite.
      const reservaGuardada = await obtenerReservaLocal(
        usuario.id,
        reservaId
      );

      if (!reservaGuardada) {
        throw new Error(
          "No hay una copia local de esta reserva. Abrí el QR " +
            "con Internet al menos una vez para guardarlo."
        );
      }

      setReserva(reservaGuardada);
      setModoSinConexion(true);
    } catch (err) {
      setReserva(null);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el código QR."
      );
    } finally {
      setCargando(false);
    }
  }, [reservaId, usuario]);

  useFocusEffect(
    useCallback(() => {
      if (!cargandoSesion) {
        cargarReserva();
      }
    }, [cargarReserva, cargandoSesion])
  );

  const qrDisponible =
    reserva?.estado === "confirmada" &&
    typeof reserva.codigoQr === "string" &&
    reserva.codigoQr.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Código QR de ingreso",
          headerBackTitle: "Volver",
        }}
      />

      <ScrollView
        style={styles.pantalla}
        contentContainerStyle={styles.contenido}
      >
        {cargando || cargandoSesion ? (
          <View style={styles.centrado}>
            <ActivityIndicator
              size="large"
              color="#1565C0"
            />

            <Text style={styles.secundario}>
              Cargando código QR...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centrado}>
            <Ionicons
              name="alert-circle-outline"
              size={56}
              color="#C62828"
            />

            <Text style={styles.error}>
              {error}
            </Text>

            <Pressable
              style={styles.boton}
              onPress={cargarReserva}
            >
              <Text style={styles.textoBoton}>
                Reintentar
              </Text>
            </Pressable>
          </View>
        ) : reserva && qrDisponible ? (
          <>
            <View style={styles.encabezado}>
              <Ionicons
                name="checkmark-circle"
                size={52}
                color="#2E7D32"
              />

              <Text style={styles.titulo}>
                {modoSinConexion
                  ? "QR guardado"
                  : "Reserva confirmada"}
              </Text>

              <Text style={styles.secundario}>
                Presentá este código QR al encargado cuando
                llegues a la instalación deportiva.
              </Text>
            </View>

            {/* Aviso cuando los datos son locales */}
            {modoSinConexion && (
              <View style={styles.avisoOffline}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={23}
                  color="#E65100"
                />

                <Text style={styles.textoOffline}>
                  Estás viendo una copia guardada sin conexión.
                  El estado de la reserva puede haber cambiado
                  desde la última sincronización.
                </Text>
              </View>
            )}

            <View style={styles.tarjeta}>
              <View style={styles.contenedorQR}>
                <QRCode
                  value={reserva.codigoQr}
                  size={240}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                  ecl="H"
                />
              </View>

              <Text style={styles.mensajeQR}>
                Acercá el código a la cámara del encargado
                para registrar tu ingreso.
              </Text>

              <View style={styles.separador} />

              <View style={styles.fila}>
                <Ionicons
                  name="people-outline"
                  size={21}
                  color="#1565C0"
                />

                <Text style={styles.detalle}>
                  {reserva.cantidadPersonas}{" "}
                  {reserva.cantidadPersonas === 1
                    ? "persona"
                    : "personas"}
                </Text>
              </View>

              <View style={styles.fila}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={21}
                  color="#2E7D32"
                />

                <Text style={styles.detalle}>
                  Estado:{" "}
                  {modoSinConexion
                    ? "Confirmada (última sincronización)"
                    : "Confirmada"}
                </Text>
              </View>
            </View>

            <View style={styles.aviso}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color="#1565C0"
              />

              <Text style={styles.textoAviso}>
                Este código es personal y corresponde a tu reserva.
                La validación definitiva del ingreso
                corresponde al servidor.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.centrado}>
            <Ionicons
              name="qr-code-outline"
              size={64}
              color="#9E9E9E"
            />

            <Text style={styles.titulo}>
              Código QR no disponible
            </Text>

            <Text style={styles.secundario}>
              Esta reserva no está confirmada o todavía
              no tiene un código QR asignado.
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  contenido: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
    flexGrow: 1,
  },

  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 40,
  },

  encabezado: {
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },

  titulo: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#212121",
    textAlign: "center",
  },

  secundario: {
    color: "#757575",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },

  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    gap: 20,
  },

  contenedorQR: {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },

  mensajeQR: {
    fontSize: 14,
    color: "#424242",
    textAlign: "center",
    lineHeight: 21,
  },

  separador: {
    width: "100%",
    height: 1,
    backgroundColor: "#EEEEEE",
  },

  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },

  detalle: {
    fontSize: 15,
    color: "#424242",
    flex: 1,
  },

  aviso: {
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    gap: 12,
  },

  textoAviso: {
    flex: 1,
    fontSize: 13,
    color: "#1565C0",
    lineHeight: 20,
  },

  avisoOffline: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },

  textoOffline: {
    flex: 1,
    fontSize: 13,
    color: "#E65100",
    lineHeight: 20,
  },

  error: {
    fontSize: 15,
    color: "#C62828",
    textAlign: "center",
  },

  boton: {
    backgroundColor: "#1565C0",
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: 10,
  },

  textoBoton: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
});
