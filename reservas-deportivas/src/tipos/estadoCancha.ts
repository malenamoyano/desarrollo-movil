// Tipos del reporte y de la foto seleccionada
export interface FotoSeleccionada {
    uri: string;
    nombre: string;
    tipoMime: string;
    bytes?: number;
}

export interface ReporteEstado {
    id: string;
    usuarioId: string;
    espacioId: string;
    espacioNombre: string;
    fecha: string; // "AAAA-MM-DD"
    nota: string;
    urls: string[]; //urls que devolvió POST /archivos
    creadoEn: string; // ISO
}

export type ReporteEstadoNuevo = Omit<ReporteEstado, "id" | "creadoEn">;