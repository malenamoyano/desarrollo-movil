// Tipos exclusivos de las notificaciones LOCALES (recordatorio y avisos).
export type EstadoPermiso = "granted" | "denied" | "undetermined";
export const MINUTOS_ANTES = 120;

// Datos que viajan dentro de la notificación programada: sirven para reconocerla y cancelarla después.
export type DatosRecordatorio = {
    tipo: "recordatorio";
    reservaId: string;
};

// Datos de los avisos inmediatos que se generan al sincronizar Mis reservas.
export type DatosAviso = 
    | { tipo: "cambio-turno"; reservaId: string }
    | { tipo: "turno-liberado"; turnoId: string; espacioId: string };

export type DatosNotificaciones = DatosRecordatorio | DatosAviso;

// Datos mínimos para programar un recordatorio.
export interface RecordatorioTurno {
    reservaId: string;
    espacioNombre: string;
    fecha: string; //formato "AAAA-MM-DD"
    inicio: string; //formato "HH:MM"
    fin: string; //formato "HH:MM"
};

//Resultado de reconciliar los recordatorios con las reservas.
export interface ResultadoSincronizacion {
    programados: number;
    cancelados: number;
    omitidos: number;
};