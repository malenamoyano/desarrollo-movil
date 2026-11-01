import type { Reserva } from "../tipos/types";
import { obtenerToken } from "./auth";

const API_URL = "http://192.168.100.8:3000";

interface RespuestaReservas {
  datos: Reserva[];
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

export async function obtenerMisReservas(
  cuando: "proximas" | "pasadas" = "proximas"
): Promise<Reserva[]> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error("Debés iniciar sesión para consultar tus reservas.");
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}/yo/reservas?cuando=${cuando}`,
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

  const resultado: RespuestaReservas = await respuesta.json();

  return resultado.datos;
}

export async function cancelarReserva(
  reservaId: string
): Promise<Reserva> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error("Debés iniciar sesión para cancelar una reserva.");
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}/reservas/${encodeURIComponent(reservaId)}/cancelacion`,
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

export async function crearReserva(
  turnoId: string,
  cantidadPersonas: number
): Promise<Reserva> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error(
      "Debés iniciar sesión para realizar una reserva."
    );
  }

  if (!Number.isInteger(cantidadPersonas) || cantidadPersonas < 1) {
    throw new Error(
      "La cantidad de personas debe ser un número mayor que cero."
    );
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(`${API_URL}/reservas`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        turnoId,
        cantidadPersonas,
      }),
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor. Revisá tu conexión."
    );
  }

  if (!respuesta.ok) {
    const cuerpo: {
      error?: {
        codigo?: string;
        mensaje?: string;
      };
    } = await respuesta.json().catch(() => ({}));

    throw new Error(
      cuerpo.error?.mensaje ??
        "No se pudo realizar la reserva."
    );
  }

  const resultado: {
    datos: Reserva;
    meta?: unknown;
  } = await respuesta.json();

  return resultado.datos;
}

export async function obtenerReservaPorId(
  reservaId: string
): Promise<Reserva> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error(
      "Debés iniciar sesión para consultar tu reserva."
    );
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}/reservas/${encodeURIComponent(reservaId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor."
    );
  }

  if (!respuesta.ok) {
    const cuerpo: {
      error?: {
        codigo?: string;
        mensaje?: string;
      };
    } = await respuesta.json().catch(() => ({}));

    throw new Error(
      cuerpo.error?.mensaje ??
        "No se pudo consultar la reserva."
    );
  }

  const resultado: {
    datos: Reserva;
    meta?: unknown;
  } = await respuesta.json();

  return resultado.datos;
}
