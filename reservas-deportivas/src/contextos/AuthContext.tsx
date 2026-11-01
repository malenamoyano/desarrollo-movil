
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

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

  const actualizarSesion = useCallback(async () => {
    const token = await obtenerToken();

    if (!token) {
      setUsuario(null);
      return;
    }

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
