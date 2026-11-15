import * as Network from "expo-network";

import type { Espacio } from "../tipos/types";
import { espaciosMock } from "../mocks/espacios";

import {
  guardarEspaciosLocales,
  obtenerEspaciosLocales,
} from "./cacheEspacios";

export async function obtenerEspacios(): Promise<Espacio[]> {
  const espacios = espaciosMock.filter(
    (espacio) => espacio.activo
  );

  try {
    // Comprobar el estado de conexión.
    const estadoRed = await Network.getNetworkStateAsync();

    const sinConexion =
      estadoRed.isConnected === false ||
      estadoRed.isInternetReachable === false;

    if (sinConexion) {
      // Intentar recuperar el catálogo guardado en SQLite.
      const espaciosGuardados = await obtenerEspaciosLocales();

      if (espaciosGuardados.length > 0) {
        return espaciosGuardados;
      }

      // Si todavía no existe una copia local,
      // utilizar los mocks incluidos en la aplicación.
      return espacios;
    }

    // Con conexión, guardar una copia del catálogo
    // para futuras consultas offline.
    await guardarEspaciosLocales(espacios);

    return espacios;
  } catch (error) {
    console.warn(
      "No se pudo utilizar la caché de espacios:",
      error
    );

    // Evitar que un fallo de SQLite impida ver las canchas.
    return espacios;
  }
}

export async function obtenerEspacioPorId(
  id: string
): Promise<Espacio | null> {
  const espacios = await obtenerEspacios();

  return (
    espacios.find((espacio) => espacio.id === id) ??
    espaciosMock.find((espacio) => espacio.id === id) ??
    null
  );
}
