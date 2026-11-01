
import type { Espacio } from "../tipos/types";
import { espaciosMock } from "../mocks/espacios";

export async function obtenerEspacios(): Promise<Espacio[]> {
  return espaciosMock.filter((espacio) => espacio.activo);
}

export async function obtenerEspacioPorId(
  id: string
): Promise<Espacio | null> {
  return espaciosMock.find((espacio) => espacio.id === id) ?? null;
}
