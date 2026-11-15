//Programar, cancelar y sincronizar recordatorios

import * as Notifications from "expo-notifications";
import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";

import type { DatosRecordatorio, RecordatorioTurno, ResultadoSincronizacion } from "../tipos/notificaciones";
import { MINUTOS_ANTES } from "../tipos/notificaciones";
import { CANAL_RECORDATORIOS, configurarCanalAndroid, obtenerEstadoPermiso } from "./notificaciones";

const CLAVE_PREFERENCIA = "reservas_deportivas_recordatorios_habilitados";

//Leer la preferencia del usuario, si nunca se guardó nada, el recordatorio viene activado por defecto.
export async function recordatoriosHabilitados(): Promise<boolean> {
    try {
        const valor = await Storage.getItem(CLAVE_PREFERENCIA);
        if (valor === null) return true;
        return valor !== "false";
    } catch {
        return true;
    }

}

//Guarda si el usuario quiere o no recibir recordatorios
export async function guardarPreferenciaRecordatorios(activo: boolean): Promise<void> {
    await Storage.setItem(CLAVE_PREFERENCIA, activo ? "true" : "false");
}

//Convierte "AAAA-MM-DD" + "HH:MM" a un Date local. Devuelve null si los datos no son válidos
function fechaDelTurno(fecha: string, inicio: string): Date | null {
    const partesFecha = fecha.split("-");
    const partesHora = inicio.split(":");

    if (partesFecha.length !== 3 || partesHora.length !== 2) {
        return null;
    }

    const [anio, mes, dia] = partesFecha.map(Number);
    const [hora, minuto] = partesHora.map(Number);
    const numeros = [anio, mes, dia, hora, minuto];

    if (!numeros.every(Number.isInteger)) return null;
    if (mes < 1 || mes > 12) return null;
    if (dia < 1 || dia > 31) return null;
    if (hora < 0 || hora > 23) return null;
    if (minuto < 0 || minuto > 59) return null;

    const date = new Date(anio, mes - 1, dia, hora, minuto, 0, 0);
    
    if (
        date.getFullYear() === anio && 
        date.getMonth() === mes - 1 && 
        date.getDate() === dia
    ) {
        return date;
    } 
    return null;
}

//true si la notificación programada es uno de nuestros recordatorios.
function esRecordatorio(request: Notifications.NotificationRequest): boolean {
    const data = request.content.data as Partial<DatosRecordatorio> | undefined;

    return (
        data?.tipo === "recordatorio" &&
        typeof data.reservaId === "string"
    );
}

//devuelve el reservaId guardado en una notificación, o null
function reservaIdDe(request: Notifications.NotificationRequest): string | null {
    const data = request.content.data as Partial<DatosRecordatorio> | undefined;

    return typeof data?.reservaId === "string"
        ? data.reservaId
        : null;
}

// busco si esa reserva ya tiene un recordatorio programado
async function buscarRecordatorio(reservaId: string): Promise<Notifications.NotificationRequest | null> {
    const programadas = await Notifications.getAllScheduledNotificationsAsync();

    return programadas.find((request) => 
        esRecordatorio(request) && reservaIdDe(request) === reservaId
    ) ?? null;
}

