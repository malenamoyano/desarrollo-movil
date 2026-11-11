
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import Storage from "expo-sqlite/kv-store";

const CLAVE_BIOMETRIA =
  "reservas_deportivas_biometria_habilitada";

export default function Seguridad() {
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [biometriaDisponible, setBiometriaDisponible] =
    useState(false);

  const [biometriaActiva, setBiometriaActiva] =
    useState(false);

  const [tiposSoportados, setTiposSoportados] =
    useState<number[]>([]);

  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let componenteActivo = true;

    async function cargarConfiguracion() {
      try {
        const [
          tieneHardware,
          tieneBiometriaRegistrada,
          tipos,
          preferenciaGuardada,
        ] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          LocalAuthentication.supportedAuthenticationTypesAsync(),
          Storage.getItem(CLAVE_BIOMETRIA),
        ]);

        const admiteHuella = tipos.includes(
          LocalAuthentication.AuthenticationType.FINGERPRINT
        );

        const admiteRostro = tipos.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        );

        const disponible =
          tieneHardware &&
          tieneBiometriaRegistrada &&
          (admiteHuella || admiteRostro);

        if (!componenteActivo) return;

        setBiometriaDisponible(disponible);
        setTiposSoportados(tipos);

        if (preferenciaGuardada === "true" && disponible) {
          setBiometriaActiva(true);
        } else {
          setBiometriaActiva(false);

          if (preferenciaGuardada === "true" && !disponible) {
            await Storage.setItem(CLAVE_BIOMETRIA, "false");
          }
        }

        if (!tieneHardware) {
          setMensaje(
            "Este dispositivo no cuenta con un lector biométrico compatible. Podés continuar utilizando tu contraseña."
          );
        } else if (!tieneBiometriaRegistrada) {
          setMensaje(
            "No hay huellas o reconocimiento facial configurados. Configuralos desde los ajustes del teléfono para activar esta función."
          );
        } else if (!admiteHuella && !admiteRostro) {
          setMensaje(
            "Este dispositivo no dispone de un método biométrico compatible."
          );
        }
      } catch (error) {
        console.error("Error al cargar seguridad:", error);

        if (componenteActivo) {
          setMensaje(
            "No se pudo comprobar la disponibilidad de la biometría."
          );
        }
      } finally {
        if (componenteActivo) {
          setCargando(false);
        }
      }
    }

    cargarConfiguracion();

    return () => {
      componenteActivo = false;
    };
  }, []);

  const admiteHuella = tiposSoportados.includes(
    LocalAuthentication.AuthenticationType.FINGERPRINT
  );

  const admiteRostro = tiposSoportados.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
  );

  let nombreMetodo = "Autenticación biométrica";

  if (admiteHuella && admiteRostro) {
    nombreMetodo = "Huella o reconocimiento facial";
  } else if (admiteHuella) {
    nombreMetodo = "Huella digital";
  } else if (admiteRostro) {
    nombreMetodo = "Reconocimiento facial";
  }

  async function cambiarBiometria(activar: boolean) {
    if (procesando) return;

    setProcesando(true);

    try {
      // Desactivar el acceso biométrico.
      if (!activar) {
        await Storage.setItem(CLAVE_BIOMETRIA, "false");

        setBiometriaActiva(false);

        setMensaje(
          "El acceso biométrico está desactivado. Podés ingresar con tu contraseña."
        );

        return;
      }

      // Volver a comprobar el dispositivo antes de activarlo.
      const [
        tieneHardware,
        tieneBiometriaRegistrada,
        tipos,
      ] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);

      const compatible =
        tieneHardware &&
        tieneBiometriaRegistrada &&
        tipos.some(
          (tipo) =>
            tipo ===
              LocalAuthentication.AuthenticationType.FINGERPRINT ||
            tipo ===
              LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        );

      if (!compatible) {
        setBiometriaDisponible(false);

        Alert.alert(
          "Biometría no disponible",
          "Configurá una huella o reconocimiento facial en tu dispositivo para utilizar esta función."
        );

        return;
      }

      setBiometriaDisponible(true);
      setTiposSoportados(tipos);

      // Solicitar autenticación para confirmar la activación.
      const resultado =
        await LocalAuthentication.authenticateAsync({
          promptMessage:
            "Verificá tu identidad para activar el acceso biométrico",
          cancelLabel: "Cancelar",
          disableDeviceFallback: true,
        });

      if (!resultado.success) {
        Alert.alert(
          "Autenticación no completada",
          "No se activó el acceso biométrico. Podés intentarlo nuevamente."
        );

        return;
      }

      // Guardar la preferencia solamente si la autenticación fue exitosa.
      await Storage.setItem(CLAVE_BIOMETRIA, "true");

      setBiometriaActiva(true);

      setMensaje(
        "El acceso biométrico está activado correctamente."
      );

      Alert.alert(
        "Acceso biométrico activado",
        "La próxima vez que abras la aplicación podrás identificarte mediante la biometría de tu dispositivo."
      );
    } catch (error) {
      console.error("Error al configurar biometría:", error);

      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo modificar la configuración biométrica."
      );
    } finally {
      setProcesando(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Seguridad",
          headerBackTitle: "Volver",
        }}
      />

      <ScrollView
        style={styles.contenedor}
        contentContainerStyle={styles.contenido}
      >
        {cargando ? (
          <View style={styles.centrado}>
            <ActivityIndicator
              size="large"
              color="#1565C0"
            />

            <Text style={styles.textoSecundario}>
              Comprobando seguridad del dispositivo...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.tarjeta}>
              <View style={styles.encabezado}>
                <View style={styles.icono}>
                  <Ionicons
                    name="finger-print-outline"
                    size={32}
                    color="#1565C0"
                  />
                </View>

                <View style={styles.datos}>
                  <Text style={styles.titulo}>
                    Acceso biométrico
                  </Text>

                  <Text style={styles.descripcion}>
                    Utilizá tu huella digital o el reconocimiento
                    facial para recuperar tu sesión.
                  </Text>
                </View>
              </View>

              <View style={styles.separador} />

              <View style={styles.fila}>
                <View style={styles.textos}>
                  <Text style={styles.etiqueta}>
                    {nombreMetodo}
                  </Text>

                  <Text style={styles.textoSecundario}>
                    {biometriaActiva ? "Activado" : "Desactivado"}
                  </Text>
                </View>

                <Switch
                  value={biometriaActiva}
                  onValueChange={cambiarBiometria}
                  disabled={!biometriaDisponible || procesando}
                  trackColor={{
                    false: "#BDBDBD",
                    true: "#81C784",
                  }}
                  thumbColor={
                    biometriaActiva ? "#2E7D32" : "#F5F5F5"
                  }
                />

                {procesando && (
                  <ActivityIndicator color="#1565C0" />
                )}
              </View>
            </View>

            {mensaje !== "" && (
              <View style={styles.aviso}>
                <Ionicons
                  name={
                    biometriaDisponible
                      ? "information-circle-outline"
                      : "alert-circle-outline"
                  }
                  size={23}
                  color="#1565C0"
                />

                <Text style={styles.textoAviso}>
                  {mensaje}
                </Text>
              </View>
            )}

            <View style={styles.tarjeta}>
              <View style={styles.filaInformacion}>
                <Ionicons
                  name="lock-closed-outline"
                  size={25}
                  color="#1565C0"
                />

                <Text style={styles.titulo}>
                  Acceso con contraseña
                </Text>
              </View>

              <Text style={styles.descripcion}>
                Siempre podrás utilizar tu correo electrónico
                y contraseña para iniciar sesión, especialmente
                cuando tu dispositivo no tenga biometría disponible.
              </Text>
            </View>

            <Text style={styles.nota}>
              Los datos biométricos permanecen protegidos por el
              sistema operativo del dispositivo. La aplicación no
              almacena huellas ni imágenes del rostro.
            </Text>
          </>
        )}
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
    flexGrow: 1,
    padding: 16,
    paddingBottom: 36,
    gap: 18,
  },

  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    gap: 16,
  },

  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  icono: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },

  datos: {
    flex: 1,
    gap: 5,
  },

  titulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#212121",
  },

  descripcion: {
    fontSize: 14,
    color: "#757575",
    lineHeight: 21,
  },

  separador: {
    height: 1,
    backgroundColor: "#EEEEEE",
  },

  fila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  textos: {
    flex: 1,
    gap: 4,
  },

  etiqueta: {
    fontSize: 15,
    fontWeight: "600",
    color: "#212121",
  },

  textoSecundario: {
    fontSize: 13,
    color: "#757575",
  },

  aviso: {
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  textoAviso: {
    flex: 1,
    fontSize: 13,
    color: "#1565C0",
    lineHeight: 20,
  },

  filaInformacion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  nota: {
    fontSize: 12,
    color: "#757575",
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
