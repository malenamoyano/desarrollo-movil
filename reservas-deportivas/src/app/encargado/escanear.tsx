import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { registrarIngreso } from "../../servicios/encargado/encargado";

export default function Escanear() {
  const [permission, setPermission] = useState<string | null>(null);
  const [codigoQr, setCodigoQr] = useState("");
  const [espacioId, setEspacioId] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pedir permiso de cámara al montar
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();

      setPermission(status);
    })();
  }, []);

  // Pantalla de carga mientras se resuelve el permiso
  if (permission === null) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.textoCargando}>Solicitando permiso de cámara...</Text>
      </View>
    );
  }

  // Si el usuario denegó el permiso
  if (permission !== "granted") {
    return (
      <View style={styles.centrado}>
        <Ionicons name="camera-outline" size={56} color="#C62828" />
        <Text style={styles.tituloSinPermiso}>
          Permiso de cámara requerido
        </Text>
        <Text style={styles.mensajeSinPermiso}>
          Para escanear códigos QR necesitás permitir el acceso a la cámara.
        </Text>
      </View>
    );
  }

  function manejarCodigo(datos: { data: string }) {
    if (codigoQr || error) return;

    let contenido: {
      codigoQr?: unknown;
      espacioId?: unknown;
    } | null;

    try {
      contenido = JSON.parse(datos.data);
    } catch {
      setError("El QR no tiene un formato válido.");
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
      return;
    }

    if (
      !contenido ||
      typeof contenido.codigoQr !== "string" ||
      !contenido.codigoQr.trim() ||
      typeof contenido.espacioId !== "string" ||
      !contenido.espacioId.trim()
    ) {
      setError(
        "El QR no contiene el código de reserva y el ID del espacio. Pedile al jugador que vuelva a abrir su QR actualizado."
      );

      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});

      return;
    }

    setCodigoQr(contenido.codigoQr.trim());
    setEspacioId(contenido.espacioId.trim());
    setError(null);

    // Vibración de confirmación al detectar un QR válido.
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {});
  }

  async function registrarIngresoReserva() {
    if (!codigoQr.trim()) {
      Alert.alert("Datos incompletos", "Escaneá primero un código QR válido.");
      return;
    }

    if (!espacioId.trim()) {
      Alert.alert(
        "Datos incompletos",
        "Ingresá el ID del espacio donde se registra el ingreso."
      );
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const reserva = await registrarIngreso(codigoQr.trim(), espacioId.trim());
      // Vibración de éxito (dos pulsos medios)
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Ingreso registrado",
        `Reserva ${reserva.id} validada correctamente.`
      );
      setCodigoQr("");
      setEspacioId("");
    } catch (err) {
      // Vibración de error (un pulso fuerte)
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const mensaje =
        err instanceof Error ? err.message : "Ocurrió un error inesperado.";
      setError(mensaje);
      Alert.alert("Error al registrar ingreso", mensaje);
    } finally {
      setCargando(false);
    }
  }

  function limpiarEscaneo() {
    setCodigoQr("");
    setEspacioId("");
    setError(null);
  }

  return (
    <View style={styles.contenedor}>
      {/* Vista de cámara */}
      <View style={styles.vistaCamara}>
        <CameraView
          style={styles.camara}
          facing="back"
          onBarcodeScanned={
            codigoQr || error ? undefined : manejarCodigo
          }
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
        <View style={styles.sobreCamara}>
          <Text style={styles.textoCamara}>
            Enfocá el código QR de la reserva
          </Text>
        </View>
      </View>

      {/* Formulario de datos */}
      <View style={styles.formulario}>
        {error && (
          <View style={styles.alertaError}>
            <Ionicons name="alert-circle-outline" size={20} color="#C62828" />
            <Text style={styles.textoError}>{error}</Text>
          </View>
        )}

        <Text style={styles.etiqueta}>Código QR escaneado</Text>
        <Text style={styles.valorQr}>{codigoQr || "—"}</Text>

        <Text style={styles.etiqueta}>ID del espacio</Text>
        <Text style={styles.valorQr}>
          {espacioId || "Se obtiene automáticamente del QR"}
        </Text>

        <Pressable
          style={[
            styles.botonRegistrar,
            cargando && styles.botonDeshabilitado,
          ]}
          onPress={registrarIngresoReserva}
          disabled={cargando || !codigoQr || !espacioId}
        >
          {cargando ? (
            <ActivityIndicator color="#FFFFFF" size={16} />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.textoBotonRegistrar}>
                Registrar ingreso
              </Text>
            </>
          )}
        </Pressable>

        {(codigoQr || error) && (
          <Pressable style={styles.botonLimpiar} onPress={limpiarEscaneo}>
            <Text style={styles.textoLimpiar}>
              {codigoQr ? "Escanear otro código" : "Intentar nuevamente"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  vistaCamara: {
    flex: 1,
    overflow: "hidden",
  },

  camara: {
    flex: 1,
  },

  sobreCamara: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },

  textoCamara: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
    textAlign: "center",
  },

  formulario: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 10,
  },

  alertaError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },

  textoError: {
    fontSize: 13,
    color: "#C62828",
  },

  etiqueta: {
    fontSize: 14,
    fontWeight: "600",
    color: "#212121",
  },

  valorQr: {
    fontSize: 16,
    color: "#1565C0",
    fontWeight: "bold",
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
  },

  inputEspacio: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#212121",
  },

  botonRegistrar: {
    backgroundColor: "#1565C0",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },

  botonDeshabilitado: {
    opacity: 0.6,
  },

  textoBotonRegistrar: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  botonLimpiar: {
    alignItems: "center",
    marginTop: 8,
  },

  textoLimpiar: {
    fontSize: 14,
    color: "#666666",
    textDecorationLine: "underline",
  },

  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  textoCargando: {
    marginTop: 12,
    color: "#666666",
    fontSize: 15,
  },

  tituloSinPermiso: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212121",
    marginTop: 16,
  },

  mensajeSinPermiso: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});