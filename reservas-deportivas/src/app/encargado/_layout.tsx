
import { Stack, Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../../contextos/AuthContext";

export default function EncargadoLayout() {
  const { usuario, cargandoSesion } = useAuth();

  // Esperamos a que se recupere la sesión.
  if (cargandoSesion) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator size="large" color="#1565C0" />
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
    }}
  >
      <Stack.Screen
        name="index"
        options={{
          title: "Panel de gestión",
        }}
      />

      <Stack.Screen
        name="estado-cancha"
        options={{ title: "Estado de la cancha", headerShown: true }}
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
  cargando: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
});
