import type { Usuario } from "../tipos/types";
import { obtenerToken } from "./auth";

const API_URL = "http://192.168.100.8:3000";

interface RespuestaUsuario {
  datos: Usuario;
  meta?: unknown;
}

async function modificarFavorito(
  espacioId: string,
  metodo: "PUT" | "DELETE"
): Promise<void> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error("Debés iniciar sesión para guardar favoritos.");
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}/yo/espacios-favoritos/${encodeURIComponent(espacioId)}`,
      {
        method: metodo,
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
    const cuerpo: {
      error?: { mensaje?: string };
    } = await respuesta.json().catch(() => ({}));

    throw new Error(
      cuerpo.error?.mensaje ?? "No se pudo actualizar el favorito."
    );
  }

  // PUT devuelve el usuario actualizado.
  // DELETE devuelve 204, sin cuerpo.
  if (metodo === "PUT") {
    const resultado: RespuestaUsuario = await respuesta.json();

    if (!resultado.datos) {
      throw new Error("Respuesta inválida del servidor.");
    }
  }
}

export async function agregarFavorito(
  espacioId: string
): Promise<void> {
  await modificarFavorito(espacioId, "PUT");
}

export async function quitarFavorito(
  espacioId: string
): Promise<void> {
  await modificarFavorito(espacioId, "DELETE");
}
