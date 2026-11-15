export interface PreferenciasCatalogo {
  deporteSeleccionado: string | null;
  complejoSeleccionado: string | null;
}

const CLAVE_PREFERENCIAS =
  "reservas_deportivas_preferencias_catalogo_v1";

const PREFERENCIAS_INICIALES: PreferenciasCatalogo = {
  deporteSeleccionado: null,
  complejoSeleccionado: null,
};

// Carga diferida para evitar inicializar SQLite
// innecesariamente al arrancar la aplicación.
async function obtenerAlmacenamiento() {
  const modulo = await import("expo-sqlite/kv-store");
  return modulo.default;
}

// Guardar los filtros seleccionados.
export async function guardarPreferenciasCatalogo(
  preferencias: PreferenciasCatalogo
): Promise<void> {
  const almacenamiento = await obtenerAlmacenamiento();

  await almacenamiento.setItemAsync(
    CLAVE_PREFERENCIAS,
    JSON.stringify(preferencias)
  );
}

// Recuperar los filtros guardados.
export async function obtenerPreferenciasCatalogo():
  Promise<PreferenciasCatalogo> {
  try {
    const almacenamiento = await obtenerAlmacenamiento();

    const contenido = await almacenamiento.getItemAsync(
      CLAVE_PREFERENCIAS
    );

    if (!contenido) {
      return { ...PREFERENCIAS_INICIALES };
    }

    const datos: unknown = JSON.parse(contenido);

    if (
      typeof datos !== "object" ||
      datos === null ||
      Array.isArray(datos)
    ) {
      return { ...PREFERENCIAS_INICIALES };
    }

    const preferencias = datos as Record<string, unknown>;

    return {
      deporteSeleccionado:
        typeof preferencias.deporteSeleccionado === "string"
          ? preferencias.deporteSeleccionado
          : null,

      complejoSeleccionado:
        typeof preferencias.complejoSeleccionado === "string"
          ? preferencias.complejoSeleccionado
          : null,
    };
  } catch (error) {
    console.warn(
      "No se pudieron recuperar las preferencias:",
      error
    );

    return { ...PREFERENCIAS_INICIALES };
  }
}

// Restablecer las preferencias.
export async function limpiarPreferenciasCatalogo():
  Promise<void> {
  const almacenamiento = await obtenerAlmacenamiento();

  await almacenamiento.removeItemAsync(CLAVE_PREFERENCIAS);
}

