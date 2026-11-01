import * as SecureStore from "expo-secure-store";

import type { Usuario } from "../tipos/types";

const API_URL = "http://192.168.100.8:3000";
const CLAVE_TOKEN = "reservas_deportivas_token";

interface RespuestaSesion {
  token: string;
  usuario: Usuario;
}

interface RespuestaApi<T> {
  datos: T;
  meta: unknown;
}

interface ErrorApi {
  error?: {
    codigo: string;
    mensaje: string;
  };
}

async function solicitarSesion(
  ruta: string,
  datos: object
): Promise<RespuestaSesion> {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(datos),
  });

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    const error = resultado as ErrorApi;

    throw new Error(
      error.error?.mensaje ??
        `Error de autenticación (${respuesta.status})`
    );
  }

  const sesion = (resultado as RespuestaApi<RespuestaSesion>)
    .datos;

  if (!sesion?.token || !sesion?.usuario) {
    throw new Error("La API devolvió una sesión inválida.");
  }

  await SecureStore.setItemAsync(CLAVE_TOKEN, sesion.token);

  return sesion;
}

export async function iniciarSesion(
  email: string,
  contrasena: string
): Promise<RespuestaSesion> {
  return solicitarSesion("/auth/ingreso", {
    email: email.trim().toLowerCase(),
    contrasena,
  });
}

export async function registrarUsuario(
  nombre: string,
  email: string,
  contrasena: string,
  telefono: string
): Promise<RespuestaSesion> {
  return solicitarSesion("/auth/registro", {
    nombre: nombre.trim(),
    email: email.trim().toLowerCase(),
    contrasena,
    telefono: telefono.trim(),
  });
}

export async function obtenerToken(): Promise<string | null> {
  return SecureStore.getItemAsync(CLAVE_TOKEN);
}

export async function cerrarSesion(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_TOKEN);
}

export async function obtenerUsuarioActual(): Promise<Usuario | null> {
  const token = await obtenerToken();

  if (!token) {
    return null;
  }

  const respuesta = await fetch(`${API_URL}/yo`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (respuesta.status === 401) {
    await cerrarSesion();
    return null;
  }

  if (!respuesta.ok) {
    throw new Error(
      `No se pudo consultar el usuario (${respuesta.status})`
    );
  }

  const resultado: RespuestaApi<Usuario> =
    await respuesta.json();

  return resultado.datos;
}
