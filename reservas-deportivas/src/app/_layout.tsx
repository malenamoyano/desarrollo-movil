import { Stack } from "expo-router";
import { AuthProvider } from "../contextos/AuthContext";

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
      </Stack>
    </AuthProvider>
  );
}
