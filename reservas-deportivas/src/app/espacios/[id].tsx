
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { Espacio } from "../../tipos/types";
import { obtenerEspacioPorId } from "../../servicios/espacios";
import { obtenerDeportePorId } from "../../servicios/deportes";
import { obtenerImagenEspacio } from "../../servicios/imagenes";

export default function DetalleEspacio() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [nombreDeporte, setNombreDeporte] =
    useState("Espacio deportivo");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarDetalle() {
      setCargando(true);

      try {
        if (!id) {
          setEspacio(null);
          return;
        }

        const datos = await obtenerEspacioPorId(id);
        setEspacio(datos);

        if (datos) {
          const deporte = await obtenerDeportePorId(
            datos.deporteId
          );

          setNombreDeporte(
            deporte?.nombre ?? "Espacio deportivo"
          );
        }
      } catch (error) {
        console.error("Error al cargar el espacio:", error);
        setEspacio(null);
      } finally {
        setCargando(false);
      }
    }

    cargarDetalle();
  }, [id]);

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <Stack.Screen options={{ title: "Cargando..." }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!espacio) {
    return (
      <View style={styles.centrado}>
        <Stack.Screen
          options={{ title: "Espacio no encontrado" }}
        />
        <Text>No se encontró el espacio deportivo.</Text>
      </View>
    );
  }

  const imagenPrincipal =
    espacio.imagenes.length > 0
      ? obtenerImagenEspacio(espacio.imagenes[0])
      : undefined;

  return (
    <>
      <Stack.Screen
        options={{
          title: nombreDeporte,
          headerBackTitle: "Volver",
        }}
      />

      <ScrollView
        contentContainerStyle={styles.contenedor}
        showsVerticalScrollIndicator={false}
      >
        {imagenPrincipal ? (
          <Image
            source={imagenPrincipal}
            style={styles.imagenEspacio}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.sinImagen}>
            <Text style={styles.textoSinImagen}>
              Imagen no disponible
            </Text>
          </View>
        )}

        <Text style={styles.titulo}>
          {espacio.nombre}
        </Text>

        <Text style={styles.subtitulo}>
          {espacio.complejo}
        </Text>

        <View style={styles.tarjeta}>
          <Text style={styles.seccion}>
            Características
          </Text>

          <Text style={styles.etiqueta}>
            Superficie
          </Text>
          <Text>{espacio.superficie}</Text>

          <Text style={styles.etiqueta}>
            Capacidad
          </Text>
          <Text>{espacio.capacidad} personas</Text>

          <Text style={styles.etiqueta}>
            Techado
          </Text>
          <Text>{espacio.techado ? "Sí" : "No"}</Text>

          <Text style={styles.etiqueta}>
            Iluminación
          </Text>
          <Text>{espacio.iluminacion ? "Sí" : "No"}</Text>
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.seccion}>
            Precio de alquiler
          </Text>

          <Text style={styles.precio}>
            {espacio.precioPorHora.toLocaleString(
              "es-AR",
              {
                style: "currency",
                currency: "ARS",
                maximumFractionDigits: 0,
              }
            )}
          </Text>

          <Text style={styles.precioDescripcion}>
            Por hora de alquiler
          </Text>
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.seccion}>
            Reglas del espacio
          </Text>

          <Text style={styles.reglas}>
            {espacio.reglas}
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    padding: 16,
    backgroundColor: "#F5F5F5",
    flexGrow: 1,
    paddingBottom: 32,
  },
  centrado: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imagenEspacio: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    marginBottom: 20,
  },
  sinImagen: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  textoSinImagen: {
    color: "#666666",
    fontSize: 15,
  },
  titulo: {
    fontSize: 25,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 20,
  },
  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    gap: 6,
  },
  seccion: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555555",
    marginTop: 8,
  },
  precio: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  precioDescripcion: {
    fontSize: 14,
    color: "#666666",
  },
  reglas: {
    fontSize: 15,
    lineHeight: 23,
    color: "#444444",
  },
});
