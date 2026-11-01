import { Stack, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../contextos/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);

  const { iniciarSesion } = useAuth();

  async function ingresar() {
    if (!email.trim() || !contrasena) {
      Alert.alert(
        "Datos incompletos",
        "Ingresá tu correo electrónico y contraseña."
      );
      return;
    }

    setCargando(true);

    try {
      const usuario = await iniciarSesion(email, contrasena);

      Alert.alert(
        "Inicio de sesión exitoso",
        `¡Bienvenido, ${usuario.nombre}!`,
        [
          {
            text: "Continuar",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "No se pudo iniciar sesión",
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Iniciar sesión",
        }}
      />

      <KeyboardAvoidingView
        style={styles.contenedor}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.tarjeta}>
          <Text style={styles.titulo}>
            Bienvenido
          </Text>

          <Text style={styles.descripcion}>
            Iniciá sesión para reservar espacios deportivos.
          </Text>

          <Text style={styles.etiqueta}>
            Correo electrónico
          </Text>

          <TextInput
            style={styles.input}
            placeholder="ejemplo@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            editable={!cargando}
          />

          <Text style={styles.etiqueta}>
            Contraseña
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ingresá tu contraseña"
            secureTextEntry
            autoComplete="password"
            value={contrasena}
            onChangeText={setContrasena}
            editable={!cargando}
          />

          <Pressable
            style={[
              styles.boton,
              cargando && styles.botonDeshabilitado,
            ]}
            onPress={ingresar}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.textoBoton}>
                Iniciar sesión
              </Text>
            )}
          </Pressable>

          <Text style={styles.aviso}>
            ¿Todavía no tenés una cuenta? Próximamente
            podrás registrarte desde la aplicación.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F5F5F5",
  },

  tarjeta: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 16,
    gap: 10,
  },

  titulo: {
    fontSize: 27,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },

  descripcion: {
    fontSize: 15,
    color: "#666666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },

  etiqueta: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#444444",
    marginTop: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },

  boton: {
    backgroundColor: "#1976D2",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 18,
  },

  botonDeshabilitado: {
    opacity: 0.6,
  },

  textoBoton: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  aviso: {
    fontSize: 13,
    color: "#777777",
    textAlign: "center",
    marginTop: 20,
    lineHeight: 20,
  },
});