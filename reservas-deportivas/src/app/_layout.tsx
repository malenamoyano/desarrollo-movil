import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Espacios deportivos",
          headerTitleAlign: "center",
        }}
      />

      <Stack.Screen
        name="espacios/[id]"
        options={{
          title: "Detalle del espacio",
          headerBackTitle: "Volver",
        }}
      />
    </Stack>
  );
}
