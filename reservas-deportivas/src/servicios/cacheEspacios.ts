import type { Espacio } from "../tipos/types";

// Abrimos SQLite solamente cuando necesitamos usarla.
async function abrirBase() {
  const SQLite = await import("expo-sqlite");

  const db = await SQLite.openDatabaseAsync(
    "catalogo-offline.db"
  );

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS catalogo_cache (
      clave TEXT PRIMARY KEY NOT NULL,
      contenido TEXT NOT NULL,
      actualizado_en TEXT NOT NULL
    );
  `);

  return db;
}

// Guardar el catálogo consultado desde la API.
export async function guardarEspaciosLocales(
  espacios: Espacio[]
): Promise<void> {
  const db = await abrirBase();

  await db.runAsync(
    `INSERT INTO catalogo_cache
      (clave, contenido, actualizado_en)
     VALUES (?, ?, ?)
     ON CONFLICT(clave)
     DO UPDATE SET
       contenido = excluded.contenido,
       actualizado_en = excluded.actualizado_en`,
    "espacios",
    JSON.stringify(espacios),
    new Date().toISOString()
  );
}

// Recuperar las canchas guardadas, sin consultar Internet.
export async function obtenerEspaciosLocales(): Promise<
  Espacio[]
> {
  const db = await abrirBase();

  const resultado = await db.getFirstAsync<{
    contenido: string;
  }>(
    "SELECT contenido FROM catalogo_cache WHERE clave = ?",
    "espacios"
  );

  if (!resultado) {
    return [];
  }

  const datos: unknown = JSON.parse(resultado.contenido);

  return Array.isArray(datos)
    ? (datos as Espacio[])
    : [];
}

// Recuperar el detalle de una cancha sin conexión.
export async function obtenerEspacioLocalPorId(
  id: string
): Promise<Espacio | null> {
  const espacios = await obtenerEspaciosLocales();

  return (
    espacios.find((espacio) => espacio.id === id) ?? null
  );
}
