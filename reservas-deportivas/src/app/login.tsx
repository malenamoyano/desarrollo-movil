import { Stack, router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputInstance,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "expo-router/react-navigation";

import { useAuth } from "../contextos/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  
  const [mostrarContrasena, setMostrarConstrasena] = useState(false);
  const alturaHeader = useHeaderHeight();
  const refContrasena = useRef<TextInputInstance>(null);

  
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
            onPress: () => {
              if (usuario.rol === "jugador") {
                router.replace("/");
              } else if (
                usuario.rol === "encargado" ||
                usuario.rol === "administrador"
              ) {
                router.replace("/encargado");
              }
            },
          }
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
        behavior="padding"
        keyboardVerticalOffset={alturaHeader}
      >
        <ScrollView
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
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
              returnKeyType="next"
              onSubmitEditing={() => refContrasena.current?.focus()}
            />

            <Text style={styles.etiqueta}>
              Contraseña
            </Text>
            <View style={styles.contenedorContrasena}>
              <TextInput
                ref={refContrasena}
                style={styles.inputContrasena}
                placeholder="Ingresá tu contraseña"
                secureTextEntry={!mostrarContrasena}
                autoComplete="password"
                textContentType="password"
                value={contrasena}
                onChangeText={setContrasena}
                editable={!cargando}
                returnKeyType="done"
                onSubmitEditing={() => {
                  void ingresar();
                }}
              />
              <Pressable
                onPress={() => setMostrarConstrasena((visible) => !visible)}
                style={styles.botonOjo}
                hitSlop={10}
                disabled={cargando}
                accessibilityRole="button"
                accessibilityLabel={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <Ionicons 
                  name={mostrarContrasena ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#555"
                />

              </Pressable>
            </View>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  contenido: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },

  contenedorContrasena: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  inputContrasena: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },

  botonOjo: {
    paddingHorizontal: 12,
    paddingVertical: 10,
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