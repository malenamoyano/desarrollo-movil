
import { Platform } from "react-native";
import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";

import { AuthProvider } from "../contextos/AuthContext";

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
    </AuthProvider>
  );
}
