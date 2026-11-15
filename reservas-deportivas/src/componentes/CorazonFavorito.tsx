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
import { useConexion } from "../hooks/useConexion";

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
  const { sinConexion } = useConexion();

  const [guardando, setGuardando] = useState(false);

  const esFavorito =
    usuario?.espaciosFavoritos?.includes(espacioId) ?? false;

  async function alternarFavorito() {
    // Sin Internet solo permitimos consultar el estado.
    if (sinConexion) {
      return;
    }

    if (!usuario) {
      Alert.alert(
        "Iniciar sesión",
        "Iniciá sesión para guardar tus canchas favoritas.",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
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

      // Recuperar el usuario actualizado desde GET /yo.
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
      disabled={guardando || sinConexion}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{
        disabled: guardando || sinConexion,
      }}
      accessibilityLabel={
        sinConexion
          ? esFavorito
            ? "Cancha favorita guardada"
            : "Cancha no marcada como favorita"
          : esFavorito
            ? "Quitar de favoritos"
            : "Agregar a favoritos"
      }
    >
      {guardando ? (
        <ActivityIndicator
          color="#C62828"
          size="small"
        />
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
