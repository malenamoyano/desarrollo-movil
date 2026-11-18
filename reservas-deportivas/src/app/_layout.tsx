import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  View,
} from "react-native";

import { Stack, usePathname } from "expo-router";
import * as Notifications from "expo-notifications";

import {
  AuthProvider,
  useAuth,
} from "../contextos/AuthContext";

import {
  InicioListoContext,
} from "../contextos/InicioListoContext";

// CONFIGURACIÓN DE NOTIFICACIONES
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ContenidoPrincipal />
    </AuthProvider>
  );
}

function ContenidoPrincipal() {
  const { usuario, cargandoSesion } = useAuth();
  const pathname = usePathname();

  const [inicioListo, setInicioListo] =
    useState(false);

  const avisarInicioListo = useCallback(() => {
    setInicioListo(true);
  }, []);

  const esUsuarioGestion =
    usuario?.rol === "encargado" ||
    usuario?.rol === "administrador";

  const estaEnInicio =
    pathname === "/" || pathname === "/index";

  // No usamos temporizadores.
  // Esperamos la sesión y, cuando corresponde,
  // la carga inicial del catálogo.
  const mostrarPantallaCarga =
    cargandoSesion ||
    (estaEnInicio &&
      !esUsuarioGestion &&
      !inicioListo);

  return (
    <InicioListoContext.Provider
      value={{ avisarInicioListo }}
    >
      <View style={styles.contenedorPrincipal}>
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              title: "Espacios deportivos",
              headerTitleAlign: "center",
            }}
          />

          <Stack.Screen
            name="login"
            options={{
              title: "Iniciar sesión",
              headerBackTitle: "Volver",
            }}
          />

          <Stack.Screen
            name="perfil"
            options={{
              title: "Mi perfil",
              headerBackTitle: "Volver",
            }}
          />

          <Stack.Screen
            name="mis-reservas"
            options={{
              title: "Mis reservas",
              headerBackTitle: "Volver",
            }}
          />

          <Stack.Screen
            name="favoritos"
            options={{
              title: "Mis favoritos",
              headerBackTitle: "Volver",
            }}
          />

          <Stack.Screen
            name="confirmar-reserva"
            options={{
              title: "Confirmar reserva",
              headerBackTitle: "Volver",
            }}
          />

          <Stack.Screen
            name="qr-reserva"
            options={{
              title: "Código QR de ingreso",
              headerBackTitle: "Volver",
            }}
          />

          <Stack.Screen
            name="espacios/[id]"
            options={{
              title: "Detalle del espacio",
              headerBackTitle: "Volver",
            }}
          />

          <Stack.Screen
            name="espacios/[id]/turnos"
            options={{
              title: "Disponibilidad",
              headerBackTitle: "Volver",
            }}
          />

          <Stack.Screen
            name="mapa"
            options={{
              title: "Mapa de espacios",
              headerBackTitle: "Volver",
            }}
          />

          <Stack.Screen
            name="encargado"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="notificaciones"
            options={{
              title: "Notificaciones",
              headerBackTitle: "Volver",
            }}
          />
        </Stack>

        {mostrarPantallaCarga && (
          <View style={styles.pantallaCarga}>
            <Image
              source={require(
                "../../assets/images/logo-reservas.png"
              )}
              style={styles.logo}
              resizeMode="contain"
            />

            <ActivityIndicator
              size="small"
              color="#1565C0"
              style={styles.indicador}
            />
          </View>
        )}
      </View>
    </InicioListoContext.Provider>
  );
}

const styles = StyleSheet.create({
  contenedorPrincipal: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  pantallaCarga: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    elevation: 100,
  },

  logo: {
    width: 144,
    height: 144,
    borderRadius: 30,
  },

  indicador: {
    marginTop: 28,
  },
});