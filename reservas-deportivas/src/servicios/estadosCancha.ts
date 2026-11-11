//Guardar o leer reportes en SQLite
import type { ReporteEstadoNuevo, ReporteEstado } from "../tipos/estadoCancha";
import { obtenerBD } from "./almacenamientoLocal";

interface FilaReporte {
  id: string;
  usuario_id: string;
  espacio_id: string;
  espacio_nombre: string;
  fecha: string;
  nota: string;
  urls: string;
  creado_en: string;
}

let tablaLista: Promise<void> | null = null;

function asegurarTabla(): Promise<void> {
  if(!tablaLista) {
    tablaLista = (async () => {
      const db = await obtenerBD();

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reportes_estado (
          id TEXT PRIMARY KEY NOT NULL,
          usuario_id TEXT NOT NULL,
          espacio_id TEXT NOT NULL,
          espacio_nombre TEXT NOT NULL,
          fecha TEXT NOT NULL,
          nota TEXT NOT NULL,
          urls TEXT NOT NULL,
          creado_en TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_reportes_estado_espacio
          ON reportes_estado (espacio_id, creado_en DESC);
        `);
    })().catch((error) => {
      tablaLista = null;
      throw error;
    });
  }

  return tablaLista;
}

function aReporte(fila: FilaReporte): ReporteEstado {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    espacioId: fila.espacio_id,
    espacioNombre: fila.espacio_nombre,
    fecha: fila.fecha,
    nota: fila.nota,
    urls: JSON.parse(fila.urls) as string[],
    creadoEn: fila.creado_en,
  };
}

export async function guardarReporteEstado(
  reporte: ReporteEstadoNuevo
): Promise<ReporteEstado> {
  await asegurarTabla();
  const db = await obtenerBD();

  const nuevo: ReporteEstado = {
    ...reporte,
    id: `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    creadoEn: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO reportes_estado
      (id, usuario_id, espacio_id, espacio_nombre, fecha, nota, urls, creado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nuevo.id,
      nuevo.usuarioId,
      nuevo.espacioId,
      nuevo.espacioNombre,
      nuevo.fecha,
      nuevo.nota,
      JSON.stringify(nuevo.urls),
      nuevo.creadoEn,
    ]
  );

  return nuevo;
}

export async function obtenerReportesEstado(
  espacioId?: string
): Promise<ReporteEstado[]> {
  await asegurarTabla();
  const db = await obtenerBD();

  const filas = espacioId
    ? await db.getAllAsync<FilaReporte>(
        `SELECT * FROM reportes_estado
        WHERE espacio_id = ?
        ORDER BY creado_en DESC`,
        [espacioId]
      )
    : await db.getAllAsync<FilaReporte>(
        `SELECT * FROM reportes_estado
        ORDER BY creado_en DESC`
    );

  return filas.map(aReporte);
}

export async function eliminarReporteEstado(id: string): Promise<void> {
  await asegurarTabla();
  const db = await obtenerBD();

  await db.runAsync("DELETE FROM reportes_estado WHERE id = ?", [id]);
}