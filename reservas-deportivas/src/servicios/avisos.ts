// Avisos locales: suspensión/reprogramación de turnos y liberación de turnos en espacios favoritos.
// No usan push ni tareas en segundo plano: se evalúan cuando "Mis reservas" sincroniza con la API y se muestran como notificación local inmediata.
import * as Notifications from "expo-notifications"
import { Storage } from "expo-sqlite/kv-store";
import { Platform } from "react-native";

import type { DatosAviso } from "../tipos/notificaciones";
import type { Espacio, EstadoTurno, Reserva, Turno } from "../tipos/types";
import { CANAL_RECORDATORIOS, configurarCanalAndroid, obtenerEstadoPermiso } from "./notificaciones";
import { cancelarRecordatorio, recordatoriosHabilitados } from "./recordatorios";
import { obtenerTurnosPorEspacio } from "./turnos";

const PREFIJO_SNAPSHOT = "reservas_deportivas_turnos_favoritos";
const PREFIJO_ULTIMO_CHEQUEO = "reservas_deportivas_ultimo_chequeo_favoritos";
const MINUTOS_ENTRE_CHEQUEOS = 10;
const DIAS_DE_DISPONIBILIDAD = 7;

type ReservaConDetalle = Reserva & {
    _nombreEspacio?: string;
    _fecha?: string;
    _inicio?: string;
    _fin?: string;
};
type EspacioBasico = Pick<Espacio, "id" | "nombre">;

type TurnoFavoritoGuardado = {
    estado: EstadoTurno;
    espacioId: string;
    espacioNombre: string;
    fecha: string;
    inicio: string;
    fin: string;
};

type SnapshotFavoritos = Record<string, TurnoFavoritoGuardado>;

function fechaLocalISO(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function obtenerProximosDias(cantidad: number): string[] {
    const fechas: string[] = [];

    for(let i = 0; i < cantidad; i++) {
        const fecha = new Date();
        fecha.setHours(12, 0, 0, 0);
        fecha.setDate(fecha.getDate() + i);
        fechas.push(fechaLocalISO(fecha));
    }

    return fechas;
}

function partesDeFecha(fecha: string): [number, number, number] | null {
    const partes = fecha.split("-").map(Number);
    
    if(partes.length !== 3 || !partes.every(Number.isInteger)) {
        return null;
    }

    return [partes[0], partes[1], partes[2]];
}

function esTurnoFuturo(fecha?: string, inicio?: string): boolean {
    if(!fecha) return false;

    const partesFecha = partesDeFecha(fecha);
    if(!partesFecha) return false;

    const partesHora = (inicio ?? "00:00").split(":").map(Number);
    if (partesHora.length !== 2 || !partesHora.every(Number.isInteger)) {
        return false;
    }

    const [anio, mes, dia] = partesFecha;
    const [hora, minuto] = partesHora;
    const valor = new Date(anio, mes - 1, dia, hora, minuto, 0, 0).getTime();

    return Number.isFinite(valor) && valor > Date.now();
}

function esReservaFutura(reserva: ReservaConDetalle): boolean {
    if(reserva._fecha){
        return esTurnoFuturo(reserva._fecha, reserva._inicio);
    }

    const limite = new Date(reserva.cancelableHasta).getTime();
    return Number.isFinite(limite) && limite > Date.now();
}

function formatearFechaCorta(fecha: string): string {
    const partes = partesDeFecha(fecha);
    if(!partes) return fecha;

    const [anio, mes, dia] = partes;

    return new Date(anio, mes - 1, dia).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
    });
}

function describirHorario(fecha: string, inicio: string, fin: string): string {
    return `${formatearFechaCorta(fecha)} de ${inicio} a ${fin}`;
}

function describirTurno(espacio: string, fecha?: string, inicio?: string, fin?: string): string {
    const partes = [espacio];
    if(fecha) {
        partes.push(
            inicio && fin
                ? describirHorario(fecha, inicio, fin)
                : inicio
                    ? `${formatearFechaCorta(fecha)} a las ${inicio}`
                    : formatearFechaCorta(fecha)
        );
    }
    return partes.join(" · ");
}

async function puedeMostrarAviso(): Promise<boolean> { 
    if (Platform.OS === "web") {
        return false;
    }
    try{
        if(!(await recordatoriosHabilitados())) return false;
        return (await obtenerEstadoPermiso()) === "granted";
    } catch{
        return false;
    }
}

