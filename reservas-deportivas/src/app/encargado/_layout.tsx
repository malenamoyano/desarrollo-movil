
import { Stack, Redirect } from "expo-router";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../contextos/AuthContext";

export default function EncargadoLayout() {
  const { usuario, cargandoSesion } = useAuth();

  // Esperamos a que se recupere la sesión.
  if (cargandoSesion) {
    return (
      <View style={styles.pantallaBloqueo}>
        <View style={styles.iconoBloqueo}>
          <Ionicons
            name="finger-print-outline"
            size={48}
            color="#1565C0"
          />
        </View>

        <Text style={styles.tituloBloqueo}>
          Reservas Deportivas
        </Text>

        <Text style={styles.descripcionBloqueo}>
          Estamos verificando tu acceso para proteger tu cuenta.
        </Text>

        <ActivityIndicator
          size="large"
          color="#1565C0"
        />

        <Text style={styles.textoSesionCargando}>
          Esperá un momento para continuar...
        </Text>
      </View>
    );
  }

  // Si no hay sesión, volvemos al login.
  if (!usuario) {
    return <Redirect href="/login" />;
  }

  // Solo encargado y administrador pueden ingresar.
  if (
    usuario.rol !== "encargado" &&
    usuario.rol !== "administrador"
  ) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerBackTitle: "Volver",
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Panel de gestión",
        }}
      />

      <Stack.Screen
        name="escanear"
        options={{
          title: "Escanear QR",
        }}
      />

      <Stack.Screen
        name="agenda"
        options={{
          title: "Agenda diaria",
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  pantallaBloqueo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F5F5F5",
    gap: 14,
  },

  iconoBloqueo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  tituloBloqueo: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#212121",
    textAlign: "center",
  },

  descripcionBloqueo: {
    fontSize: 15,
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },

  textoSesionCargando: {
    color: "#666666",
    fontSize: 14,
  },
});