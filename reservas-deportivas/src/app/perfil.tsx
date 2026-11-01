import { router, Stack } from "expo-router";
import { useState } from "react";
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

import { useAuth } from "../contextos/AuthContext";
import {
  useConexion,
  mostrarAvisoSinConexion,
} from "../hooks/useConexion";

type NombreIcono = React.ComponentProps<typeof Ionicons>["name"];

interface OpcionPerfil {
  titulo: string;
  descripcion: string;
  icono: NombreIcono;
}

const opciones: OpcionPerfil[] = [
  {
    titulo: "Mis reservas",
    descripcion: "Consultar y cancelar reservas",
    icono: "calendar-outline",
  },
  {
    titulo: "Notificaciones",
    descripcion: "Recordatorios y preferencias",
    icono: "notifications-outline",
  },
  {
    titulo: "Mis favoritos",
    descripcion: "Espacios deportivos guardados",
    icono: "heart-outline",
  },
  {
    titulo: "Datos personales",
    descripcion: "Consultar y editar mis datos",
    icono: "person-outline",
  },
  {
    titulo: "Seguridad",
    descripcion: "Acceso biométrico y contraseña",
    icono: "shield-checkmark-outline",
  },
];

export default function Perfil() {
  const { usuario, cargandoSesion, cerrarSesion } = useAuth();
  const { sinConexion } = useConexion();

  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  async function salir() {
    setCerrandoSesion(true);

    try {
      await cerrarSesion();
      router.replace("/");
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

  function abrirOpcion(titulo: string) {
    // Mis reservas funciona tanto online como offline.
    if (titulo === "Mis reservas") {
      router.push("/mis-reservas");
      return;
    }

    // Las demás opciones requieren conexión a Internet.
    if (sinConexion) {
      mostrarAvisoSinConexion();
      return;
    }

    if (titulo === "Mis favoritos") {
      router.push("/favoritos");
      return;
    }

    // Pantallas pendientes de implementación.
    Alert.alert(
      titulo,
      "Esta sección se implementará en los próximos pasos."
    );
  }

  if (cargandoSesion) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator
          size="large"
          color="#1565C0"
        />

        <Text style={styles.textoSecundario}>
          Recuperando sesión...
        </Text>
      </View>
    );
  }

  if (!usuario) {
    return (
      <View style={styles.centrado}>
        <Ionicons
          name="person-circle-outline"
          size={72}
          color="#9E9E9E"
        />

        <Text style={styles.tituloVacio}>
          No iniciaste sesión
        </Text>

        <Text style={styles.textoSecundario}>
          Iniciá sesión para acceder a tu perfil.
        </Text>

        <Pressable
          style={styles.botonPrincipal}
          onPress={() => {
            if (sinConexion) {
              mostrarAvisoSinConexion();
            } else {
              router.replace("/login");
            }
          }}
        >
          <Text style={styles.textoBotonPrincipal}>
            Iniciar sesión
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Mi perfil",
          headerBackTitle: "Volver",
        }}
      />

      <ScrollView
        style={styles.contenedor}
        contentContainerStyle={styles.contenido}
      >
        {/* Encabezado del usuario */}
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
              {usuario.nombre}
            </Text>

            <Text style={styles.rolUsuario}>
              Usuario
            </Text>
          </View>
        </View>

        {/* Aviso de conexión */}
        {sinConexion && (
          <View style={styles.avisoSinConexion}>
            <Ionicons
              name="cloud-offline-outline"
              size={23}
              color="#E65100"
            />

            <View style={styles.contenidoAviso}>
              <Text style={styles.tituloAviso}>
                Modo sin conexión
              </Text>

              <Text style={styles.textoAviso}>
                Podés consultar tus próximas reservas guardadas
                y presentar sus códigos QR.
              </Text>
            </View>
          </View>
        )}

        {/* Opciones del perfil */}
        <View style={styles.tarjetaOpciones}>
          {opciones.map((opcion, indice) => {
            const requiereConexion =
              opcion.titulo !== "Mis reservas";

            const opcionSinConexion =
              sinConexion && requiereConexion;

            return (
              <Pressable
                key={opcion.titulo}
                style={[
                  styles.opcion,
                  indice < opciones.length - 1 &&
                    styles.bordeInferior,
                ]}
                onPress={() => abrirOpcion(opcion.titulo)}
              >
                <View style={styles.iconoOpcion}>
                  <Ionicons
                    name={opcion.icono}
                    size={24}
                    color={
                      opcionSinConexion
                        ? "#9E9E9E"
                        : "#1565C0"
                    }
                  />
                </View>

                <View style={styles.textosOpcion}>
                  <Text
                    style={[
                      styles.tituloOpcion,
                      opcionSinConexion &&
                        styles.textoDeshabilitado,
                    ]}
                  >
                    {opcion.titulo}
                  </Text>

                  <Text style={styles.descripcionOpcion}>
                    {opcionSinConexion
                      ? "Requiere conexión a Internet"
                      : opcion.descripcion}
                  </Text>
                </View>

                <Ionicons
                  name={
                    opcionSinConexion
                      ? "cloud-offline-outline"
                      : "chevron-forward"
                  }
                  size={20}
                  color="#9E9E9E"
                />
              </Pressable>
            );
          })}
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

  avisoSinConexion: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },

  contenidoAviso: {
    flex: 1,
    gap: 5,
  },

  tituloAviso: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#E65100",
  },

  textoAviso: {
    fontSize: 13,
    color: "#795548",
    lineHeight: 20,
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

  bordeInferior: {
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
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

  textoDeshabilitado: {
    color: "#9E9E9E",
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

  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
    backgroundColor: "#F5F5F5",
  },

  tituloVacio: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#333333",
  },

  textoSecundario: {
    fontSize: 15,
    color: "#757575",
    textAlign: "center",
  },

  botonPrincipal: {
    backgroundColor: "#1565C0",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },

  textoBotonPrincipal: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
