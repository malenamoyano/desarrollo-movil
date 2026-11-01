
import { useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../contextos/AuthContext";
import {
  agregarFavorito,
  quitarFavorito,
} from "../servicios/favoritos";

interface Props {
  espacioId: string;
  tamano?: number;
}

export default function CorazonFavorito({
  espacioId,
  tamano = 26,
}: Props) {
  const { usuario, actualizarSesion } = useAuth();
  const [guardando, setGuardando] = useState(false);

  const esFavorito =
    usuario?.espaciosFavoritos?.includes(espacioId) ?? false;

  async function alternarFavorito() {
    if (!usuario) {
      Alert.alert(
        "Iniciar sesión",
        "Iniciá sesión para guardar tus canchas favoritas.",
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

    if (guardando) return;

    setGuardando(true);

    try {
      if (esFavorito) {
        await quitarFavorito(espacioId);
      } else {
        await agregarFavorito(espacioId);
      }

      // Actualiza el usuario del contexto desde GET /yo.
      // Así el catálogo y la pantalla de favoritos quedan sincronizados.
      await actualizarSesion();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el favorito."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Pressable
      style={styles.boton}
      onPress={alternarFavorito}
      disabled={guardando}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"
      }
    >
      {guardando ? (
        <ActivityIndicator color="#C62828" size="small" />
      ) : (
        <Ionicons
          name={esFavorito ? "heart" : "heart-outline"}
          size={tamano}
          color={esFavorito ? "#E53935" : "#757575"}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
});
