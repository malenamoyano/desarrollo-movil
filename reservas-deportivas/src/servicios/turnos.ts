
import type { Turno } from "../tipos/types";

const API_URL = "http://192.168.100.8:3000";

interface RespuestaTurnos {
  datos: Turno[];
  meta?: {
    total?: number;
    pagina: number;
    porPagina: number;
  };
}

export async function obtenerTurnosPorEspacio(
  espacioId: string,
  fecha: string
): Promise<Turno[]> {
  const url =
    `${API_URL}/espacios/${encodeURIComponent(espacioId)}/turnos` +
    `?fecha=${encodeURIComponent(fecha)}`;

  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error(
      `No se pudo consultar la disponibilidad (${respuesta.status})`
    );
  }

  const resultado: RespuestaTurnos = await respuesta.json();

  return resultado.datos;
}