async function programarAviso(titulo: string, cuerpo: string, datos: DatosAviso): Promise<boolean> {
    try {
        if(Platform.OS === "android") {
            await configurarCanalAndroid().catch((error) => {
                console.warn("No se pudo configurar el canal de avisos: ", error);
            });
        }
        await Notifications.scheduleNotificationAsync({
            content: {
                title: titulo,
                body: cuerpo,
                sound: "default",
                data: { ...datos },
            },
            trigger:
                Platform.OS === "android"
                    ? { channelId: CANAL_RECORDATORIOS }
                    : null,
        });
        return true;
    } catch (error) {
        console.warn("No se pudo mostrar el aviso local: ", error);
        return false;
    }
}

// Se exporta para poder probar los avisos desde la pantalla Notificaciones.
export async function mostrarAvisoInmediato(titulo: string, cuerpo: string, datos: DatosAviso): Promise<boolean> {
    if(!(await puedeMostrarAviso())) return false;
    return programarAviso(titulo, cuerpo, datos);
}

async function leerSnapshot(clave: string): Promise<SnapshotFavoritos | null> {
    try {
        const crudo = await Storage.getItem(clave);
        if(!crudo) return null;

        const datos: unknown = JSON.parse(crudo);
        if(!datos || typeof datos !== "object" || Array.isArray(datos)) {
            return null;
        }
        return datos as SnapshotFavoritos;
    } catch {
        return null;
    }
}

export async function avisarCambiosDeReserva(anteriores: ReservaConDetalle[], nuevas: Reserva[], turnos: Record<string, Turno>, espacios: EspacioBasico[]): Promise<Set<string>> {
    const suspendidas = new Set<string>();

    try {
        const avisosActivos = await puedeMostrarAviso();
        const nuevasPorId = new Map(nuevas.map((reserva) => [reserva.id, reserva] as const));

        const obtenerNombre = (espacioId: string) => 
            espacios.find((espacio) => espacio.id === espacioId)?.nombre ??
            `Espacio ${espacioId}`;

        for (const anterior of anteriores) {
            if(anterior.estado !== "confirmada") continue;
            if(!esReservaFutura(anterior)) continue;

            const fechaAnterior = anterior._fecha;
            const inicioAnterior = anterior._inicio;
            const actual = nuevasPorId.get(anterior.id);
            const turnoActual = actual ? turnos[actual.turnoId] : undefined;
            const espacio = anterior._nombreEspacio ?? obtenerNombre(anterior.espacioId);

            // La API ya no la devuelve como próxima o la marca como no confirmada.
            if(!actual || actual.estado !== "confirmada") {
                suspendidas.add(anterior.id);
                await cancelarRecordatorio(anterior.id).catch((error) => {
                    console.warn("No se pudo cancelar el recordatorio suspendido: ", error);
                });
                
                if (avisosActivos) {
                    await programarAviso(
                        "Turno suspendido", 
                        `${describirTurno(
                            espacio, 
                            fechaAnterior, 
                            inicioAnterior, 
                            anterior._fin
                        )}. El complejo suspendió la reserva. Tenes que comunicarte con el complejo.`,
                        { tipo: "cambio-turno", reservaId: anterior.id}
                    );
                }
                continue;
            }
            // El turno sigue existiendo, pero quedó bloqueado por mantenimiento.
            if (turnoActual && (turnoActual.estado === "mantenimiento" || turnoActual.motivoBloqueo)){
                suspendidas.add(anterior.id);
                await cancelarRecordatorio(anterior.id).catch((error) => {
                    console.warn("No se pudo cancelar el recordatorio suspendido: ", error);
                });
                if (avisosActivos) {
                    const motivo = turnoActual.motivoBloqueo?.trim();
                    await programarAviso(
                        "Turno suspendido",
                        `${describirTurno(
                            espacio,
                            turnoActual.fecha,
                            turnoActual.inicio,
                            turnoActual.fin
                        )}${motivo ? ` — ${motivo}` : " — mantenimiento"}. El complejo suspendió el turno. Comunicate con el complejo.`,
                        { tipo: "cambio-turno", reservaId: anterior.id}
                    );
                }
                continue;
            }
            // El complejo movió la reserva a otro turno u horario.
            const cambioDeTurno = actual.turnoId !== anterior.turnoId;
            const cambioDeHorario = 
                !!turnoActual &&
                !!fechaAnterior &&
                !!inicioAnterior &&
                (turnoActual.fecha !== fechaAnterior || turnoActual.inicio !== inicioAnterior);
            if(cambioDeTurno || cambioDeHorario) {
                //cancelo el recordatorio viejo, programo uno nuevo con la fecha-hora actual
                await cancelarRecordatorio(anterior.id).catch((error) => {
                    console.warn("No se pudo cancelar el recordatorio: ", error);
                });
                if(avisosActivos) {
                    const cuerpo = turnoActual
                        ? `${espacio}: tu turno pasó a ${describirHorario(
                            turnoActual.fecha,
                            turnoActual.inicio,
                            turnoActual.fin
                        )}. Revisá Mis reservas.`
                        : `${espacio}: el complejo modificó el horario de tu reserva. Revisá Mis reservas.`;
                    await programarAviso("Turno reprogramado", cuerpo, {
                        tipo: "cambio-turno",
                        reservaId: anterior.id,
                    });
                }
            }
        }
    } catch (error) {
        console.warn("No se pudieron generar los avisos de cambios de reserva: ", error);
    }

    return suspendidas;
}

