import type {
  Turno,
  Reserva,
  ReservaFija,
  Espacio,
} from "../../tipos/types";
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

interface RespuestaReservasFijas {
  datos: ReservaFija[];
  meta?: unknown;
}

interface RespuestaReservaFija {
  datos: ReservaFija;
  meta?: unknown;
}

interface RespuestaEspacio {
  datos: Espacio;
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

export async function obtenerReservasFijas(
  filtros: {
    espacioId?: string;
    activa?: boolean;
  } = {}
): Promise<ReservaFija[]> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error(
      "Debés iniciar sesión para consultar las reservas fijas."
    );
  }

  const parametros: string[] = [];

  if (filtros.espacioId) {
    parametros.push(
      `espacioId=${encodeURIComponent(filtros.espacioId)}`
    );
  }

  if (filtros.activa !== undefined) {
    parametros.push(`activa=${filtros.activa}`);
  }

  const query = parametros.length
    ? `?${parametros.join("&")}`
    : "";

  let respuesta: Response;

  try {
    respuesta = await fetch(`${API_URL}/fijas${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!respuesta.ok) {
    throw new Error(await obtenerMensajeError(respuesta));
  }

  const resultado: RespuestaReservasFijas =
    await respuesta.json();

  return resultado.datos;
}

export async function crearReservaFija(datos: {
  espacioId: string;
  titular: string;
  dia: ReservaFija["dia"];
  inicio: string;
  fin: string;
  desde: string;
  hasta?: string | null;
}): Promise<ReservaFija> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error(
      "Debés iniciar sesión para crear reservas fijas."
    );
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(`${API_URL}/fijas`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(datos),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!respuesta.ok) {
    throw new Error(await obtenerMensajeError(respuesta));
  }

  const resultado: RespuestaReservaFija =
    await respuesta.json();

  return resultado.datos;
}

export async function editarReservaFija(
  id: string,
  datos: Partial<
    Pick<
      ReservaFija,
      "espacioId" | "titular" | "dia" |
      "inicio" | "fin" | "desde" | "hasta"
    >
  >
): Promise<ReservaFija> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error(
      "Debés iniciar sesión para editar reservas fijas."
    );
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}/fijas/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(datos),
      }
    );
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!respuesta.ok) {
    throw new Error(await obtenerMensajeError(respuesta));
  }

  const resultado: RespuestaReservaFija =
    await respuesta.json();

  return resultado.datos;
}

export async function eliminarReservaFija(
  id: string
): Promise<void> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error(
      "Debés iniciar sesión para dar de baja reservas fijas."
    );
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}/fijas/${encodeURIComponent(id)}`,
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

export async function actualizarPrecioEspacio(
  espacioId: string,
  precioPorHora: number
): Promise<Espacio> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error(
      "Debés iniciar sesión para modificar precios."
    );
  }

  if (!Number.isInteger(precioPorHora) || precioPorHora <= 0) {
    throw new Error(
      "El precio debe ser un número entero mayor que cero."
    );
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}/espacios/${encodeURIComponent(espacioId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ precioPorHora }),
      }
    );
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!respuesta.ok) {
    throw new Error(await obtenerMensajeError(respuesta));
  }

  const resultado: RespuestaEspacio = await respuesta.json();

  return resultado.datos;
}