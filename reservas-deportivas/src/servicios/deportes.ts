
import type { Deporte } from "../tipos/types";
import { deportesMock } from "../mocks/deportes";

export async function obtenerDeportes(): Promise<Deporte[]> {
  return deportesMock;
}

export async function obtenerDeportePorId(
  id: string
): Promise<Deporte | null> {
  return deportesMock.find(
    (deporte) => deporte.id === id
  ) ?? null;
}
