
import * as SQLite from "expo-sqlite";
import type { Reserva } from "../tipos/types";

const NOMBRE_BD = "reservas_deportivas.db";

let promesaBD: Promise<SQLite.SQLiteDatabase> | null = null;

async function obtenerBD(): Promise<SQLite.SQLiteDatabase> {
  if (!promesaBD) {
    promesaBD = (async () => {
      const db = await SQLite.openDatabaseAsync(NOMBRE_BD);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reservas_locales (
          usuario_id TEXT NOT NULL,
          reserva_id TEXT NOT NULL,
          datos TEXT NOT NULL,
          actualizada_en TEXT NOT NULL,
          PRIMARY KEY (usuario_id, reserva_id)
        );
      `);

      return db;
    })().catch((error) => {
      promesaBD = null;
      throw error;
    });
  }

  return promesaBD;
}

export async function guardarReservasLocales(
  usuarioId: string,
  reservas: Reserva[]
): Promise<void> {
  const db = await obtenerBD();

  await db.withTransactionAsync(async () => {
    for (const reserva of reservas) {
      await db.runAsync(
        `INSERT OR REPLACE INTO reservas_locales
          (usuario_id, reserva_id, datos, actualizada_en)
         VALUES (?, ?, ?, ?)`,
        [
          usuarioId,
          reserva.id,
          JSON.stringify(reserva),
          new Date().toISOString(),
        ]
      );
    }
  });
}

export async function guardarReservaLocal(
  usuarioId: string,
  reserva: Reserva
): Promise<void> {
  await guardarReservasLocales(usuarioId, [reserva]);
}

export async function obtenerReservasLocales(
  usuarioId: string
): Promise<Reserva[]> {
  const db = await obtenerBD();

  const filas = await db.getAllAsync<{ datos: string }>(
    `SELECT datos
     FROM reservas_locales
     WHERE usuario_id = ?
     ORDER BY actualizada_en DESC`,
    [usuarioId]
  );

  return filas.map((fila) => JSON.parse(fila.datos) as Reserva);
}

export async function obtenerReservaLocal(
  usuarioId: string,
  reservaId: string
): Promise<Reserva | null> {
  const db = await obtenerBD();

  const fila = await db.getFirstAsync<{ datos: string }>(
    `SELECT datos
     FROM reservas_locales
     WHERE usuario_id = ? AND reserva_id = ?`,
    [usuarioId, reservaId]
  );

  return fila ? (JSON.parse(fila.datos) as Reserva) : null;
}

export async function eliminarReservasLocales(
  usuarioId: string
): Promise<void> {
  const db = await obtenerBD();

  await db.runAsync(
    "DELETE FROM reservas_locales WHERE usuario_id = ?",
    [usuarioId]
  );
}
