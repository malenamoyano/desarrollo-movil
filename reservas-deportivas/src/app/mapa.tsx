import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";

import type { Espacio } from "../../src/tipos/espacio";
import { obtenerEspacios } from "../../src/servicios/espacios";

// Región inicial del mapa
const REGION_INICIAL = {
  latitude: -31.8653,
  longitude: -58.0158,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function Mapa() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [items, setItems] = useState<Espacio[]>([]);
  const [region, setRegion] = useState(REGION_INICIAL);
  const [loading, setLoading] = useState(true);
  const [mostrarUbicacion, setMostrarUbicacion] = useState(false);

  // Cargar espacios y solicitar ubicación
  useEffect(() => {
    async function cargarMapa() {
      try {
        const espacios = await obtenerEspacios();

        setItems(
          id ? espacios.filter((espacio) => espacio.id === id) : espacios
        );

        const permiso =
          await Location.requestForegroundPermissionsAsync();

        if (permiso.status === "granted") {
          setMostrarUbicacion(true);

          const ubicacion = await Location.getCurrentPositionAsync({});

          setRegion({
            latitude: ubicacion.coords.latitude,
            longitude: ubicacion.coords.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          });
        }
      } catch (error) {
        console.error("Error al cargar el mapa:", error);
      } finally {
        setLoading(false);
      }
    }

    cargarMapa();
  }, [id]);

  // Abrir Google Maps para llegar al espacio
  async function abrirComoLlegar(espacio: Espacio) {
    if (!espacio.coordenadas) return;

    const { latitud, longitud } = espacio.coordenadas;

    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("No se pudo abrir Google Maps:", error);
    }
  }

  // Mostrar indicador de carga
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" />
        <Text>Cargando mapa...</Text>
      </View>
    );
  }

  // Filtrar espacios que tienen coordenadas
  const ubicados = items.filter(
    (espacio) => espacio.coordenadas !== null
  );

  return (
    <View style={s.container}>
      <MapView
        style={s.map}
        region={region}
        showsUserLocation={mostrarUbicacion}
      >
        {ubicados.map((espacio) => (
          <Marker
            key={espacio.id}
            coordinate={{
              latitude: espacio.coordenadas!.latitud,
              longitude: espacio.coordenadas!.longitud,
            }}
            title={espacio.nombre}
          />
        ))}
      </MapView>

      {/* Botones para llegar a cada espacio */}
      <View style={s.bottom}>
        {ubicados.length === 0 && (
          <Text>
            Faltan cargar las coordenadas oficiales de los espacios
            para ver sus marcadores.
          </Text>
        )}

        {ubicados.map((espacio) => (
          <Pressable
            key={espacio.id}
            style={s.button}
            onPress={() => abrirComoLlegar(espacio)}
          >
            <Text style={s.white}>
              Cómo llegar: {espacio.nombre}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Estilos  para el  mapa
const s = StyleSheet.create({
  container: {
    flex: 1,
  },

  map: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  bottom: {
    padding: 10,
    backgroundColor: "white",
  },

  button: {
    padding: 11,
    backgroundColor: "#175CD3",
    borderRadius: 8,
    marginTop: 6,
  },

  white: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
});