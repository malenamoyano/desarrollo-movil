
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import Storage from "expo-sqlite/kv-store";

import * as Network from "expo-network";

import type { Usuario } from "../tipos/types";

import {
  cerrarSesion as eliminarSesion,
  iniciarSesion as autenticar,
  obtenerToken,
  obtenerUsuarioActual,
} from "../servicios/auth";

import {
  guardarUsuarioLocal,
  obtenerUsuarioLocal,
  eliminarUsuarioLocal,
} from "../servicios/sesionLocal";

const CLAVE_BIOMETRIA =
  "reservas_deportivas_biometria_habilitada";

interface AuthContextType {
  usuario: Usuario | null;
  cargandoSesion: boolean;
  iniciarSesion: (
    email: string,
    contrasena: string
  ) => Promise<Usuario>;
  cerrarSesion: () => Promise<void>;
  actualizarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

function esErrorDeConexion(error: unknown): boolean {
  const mensaje =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return [
    "fetch failed",
    "failed to fetch",
    "network request failed",
    "network error",
    "networkerror",
    "noroutetohostexception",
    "host unreachable",
    "network is unreachable",
    "connection refused",
    "econnrefused",
    "ehostunreach",
    "etimedout",
    "enotfound",
    "timeout",
  ].some((texto) => mensaje.includes(texto));
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const autenticacionBiometricaVerificada = useRef(false);

  const actualizarSesion = useCallback(async () => {
    const token = await obtenerToken();

    if (!token) {
      setUsuario(null);
      autenticacionBiometricaVerificada.current = false;
      return;
    }

    // Comprobar si el usuario activó el acceso biométrico
    const biometriaHabilitada = await Storage.getItem(
      CLAVE_BIOMETRIA
    );

    if (
      biometriaHabilitada === "true" &&
      !autenticacionBiometricaVerificada.current
    ) {
      try {
        // Comprobar las capacidades del dispositivo
        const [
          tieneHardware,
          tieneBiometriaRegistrada,
          tipos,
        ] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          LocalAuthentication.supportedAuthenticationTypesAsync(),
        ]);

        const admiteBiometria = tipos.some(
          (tipo) =>
            tipo ===
              LocalAuthentication.AuthenticationType.FINGERPRINT ||
            tipo ===
              LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        );

        // Si no hay biometría disponible, solicitar acceso tradicional
        if (
          !tieneHardware ||
          !tieneBiometriaRegistrada ||
          !admiteBiometria
        ) {
          setUsuario(null);

          Alert.alert(
            "Acceso biométrico no disponible",
            "No se pudo utilizar la huella o el reconocimiento facial. Iniciá sesión con tu correo y contraseña para continuar."
          );

          return;
        }

        // Solicitar identificación biométrica
        const resultado =
          await LocalAuthentication.authenticateAsync({
            promptMessage:
              "Desbloqueá tu sesión de Reservas Deportivas",
            cancelLabel: "Cancelar",
            disableDeviceFallback: true,
          });

        if (!resultado.success) {
          setUsuario(null);

          Alert.alert(
            "Autenticación no completada",
            "Para continuar, iniciá sesión con tu correo y contraseña."
          );

          return;
        }

        // La identidad fue verificada correctamente
        autenticacionBiometricaVerificada.current = true;

      } catch (error) {
        console.warn(
          "No se pudo completar la autenticación biométrica:",
          error
        );

        setUsuario(null);

        Alert.alert(
          "Error de autenticación",
          "No se pudo verificar tu identidad. Iniciá sesión con tu correo y contraseña para continuar."
        );

        return;
      }
    }

    // A partir de acá continúa la recuperación habitual de la sesión
    const usuarioGuardado = await obtenerUsuarioLocal();

    const estadoRed = await Network.getNetworkStateAsync().catch(
      () => null
    );

    const sinConexion =
      estadoRed?.isConnected === false ||
      estadoRed?.isInternetReachable === false;

    if (sinConexion) {
      setUsuario(usuarioGuardado);
      return;
    }

    try {
      const usuarioActual = await obtenerUsuarioActual();

      if (!usuarioActual) {
        setUsuario(null);

        throw new Error(
          "No se pudo recuperar el usuario de la sesión."
        );
      }

      await guardarUsuarioLocal(usuarioActual);
      setUsuario(usuarioActual);

    } catch (error) {
      if (esErrorDeConexion(error)) {
        console.warn(
          "No se pudo conectar con la API. " +
            "Se utilizará el perfil local."
        );

        setUsuario(usuarioGuardado);
        return;
      }

      setUsuario(null);
      throw error;
    }
  }, []);

  useEffect(() => {
    async function recuperarSesion() {
      try {
        await actualizarSesion();
      } catch (error) {
        console.warn(
          "Error al recuperar la sesión:",
          error
        );
      } finally {
        setCargandoSesion(false);
      }
    }

    recuperarSesion();
  }, [actualizarSesion]);

  async function iniciarSesion(
    email: string,
    contrasena: string
  ): Promise<Usuario> {
    const sesion = await autenticar(email, contrasena);

    autenticacionBiometricaVerificada.current = true;

    setUsuario(sesion.usuario);

    try {
      await guardarUsuarioLocal(sesion.usuario);
    } catch (error) {
      console.warn(
        "No se pudo guardar el perfil local:",
        error
      );
    }

    return sesion.usuario;
  }

  async function cerrarSesion(): Promise<void> {
    const usuarioActual = usuario;

    // Importar SQLite solamente al cerrar sesión.
    if (usuarioActual) {
      const { eliminarReservasLocales } = await import(
        "../servicios/almacenamientoLocal"
      );

      await eliminarReservasLocales(usuarioActual.id);
    }

    await eliminarUsuarioLocal();
    await eliminarSesion();

    autenticacionBiometricaVerificada.current = false;

    setUsuario(null);
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargandoSesion,
        iniciarSesion,
        cerrarSesion,
        actualizarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider"
    );
  }

  return contexto;
}
