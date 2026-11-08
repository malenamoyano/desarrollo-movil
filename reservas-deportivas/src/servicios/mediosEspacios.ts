import { Directory, File, Paths } from "expo-file-system";
import type { Espacio } from "../tipos/types";

const carpetaMedios = new Directory(Paths.document, "medios");
const descargasEnCurso = new Map<string, Promise<string>>(); //si dos componentes piden la misma URL al mismo tiempo, se descarga una sola vez.

function asegurarCarpeta(): void {
    carpetaMedios.create({
        intermediates: true,
        idempotent: true,
    });
}

function nombreDeArchivo(url: string): string | null { 
    const sinParametros = url.split("?")[0].split("#")[0];
    const nombre = sinParametros.slice(sinParametros.lastIndexOf("/") + 1);
    try{
        return decodeURIComponent(nombre);
    } catch {
        return null;
    }
}

export function obtenerUriLocal(url: string): string | null {
    const nombre = nombreDeArchivo(url); //obtengo el nombre del archivo
    if (!nombre) return null; // verifico si existe

    const archivo = new File(carpetaMedios, nombre); // creo el archivo
    if (archivo.exists && (archivo.size ?? 0) > 0) {
        return archivo.uri; //retorno el archivo sólo si existe y no está vacío
    }
    return null;
}

export async function descargarMedio(url: string): Promise<string> {

    if(!/^https?:\/\//i.test(url)) { 
        return Promise.reject(new Error("url no válida")); //validar que sea http
    }
    
    const local = obtenerUriLocal(url);
    if (local) return Promise.resolve(local); //lo devuelvo si ya está local
    
    const enCurso = descargasEnCurso.get(url);
    if (enCurso) return enCurso; //devuelvo la misma promesa si la descarga ya está en curso

    //creo carpeta y destino
    asegurarCarpeta();
    const nombre = nombreDeArchivo(url);
    if(!nombre) return Promise.reject(new Error("Nombre inválido"));
    const destino = new File(carpetaMedios, nombre); 
    
    const promesa = File.downloadFileAsync(url, destino, {
        idempotent: true,
    })
        .then((archivo) => {
            return archivo.uri;
        })
        .catch((error) => {
            if (destino.exists) destino.delete();
            throw error;
        })
        .finally(() => {
            descargasEnCurso.delete(url);
        });

    descargasEnCurso.set(url, promesa);
    return promesa;
}

export async function sincronizarFotosEspacio(espacio: Espacio): Promise<void> {
    const urls = espacio.imagenes.filter((url) => /^https?:\/\//i.test(url));
    await Promise.allSettled(urls.map(descargarMedio)); //descargo todas para que una falla no cancele al resto
}

export async function descargarVideo(espacio: Espacio): Promise<string | null> {
    if(!espacio.videoUrl) return null;
    if(!/^https?:\/\//i.test(espacio.videoUrl)) return null;

    return descargarMedio(espacio.videoUrl);
}