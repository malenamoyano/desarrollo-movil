//hook chico que devuelve el URI local si existe, y si no, el remoto. dispara la descarga cuando hay conexión.

import { useEffect, useState } from "react";
import { descargarMedio, obtenerUriLocal } from "../servicios/mediosEspacios"
import { useConexion } from "./useConexion";

export function useMedioLocal(url: string | null | undefined): string | null {
    const { sinConexion } = useConexion();
    const [uri, setUri] = useState<string | null>(() => url ? obtenerUriLocal(url) ?? url: null);
    
    useEffect(() => {
        if(!url) {
            setUri(null); //si no hay url actualizo el estado con null
            return;
        }

        const local = obtenerUriLocal(url);
        if(local) {
            setUri(local); //si hay url local actualizo el estado con esa url
            return;
        }

        setUri(url);

        if(sinConexion) return;
        let activo = true;
        console.log("[medios] descargando", url);
        descargarMedio(url)
            .then((uriLocal) => {
                if(activo) setUri(uriLocal);
            })
            .catch(() => {
                if(activo) {
                    setUri(url);
                }
            });
        return () => {
            activo = false;
        };
    }, [url, sinConexion]);
    
    return uri;
}