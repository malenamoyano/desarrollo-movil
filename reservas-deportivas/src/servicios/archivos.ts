import { File } from "expo-file-system";
import type { ArchivoSubido, RespuestaUno } from "../tipos/api";
import { obtenerToken } from "./auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface ArchivoParaSubir {
    uri: string;
}

export async function subirArchivo(archivo: ArchivoParaSubir): Promise<ArchivoSubido> {
    const token = await obtenerToken();
    if(!token) {
        throw new Error("Tenes que iniciar sesión para subir fotos.");
    }

    const archivoLocal = new File(archivo.uri);
    if(!archivoLocal.exists) {
        throw new Error("La foto ya no está disponible, volvé a elegirla.");
    }

    const formulario = new FormData();
    formulario.append("archivo", archivoLocal);

    let respuesta: Response;
    try {
        respuesta = await fetch(`${API_URL}/archivos`, {
            method: "POST", 
            headers: { 
                Authorization: `Bearer ${token}`, 
                Accept: "application/json" 
            }, 
            body: formulario,
        });
    } catch (error){
        console.warn("No se pudo conectar al subir la foto: ", error);
        throw new Error("No se pudo conectar con el servidor.");
    }

    if(!respuesta.ok) {
        const cuerpo: {
            error?: {
            codigo?: string;
            mensaje?: string;
        };
    } = await respuesta.json().catch(() => ({}));

        throw new Error(
            cuerpo.error?.mensaje ??
            `No se pudo subir la foto (${respuesta.status}).`
        );
    }

    const resultado: RespuestaUno<ArchivoSubido> = await respuesta.json();
    return resultado.datos;
}

export async function subirImagenes(
    archivos: ArchivoParaSubir[],
    alProgresar?: (hechos: number, total: number) => void
): Promise<{ subidas: ArchivoSubido[]; errores: string[] }> {
    const subidas: ArchivoSubido[] = [];
    const errores: string[] = [];

    for (let i = 0; i < archivos.length; i++) {
        try{
            const subida = await subirArchivo(archivos[i]);
            subidas.push(subida);
        } catch (error) {
            const mensaje = error instanceof Error
                ? error.message
                : "No se pudo subir la foto"

            console.warn(`Error al subir la foto ${i + 1}:`, mensaje);
            errores.push(mensaje);
        }
        alProgresar?.(i + 1, archivos.length);
    }

    return { subidas, errores };
}