//Programa el recordatorio de una reserva, devuelve el identifier de la notificación, o null si no se programó.
export async function programarRecordatorio(recordatorio: RecordatorioTurno): Promise<string | null>{
    if(Platform.OS === "web") return null;

    if (!(await recordatoriosHabilitados())) return null;
    if ((await obtenerEstadoPermiso()) !== "granted") return null;

    if (Platform.OS === "android") {
        try{
            await configurarCanalAndroid();
        } catch (error){
            console.warn("No se pudo configurar el canal, se usará el canal por defecto: ", error);
        }
    }
            

    try{
        const existente = await buscarRecordatorio(recordatorio.reservaId);
        if (existente) {
            return existente.identifier;
        }
        const turno = fechaDelTurno(recordatorio.fecha, recordatorio.inicio);
        if (turno === null) return null;

        const aviso = new Date(turno.getTime() - MINUTOS_ANTES * 60 * 1000);
        if (aviso.getTime() <= Date.now() + 60_000) return null;

        const datos: DatosRecordatorio = {
            tipo: "recordatorio",
            reservaId: recordatorio.reservaId,
        };
        const identifier = await Notifications.scheduleNotificationAsync({
            content: {
                title: "Tu turno es en 2 horas",
                body: `${recordatorio.espacioNombre} · ${recordatorio.inicio} a ${recordatorio.fin}`,
                data: datos,
                sound: "default",
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: aviso,
                channelId: CANAL_RECORDATORIOS,
            },
        });
        return identifier;
        
    } catch (error) {
        console.warn("No se pudo programar el recordatorio:", error);
        return null;
    }
}

//Cancela el recordatorio de una reserva, devuelve true si encontró y canceló al menos uno
export async function cancelarRecordatorio(reservaId: string): Promise<boolean> {
    if (Platform.OS === "web") return false;

    const programadas = await Notifications.getAllScheduledNotificationsAsync();
    const nuestras = programadas.filter((noti) => 
        esRecordatorio(noti) && reservaIdDe(noti) === reservaId
    );
    for (const noti of nuestras) {
        await Notifications.cancelScheduledNotificationAsync(noti.identifier);
    };

    return nuestras.length > 0;
}

//Cancela TODOS los recordatorios de nuestros turnos
export async function cancelarTodosLosRecordatorios(): Promise<number> {
    if (Platform.OS === "web") return 0;

    const programadas = await Notifications.getAllScheduledNotificationsAsync();
    const nuestras = programadas.filter(esRecordatorio);

    
    for (const noti of nuestras) {
        await Notifications.cancelScheduledNotificationAsync(noti.identifier);
    }
    return nuestras.length;
}

//Reconciliar lo programado con las reservas confirmadas actuales, se llama desde Mis reservas después de cargar los datos.
export async function sincronizarRecordatorios(lista: RecordatorioTurno[], idsActuales?: Set<string>): Promise<ResultadoSincronizacion> {
    if (Platform.OS === "web") return { programados: 0, cancelados: 0, omitidos: lista.length };
    
    if (!(await recordatoriosHabilitados())) {
        const cancelados = await cancelarTodosLosRecordatorios();
        return { programados: 0, cancelados, omitidos: 0};
    }

    const unicos = [...new Map(lista.map((r) => [r.reservaId, r] as const)).values(),];
    const programadas = await Notifications.getAllScheduledNotificationsAsync();

    const porReserva = new Map<string, Notifications.NotificationRequest>();

    for (const request of programadas) {
        if (!esRecordatorio(request)) continue;

        const reservaId = reservaIdDe(request);
        if (reservaId) {
            porReserva.set(reservaId, request);
        }
    }

    const idsDeseados = new Set(
        unicos.map((r) => r.reservaId)
    );
    const idsConocidos = idsActuales ?? idsDeseados;

    let programados = 0;
    let cancelados = 0;
    let omitidos = 0;

    for (const recordatorio of unicos) {
        if (porReserva.has(recordatorio.reservaId)) {
            omitidos++;
            continue;
        }

        const identifier = await programarRecordatorio(recordatorio);

        if (identifier) programados++;
        else omitidos++;
    }

    // Cancelar las que ya no corresponden.
    for (const [reservaId, request] of porReserva) {
        if (idsDeseados.has(reservaId)) continue;

        // Existe una reserva actual, pero no tenemos su fecha porque está fuera de la ventana de 7 días
        if (idsConocidos.has(reservaId)) continue;
        
        await Notifications.cancelScheduledNotificationAsync(
            request.identifier
        );
        cancelados++;
    }


    return { programados, cancelados, omitidos }
}