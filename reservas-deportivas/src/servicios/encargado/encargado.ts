import type { Turno, Reserva } from "../../tipos/types";
import { obtenerToken } from "../auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface RespuestaTurnos {
  datos: Turno[];
  meta?: unknown;
}

interface RespuestaReserva {
  datos: Reserva;
  meta?: unknown;
}

interface RespuestaError {
  error?: {
    codigo?: string;
    mensaje?: string;
  };
}

async function obtenerMensajeError(respuesta: Response): Promise<string> {
  const cuerpo: RespuestaError = await respuesta
    .json()
    .catch(() => ({}));

  return cuerpo.error?.mensaje ?? `Error del servidor (${respuesta.status}).`;
}

export async function obtenerAgenda(
  fecha: string
): Promise<Turno[]> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error("Debés iniciar sesión para consultar la agenda.");
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}/agenda?fecha=${encodeURIComponent(fecha)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!respuesta.ok) {
    throw new Error(await obtenerMensajeError(respuesta));
  }

  const resultado: RespuestaTurnos = await respuesta.json();

  return resultado.datos;
}

export async function registrarIngreso(
  codigoQr: string,
  espacioId: string
): Promise<Reserva> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error("Debés iniciar sesión para registrar el ingreso.");
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(`${API_URL}/ingresos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ codigoQr, espacioId }),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!respuesta.ok) {
    throw new Error(await obtenerMensajeError(respuesta));
  }

  const resultado: RespuestaReserva = await respuesta.json();

  return resultado.datos;
}

export async function registrarAusencia(
  reservaId: string
): Promise<Reserva> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error("Debés iniciar sesión para registrar la ausencia.");
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}/reservas/${encodeURIComponent(reservaId)}/ausente`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!respuesta.ok) {
    throw new Error(await obtenerMensajeError(respuesta));
  }

  const resultado: RespuestaReserva = await respuesta.json();

  return resultado.datos;
}