import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../contextos/AuthContext";

export default function EncargadoIndex() {
  const { usuario} = useAuth();

  <Stack.Screen options={{ title: "Panel de gestión" }} />

  return (
    <View style={styles.contenedor}>
      <View style={styles.seccionUsuario}>
        <Text style={styles.textoBienvenida}>
          ¡Hola, {usuario?.nombre}!
        </Text>

        <Text style={styles.descripcion}>
          Desde acá podés gestionar las reservas de los
          espacios deportivos.
        </Text>

        <Pressable
          style={styles.botonPerfil}
          onPress={() => router.push("/encargado/perfil")}
        >
          <Ionicons
            name="person-circle-outline"
            size={22}
            color="#FFFFFF"
          />

          <Text style={styles.textoBotonPerfil}>
            Mi perfil
          </Text>
        </Pressable>
      </View>

      <Text style={styles.tituloSeccion}>
        Gestión de reservas
      </Text>

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

    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 20,
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

seccionUsuario: {
  marginBottom: 18,
},

textoBienvenida: {
  fontSize: 16,
  fontWeight: "bold",
  color: "#333333",
  marginBottom: 10,
},

botonPerfil: {
  backgroundColor: "#1565C0",
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "row",
  gap: 10,
},

textoBotonPerfil: {
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: "bold",
},
});
