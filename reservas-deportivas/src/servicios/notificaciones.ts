//Permisos del sistema y canal de Android

import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

import type { EstadoPermiso } from "../tipos/notificaciones";

export const CANAL_RECORDATORIOS = "recordatorios-v2";

export async function configurarCanalAndroid(): Promise<void> {
    if (Platform.OS !== "android") {
        return;
    }

    await Notifications.setNotificationChannelAsync(CANAL_RECORDATORIOS, {
        name: "Avisos y recordatorio de turnos",
        importance: Notifications.AndroidImportance.HIGH,
    });
}

function simplificarPermiso(estado: Notifications.NotificationPermissionsStatus): EstadoPermiso{
    if (Platform.OS === 'ios'){
        switch (estado.ios?.status) {
            case Notifications.IosAuthorizationStatus.AUTHORIZED:
            case Notifications.IosAuthorizationStatus.PROVISIONAL:
            case Notifications.IosAuthorizationStatus.EPHEMERAL:
                return "granted";

            case Notifications.IosAuthorizationStatus.DENIED:
                return "denied";
            case Notifications.IosAuthorizationStatus.NOT_DETERMINED:
                return "undetermined";
            default: 
                break;
        }
    }
    const status = estado.status as EstadoPermiso;

    return status === "granted" || status === "denied"
        ? status
        : "undetermined";
}

//Consulta el permiso sin mostrar ningún cartel al usuario. Sirve para saber si debemos ofrecer el botón "Permitir".
export async function obtenerEstadoPermiso(): Promise<EstadoPermiso> {
    if (Platform.OS === "web") return "denied";

    try {
        const estado = await Notifications.getPermissionsAsync();
        return simplificarPermiso(estado);
    } catch {
        return "undetermined";
    }
}

//Muestra el pedido de permiso del sistema operativo.
export async function pedirPermiso(): Promise<EstadoPermiso> {
    if (Platform.OS === "web") return "denied";

    if (Platform.OS === "android") {
        try{
            await configurarCanalAndroid();
        } catch(error){
            console.warn("No se pudo configurar el canal de Android: ", error);
        }
    }
    try{
        const resultado = await Notifications.requestPermissionsAsync({
        ios: {
            allowAlert: true,
            allowBadge: false,
            allowSound: true,
            },
        });
        return simplificarPermiso(resultado);
    } catch (error) {
        console.warn("No se pudo pedir el permiso de notificaciones: ", error);
        return obtenerEstadoPermiso();
    }
}

// Atajo para saber si podemos programar sin volver a pedir permiso.
export async function hayPermiso(): Promise<boolean> {
    return (await obtenerEstadoPermiso()) === "granted";
}

//Abre los ajustes del sistema para que el usuario habilite las notificaciones a mano (útil cuando ya respondió "No").
export async function abrirAjustesDeNotificaciones(): Promise<void> {
    if (Platform.OS === "web") return;
    await Linking.openSettings();
}