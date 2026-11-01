
import * as SecureStore from "expo-secure-store";
import type { Usuario } from "../tipos/types";

const CLAVE_USUARIO = "reservas_deportivas_usuario";

export async function guardarUsuarioLocal(
  usuario: Usuario
): Promise<void> {
  await SecureStore.setItemAsync(
    CLAVE_USUARIO,
    JSON.stringify(usuario)
  );
}

export async function obtenerUsuarioLocal(): Promise<Usuario | null> {
  const datos = await SecureStore.getItemAsync(CLAVE_USUARIO);

  if (!datos) {
    return null;
  }

  try {
    const usuario = JSON.parse(datos) as Usuario;

    if (
      typeof usuario.id !== "string" ||
      typeof usuario.nombre !== "string"
    ) {
      return null;
    }

    return usuario;
  } catch {
    return null;
  }
}

export async function eliminarUsuarioLocal(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_USUARIO);
}