export async function avisarTurnosFavoritosLiberados(usuarioId: string, favoritos: string[], espacios: EspacioBasico[]): Promise<void> {
    try {
        const idsFavoritos = [...new Set(favoritos)];

        if(!usuarioId || idsFavoritos.length === 0) return;
        if(!(await puedeMostrarAviso())) return;

        const claveChequeo = `${PREFIJO_ULTIMO_CHEQUEO}_${usuarioId}`;
        const ultimoChequeo = Number(await Storage.getItem(claveChequeo));

        if(Number.isFinite(ultimoChequeo) &&
            ultimoChequeo > 0 &&
            Date.now() - ultimoChequeo < MINUTOS_ENTRE_CHEQUEOS * 60_000    
        ) {
        return;
        }

        const fechas = obtenerProximosDias(DIAS_DE_DISPONIBILIDAD);
        const consultas = idsFavoritos.flatMap((espacioId) =>
            fechas.map((fecha) => obtenerTurnosPorEspacio(espacioId, fecha))
        );
        const resultados = await Promise.allSettled(consultas);
        
        // Si fallaron todas las consultas, conservamos el snapshot anterior.
        if (!resultados.some((resultado) => resultado.status === "fulfilled")){
            return;
        }

        await Storage.setItem(claveChequeo, String(Date.now())).catch(() => {});

        const actual: SnapshotFavoritos = {};
        for (const resultado of resultados) {
            if (resultado.status !== "fulfilled") continue;

            for (const turno of resultado.value) {
                if (!esTurnoFuturo(turno.fecha, turno.inicio)) continue;
                actual[turno.id] = {
                    estado: turno.estado,
                    espacioId: turno.espacioId,
                    espacioNombre:
                        espacios.find((espacio) => espacio.id === turno.espacioId)?.nombre ??
                        `Espacio ${turno.espacioId}`,
                    fecha: turno.fecha,
                    inicio: turno.inicio,
                    fin: turno.fin,
                };
            }
        }

        const claveSnapshot = `${PREFIJO_SNAPSHOT}_${usuarioId}`;
        const anterior = await leerSnapshot(claveSnapshot);
        if (anterior) {
            for (const [turnoId, turno] of Object.entries(actual)) {
                const previo = anterior[turnoId];

                if (!previo || previo.estado === "libre" || turno.estado !== "libre") {
                    continue;
                }

                await programarAviso(
                    `Se liberó un turno en ${turno.espacioNombre}`,
                    `${describirHorario(
                        turno.fecha,
                        turno.inicio,
                        turno.fin
                    )}. Entrá a la app para reservarlo.`,
                    {
                        tipo: "turno-liberado",
                        turnoId,
                        espacioId: turno.espacioId,
                    }
                );
            }
        }
        await Storage.setItem(claveSnapshot, JSON.stringify(actual));
    } catch(error) {
        console.warn("No se pudieron revisar los turnos de los espacios favoritos: ", error);
    }
}