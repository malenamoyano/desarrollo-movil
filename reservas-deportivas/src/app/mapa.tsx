
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import MapView, { Marker } from "react-native-maps";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import type { Espacio } from "../tipos/types";
import { obtenerEspacios } from "../servicios/espacios";

// Región inicial de Villaguay.
const REGION_INICIAL = {
  latitude: -31.8642,
  longitude: -59.0281,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function Mapa() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const mapaRef = useRef<MapView>(null);

  const [items, setItems] = useState<Espacio[]>([]);
  const [region, setRegion] = useState(REGION_INICIAL);

  const [loading, setLoading] = useState(true);
  const [cargandoGPS, setCargandoGPS] = useState(false);
  const [permisoGPS, setPermisoGPS] = useState(false);

  // --------------------------------------------------
  // CARGAR ESPACIOS
  // --------------------------------------------------
  useEffect(() => {
    let activo = true;

    async function cargarMapa() {
      setLoading(true);

      try {
        const espacios = await obtenerEspacios();

        if (!activo) return;

        const filtrados = id
          ? espacios.filter((espacio) => espacio.id === id)
          : espacios;

        setItems(filtrados);

        // Centrar en una cancha si recibimos su ID.
        if (id && filtrados.length > 0) {
          const coordenadas = filtrados[0].coordenadas;

          if (
            coordenadas &&
            Number.isFinite(coordenadas.latitud) &&
            Number.isFinite(coordenadas.longitud)
          ) {
            const nuevaRegion = {
              latitude: coordenadas.latitud,
              longitude: coordenadas.longitud,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            };

            setRegion(nuevaRegion);

            mapaRef.current?.animateToRegion(
              nuevaRegion,
              500
            );
          }
        }
      } catch (error) {
        console.error(
          "Error al cargar el mapa:",
          error
        );
      } finally {
        if (activo) {
          setLoading(false);
        }
      }
    }

    void cargarMapa();

    return () => {
      activo = false;
    };
  }, [id]);

  // --------------------------------------------------
  // GPS: OBTENER UBICACIÓN DEL CELULAR
  // --------------------------------------------------
  async function irAMiUbicacion() {
    if (cargandoGPS) return;

    setCargandoGPS(true);

    try {
      // Verificar si la ubicación está activada.
      const serviciosActivos =
        await Location.hasServicesEnabledAsync();

      if (!serviciosActivos) {
        Alert.alert(
          "Ubicación desactivada",
          "Activá la ubicación del celular para utilizar el GPS."
        );
        return;
      }

      // Solicitar permiso solamente cuando el
      // usuario presiona el botón.
      const permiso =
        await Location.requestForegroundPermissionsAsync();

      if (permiso.status !== "granted") {
        setPermisoGPS(false);

        Alert.alert(
          "Permiso de ubicación",
          "Necesitamos permiso para mostrar tu ubicación en el mapa."
        );
        return;
      }

      setPermisoGPS(true);

      // Obtener ubicación actual.
      const ubicacion =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      const nuevaRegion = {
        latitude: ubicacion.coords.latitude,
        longitude: ubicacion.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      // Centrar el mapa en la posición real.
      mapaRef.current?.animateToRegion(
        nuevaRegion,
        700
      );
    } catch (error) {
      console.error(
        "Error al obtener ubicación GPS:",
        error
      );

      Alert.alert(
        "Ubicación no disponible",
        "No pudimos obtener tu ubicación. Verificá que el GPS esté activado."
      );
    } finally {
      setCargandoGPS(false);
    }
  }

  // --------------------------------------------------
  // ABRIR GOOGLE MAPS PARA LLEGAR A UNA CANCHA
  // --------------------------------------------------
  async function abrirComoLlegar(espacio: Espacio) {
    if (!espacio.coordenadas) return;

    const { latitud, longitud } = espacio.coordenadas;

    const destino = encodeURIComponent(
      `${latitud},${longitud}`
    );

    const url =
      "https://www.google.com/maps/dir/?api=1" +
      `&destination=${destino}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error(
        "No se pudo abrir Google Maps:",
        error
      );

      Alert.alert(
        "Error",
        "No se pudo abrir Google Maps."
      );
    }
  }

  // --------------------------------------------------
  // CARGANDO
  // --------------------------------------------------
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator
          size="large"
          color="#1565C0"
        />

        <Text>Cargando mapa...</Text>
      </View>
    );
  }

  // --------------------------------------------------
  // ESPACIOS CON COORDENADAS VÁLIDAS
  // --------------------------------------------------
  const ubicados = items.filter(
    (espacio) =>
      espacio.coordenadas != null &&
      Number.isFinite(espacio.coordenadas.latitud) &&
      Number.isFinite(espacio.coordenadas.longitud)
  );

  return (
    <View style={s.container}>
      {/* MAPA */}
      <View style={s.mapaContenedor}>
        <MapView
          ref={mapaRef}
          style={s.map}
          initialRegion={region}
          showsUserLocation={permisoGPS}
          showsMyLocationButton={false}
        >
          {ubicados.map((espacio) => (
            <Marker
              key={espacio.id}
              coordinate={{
                latitude: espacio.coordenadas!.latitud,
                longitude: espacio.coordenadas!.longitud,
              }}
              title={espacio.nombre}
              description={espacio.complejo}
            />
          ))}
        </MapView>

        {/* BOTÓN PARA CENTRAR EN EL GPS */}
        <Pressable
          style={s.botonGPS}
          onPress={() => {
            void irAMiUbicacion();
          }}
          disabled={cargandoGPS}
          accessibilityRole="button"
          accessibilityLabel="Mostrar mi ubicación"
        >
          {cargandoGPS ? (
            <ActivityIndicator
              size="small"
              color="#1565C0"
            />
          ) : (
            <Ionicons
              name="locate"
              size={25}
              color="#1565C0"
            />
          )}
        </Pressable>
      </View>

      {/* BOTONES PARA ABRIR INDICACIONES */}
      <ScrollView
        style={s.bottom}
        contentContainerStyle={s.bottomContent}
      >
        {ubicados.length === 0 && (
          <Text style={s.sinEspacios}>
            Todavía no hay espacios con coordenadas
            disponibles.
          </Text>
        )}

        {ubicados.map((espacio) => (
          <Pressable
            key={espacio.id}
            style={s.button}
            onPress={() => {
              void abrirComoLlegar(espacio);
            }}
          >
            <Ionicons
              name="navigate-outline"
              size={18}
              color="#FFFFFF"
            />

            <Text style={s.white}>
              Cómo llegar: {espacio.nombre}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// --------------------------------------------------
// ESTILOS
// --------------------------------------------------
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  mapaContenedor: {
    flex: 1,
    position: "relative",
  },

  map: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  botonGPS: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 4,
  },

  bottom: {
    maxHeight: 200,
    backgroundColor: "#FFFFFF",
  },

  bottomContent: {
    padding: 10,
    paddingBottom: 18,
  },

  button: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#175CD3",
    borderRadius: 8,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  white: {
    color: "#FFFFFF",
    fontWeight: "bold",
    textAlign: "center",
    flexShrink: 1,
  },

  sinEspacios: {
    color: "#666666",
    textAlign: "center",
    padding: 12,
  },
});
