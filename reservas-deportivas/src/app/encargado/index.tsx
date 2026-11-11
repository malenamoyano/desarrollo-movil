
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../contextos/AuthContext";

export default function EncargadoIndex() {
  const { usuario, cerrarSesion } = useAuth();
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  async function salir() {
    try {
      setCerrandoSesion(true);
      await cerrarSesion();
      router.replace("/login");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo cerrar la sesión."
      );
    } finally {
      setCerrandoSesion(false);
    }
  }

  return (
    <View style={styles.contenedor}>
      <View style={styles.bienvenida}>
        <Text style={styles.titulo}>
          ¡Hola, {usuario?.nombre}!
        </Text>

        <Text style={styles.descripcion}>
          Desde acá podés gestionar las reservas de los
          espacios deportivos.
        </Text>
      </View>

      <Text style={styles.tituloSeccion}>
        Gestión de reservas
      </Text>

      <Pressable
        style={styles.tarjeta}
        onPress={() => router.push("/encargado/estado-cancha")}
      >
        <View style={styles.iconoContenedor}>
          <Ionicons name="images-outline" size={30} color="#1565C0" />
        </View>
        <View style={styles.contenidoTarjeta}>
          <Text style={styles.tituloTarjeta}>Estado de la cancha</Text>
          <Text style={styles.descripcionTarjeta}>
            Sacar o elegir fotos y subirlas para documentar el estado.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#757575" />
      </Pressable>


      <Pressable
        style={styles.tarjeta}
        onPress={() => router.push("/encargado/escanear")}
      >
        <View style={styles.iconoContenedor}>
          <Ionicons
            name="qr-code-outline"
            size={30}
            color="#1565C0"
          />
        </View>

        <View style={styles.contenidoTarjeta}>
          <Text style={styles.tituloTarjeta}>
            Escanear código QR
          </Text>

          <Text style={styles.descripcionTarjeta}>
            Validar reservas y registrar el ingreso de jugadores.
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={22}
          color="#757575"
        />
      </Pressable>

      <Pressable
        style={styles.tarjeta}
        onPress={() => router.push("/encargado/agenda")}
      >
        <View style={styles.iconoContenedor}>
          <Ionicons
            name="calendar-outline"
            size={30}
            color="#1565C0"
          />
        </View>

        <View style={styles.contenidoTarjeta}>
          <Text style={styles.tituloTarjeta}>
            Agenda diaria
          </Text>

          <Text style={styles.descripcionTarjeta}>
            Consultar turnos, reservas y controlar asistencias.
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={22}
          color="#757575"
        />
      </Pressable>

      <View style={styles.pie}>
        <Pressable
          style={[
            styles.botonSalir,
            cerrandoSesion && styles.botonDeshabilitado,
          ]}
          onPress={salir}
          disabled={cerrandoSesion}
        >
          {cerrandoSesion ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={21}
                color="#FFFFFF"
              />
              <Text style={styles.textoBoton}>
                Cerrar sesión
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 20,
  },

  bienvenida: {
    marginBottom: 30,
  },

  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212121",
    marginBottom: 8,
  },

  descripcion: {
    fontSize: 15,
    color: "#666666",
    lineHeight: 22,
  },

  tituloSeccion: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212121",
    marginBottom: 15,
  },

  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    elevation: 2,
  },

  iconoContenedor: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },

  contenidoTarjeta: {
    flex: 1,
    gap: 5,
  },

  tituloTarjeta: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#212121",
  },

  descripcionTarjeta: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 19,
  },

  pie: {
    marginTop: "auto",
    paddingTop: 20,
  },

  botonSalir: {
    backgroundColor: "#C62828",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },

  botonDeshabilitado: {
    opacity: 0.6,
  },

  textoBoton: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});
