
import { useState } from "react";
import { router, Stack } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../contextos/AuthContext";

export default function PerfilEncargado() {
  const { usuario, cerrarSesion } = useAuth();

  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  async function salir() {
    setCerrandoSesion(true);

    try {
      await cerrarSesion();
      router.replace("/login");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo cerrar la sesión. Intentá nuevamente."
      );
    } finally {
      setCerrandoSesion(false);
    }
  }

  function confirmarCierreSesion() {
    Alert.alert(
      "Cerrar sesión",
      "¿Querés cerrar tu sesión?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: salir,
        },
      ]
    );
  }

  const nombreRol =
    usuario?.rol === "administrador"
      ? "Administrador"
      : "Encargado";

  return (
    <>
      <Stack.Screen
        options={{
          title: "Mi perfil",
          headerShown: true,
          headerBackTitle: "Volver",
          headerTitleAlign: "center",
        }}
      />

      <ScrollView
        style={styles.contenedor}
        contentContainerStyle={styles.contenido}
      >
        {/* Información del usuario */}
        <View style={styles.tarjetaUsuario}>
          <View style={styles.avatar}>
            <Ionicons
              name="person"
              size={34}
              color="#1565C0"
            />
          </View>

          <View style={styles.datosUsuario}>
            <Text style={styles.nombreUsuario}>
              {usuario?.nombre ?? "Usuario"}
            </Text>

            <Text style={styles.rolUsuario}>
              {nombreRol}
            </Text>
          </View>
        </View>

        {/* Opciones del perfil */}
        <View style={styles.tarjetaOpciones}>
          <Pressable
            style={styles.opcion}
            onPress={() => router.push("/seguridad")}
          >
            <View style={styles.iconoOpcion}>
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color="#1565C0"
              />
            </View>

            <View style={styles.textosOpcion}>
              <Text style={styles.tituloOpcion}>
                Seguridad
              </Text>

              <Text style={styles.descripcionOpcion}>
                Acceso biométrico y contraseña
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#9E9E9E"
            />
          </Pressable>
        </View>

        {/* Cierre de sesión */}
        <Pressable
          style={styles.botonCerrarSesion}
          onPress={confirmarCierreSesion}
          disabled={cerrandoSesion}
        >
          {cerrandoSesion ? (
            <ActivityIndicator color="#C62828" />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={23}
                color="#C62828"
              />

              <Text style={styles.textoCerrarSesion}>
                Cerrar sesión
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  contenido: {
    padding: 16,
    paddingBottom: 36,
    gap: 20,
  },

  tarjetaUsuario: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },

  datosUsuario: {
    flex: 1,
  },

  nombreUsuario: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#212121",
  },

  rolUsuario: {
    fontSize: 14,
    color: "#757575",
    marginTop: 5,
  },

  tarjetaOpciones: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
  },

  opcion: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },

  iconoOpcion: {
    width: 38,
    alignItems: "center",
  },

  textosOpcion: {
    flex: 1,
    gap: 4,
  },

  tituloOpcion: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
  },

  descripcionOpcion: {
    fontSize: 13,
    color: "#757575",
  },

  botonCerrarSesion: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  textoCerrarSesion: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#C62828",
  },
});
