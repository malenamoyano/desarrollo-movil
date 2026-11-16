import type { Turno, Reserva } from "../../tipos/types";
import type { Bloqueo } from "../../tipos/api";
import { obtenerToken } from "../auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface RespuestaTurnos {
  datos: Turno[];
  meta?: unknown;
}

interface RespuestaReservas {
  datos: Reserva[];
  meta?: unknown;
}

interface RespuestaBloqueos {
  datos: Bloqueo[];
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

export async function obtenerReservasPorFecha(
  fecha: string
): Promise<Reserva[]> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error(
      "Debés iniciar sesión para consultar las reservas."
    );
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}/reservas?fecha=${encodeURIComponent(fecha)}`,
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

export async function obtenerBloqueos(
  filtros: {
    espacioId?: string;
    desde?: string;
  } = {}
): Promise<Bloqueo[]> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error(
      "Debés iniciar sesión para consultar los bloqueos."
    );
  }

  const parametros: string[] = [];

  if (filtros.espacioId) {
    parametros.push(
      `espacioId=${encodeURIComponent(filtros.espacioId)}`
    );
  }

  if (filtros.desde) {
    parametros.push(
      `desde=${encodeURIComponent(filtros.desde)}`
    );
  }

  const query = parametros.length
    ? `?${parametros.join("&")}`
    : "";

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}/bloqueos${query}`,
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

  const resultado: RespuestaBloqueos =
    await respuesta.json();

  return resultado.datos;
}

export async function crearBloqueos(datos: {
  espacioIds: string[];
  fecha: string;
  inicio?: string;
  fin?: string;
  motivo: string;
}): Promise<Bloqueo[]> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error(
      "Debés iniciar sesión para crear bloqueos."
    );
  }

  if (datos.espacioIds.length === 0) {
    throw new Error("Seleccioná al menos un espacio.");
  }

  if (!datos.motivo.trim()) {
    throw new Error("El motivo del bloqueo es obligatorio.");
  }

  if (Boolean(datos.inicio) !== Boolean(datos.fin)) {
    throw new Error(
      "Debés indicar tanto la hora de inicio como la de finalización."
    );
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(`${API_URL}/bloqueos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        espacioIds: datos.espacioIds,
        fecha: datos.fecha,
        ...(datos.inicio && datos.fin
          ? {
              inicio: datos.inicio,
              fin: datos.fin,
            }
          : {}),
        motivo: datos.motivo.trim(),
      }),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!respuesta.ok) {
    throw new Error(await obtenerMensajeError(respuesta));
  }

  const resultado: RespuestaBloqueos =
    await respuesta.json();

  return resultado.datos;
}

export async function eliminarBloqueo(
  bloqueoId: string
): Promise<void> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error(
      "Debés iniciar sesión para eliminar bloqueos."
    );
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}/bloqueos/${encodeURIComponent(bloqueoId)}`,
      {
        method: "DELETE",
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
}