import * as Network from "expo-network";

import type { Espacio } from "../tipos/types";
import { espaciosMock } from "../mocks/espacios";

import {
  guardarEspaciosLocales,
  obtenerEspaciosLocales,
} from "./cacheEspacios";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type PrecioEspacio = Pick<
  Espacio,
  "id" | "precioPorHora"
>;

interface RespuestaPreciosEspacios {
  datos: PrecioEspacio[];
  meta?: unknown;
}

function aplicarPrecios(
  espaciosLocales: Espacio[],
  espaciosConPrecios: PrecioEspacio[]
): Espacio[] {
  const preciosPorId = new Map(
    espaciosConPrecios.map((espacio) => [
      espacio.id,
      espacio.precioPorHora,
    ])
  );

  return espaciosLocales.map((espacio) => {
    const precioActualizado = preciosPorId.get(espacio.id);

    if (precioActualizado === undefined) {
      return espacio;
    }

    return {
      ...espacio,
      precioPorHora: precioActualizado,
    };
  });
}

export async function obtenerEspacios(): Promise<Espacio[]> {
  const espaciosLocales = espaciosMock.filter(
    (espacio) => espacio.activo
  );

  try {
    const estadoRed = await Network.getNetworkStateAsync();

    const sinConexion =
      estadoRed.isConnected === false ||
      estadoRed.isInternetReachable === false;

    if (sinConexion) {
      const espaciosGuardados = await obtenerEspaciosLocales();

      return espaciosGuardados.length > 0
        ? aplicarPrecios(espaciosLocales, espaciosGuardados)
        : espaciosLocales;
    }

    if (!API_URL) {
      throw new Error(
        "No está configurada la URL de la API."
      );
    }

    const respuesta = await fetch(`${API_URL}/espacios`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!respuesta.ok) {
      throw new Error(
        `Error del servidor (${respuesta.status}).`
      );
    }

    const resultado: RespuestaPreciosEspacios =
      await respuesta.json();

    if (!Array.isArray(resultado.datos)) {
      throw new Error(
        "La API devolvió una respuesta de espacios inválida."
      );
    }

    const espaciosActualizados = aplicarPrecios(
      espaciosLocales,
      resultado.datos
    );

    await guardarEspaciosLocales(espaciosActualizados);

    return espaciosActualizados;
  } catch (error) {
    console.warn(
      "No se pudieron sincronizar los precios de los espacios:",
      error
    );

    try {
      const espaciosGuardados = await obtenerEspaciosLocales();

      if (espaciosGuardados.length > 0) {
        return aplicarPrecios(
          espaciosLocales,
          espaciosGuardados
        );
      }
    } catch (errorCache) {
      console.warn(
        "No se pudo recuperar la caché de espacios:",
        errorCache
      );
    }

    return espaciosLocales;
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