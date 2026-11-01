import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { Deporte, Espacio } from "../tipos/types";
import { obtenerEspacios } from "../servicios/espacios";
import { obtenerDeportes } from "../servicios/deportes";
import { obtenerImagenEspacio } from "../servicios/imagenes";

export default function Inicio() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [cargando, setCargando] = useState(true);

  const [deporteSeleccionado, setDeporteSeleccionado] =
    useState<string | null>(null);

  const [complejoSeleccionado, setComplejoSeleccionado] =
    useState<string | null>(null);

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [datosEspacios, datosDeportes] = await Promise.all([
          obtenerEspacios(),
          obtenerDeportes(),
        ]);

        setEspacios(datosEspacios);
        setDeportes(datosDeportes);
      } catch (error) {
        console.error("Error al cargar el catálogo:", error);
      } finally {
        setCargando(false);
      }
    }

    cargarDatos();
  }, []);

  // Obtenemos los complejos sin repetir nombres.
  const complejos = useMemo(() => {
    return [...new Set(espacios.map((espacio) => espacio.complejo))];
  }, [espacios]);

  // Los dos filtros pueden utilizarse simultáneamente.
  const espaciosFiltrados = useMemo(() => {
    return espacios.filter((espacio) => {
      const coincideDeporte =
        deporteSeleccionado === null ||
        espacio.deporteId === deporteSeleccionado;

      const coincideComplejo =
        complejoSeleccionado === null ||
        espacio.complejo === complejoSeleccionado;

      return coincideDeporte && coincideComplejo;
    });
  }, [espacios, deporteSeleccionado, complejoSeleccionado]);

  function limpiarFiltros() {
    setDeporteSeleccionado(null);
    setComplejoSeleccionado(null);
  }

  function obtenerNombreDeporte(deporteId: string) {
    return (
      deportes.find((deporte) => deporte.id === deporteId)?.nombre ??
      "Deporte"
    );
  }

  const hayFiltrosActivos =
    deporteSeleccionado !== null ||
    complejoSeleccionado !== null;

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Reservas Deportivas</Text>

      <Text style={styles.subtitulo}>
        Espacios deportivos de Villaguay
      </Text>

      {cargando ? (
        <ActivityIndicator size="large" />
      ) : (
        <>
          <View style={styles.seccionFiltros}>
            <Text style={styles.tituloFiltro}>Deporte</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filaFiltros}
            >
              <Pressable
                style={[
                  styles.botonFiltro,
                  deporteSeleccionado === null &&
                    styles.botonFiltroActivo,
                ]}
                onPress={() => setDeporteSeleccionado(null)}
              >
                <Text
                  style={[
                    styles.textoFiltro,
                    deporteSeleccionado === null &&
                      styles.textoFiltroActivo,
                  ]}
                >
                  Todos
                </Text>
              </Pressable>

              {deportes.map((deporte) => {
                const seleccionado =
                  deporteSeleccionado === deporte.id;

                return (
                  <Pressable
                    key={deporte.id}
                    style={[
                      styles.botonFiltro,
                      seleccionado && styles.botonFiltroActivo,
                    ]}
                    onPress={() =>
                      setDeporteSeleccionado(deporte.id)
                    }
                  >
                    <Text
                      style={[
                        styles.textoFiltro,
                        seleccionado && styles.textoFiltroActivo,
                      ]}
                    >
                      {deporte.nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.tituloFiltro}>Complejo</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filaFiltros}
            >
              <Pressable
                style={[
                  styles.botonFiltro,
                  complejoSeleccionado === null &&
                    styles.botonFiltroActivo,
                ]}
                onPress={() => setComplejoSeleccionado(null)}
              >
                <Text
                  style={[
                    styles.textoFiltro,
                    complejoSeleccionado === null &&
                      styles.textoFiltroActivo,
                  ]}
                >
                  Todos
                </Text>
              </Pressable>

              {complejos.map((complejo) => {
                const seleccionado =
                  complejoSeleccionado === complejo;

                return (
                  <Pressable
                    key={complejo}
                    style={[
                      styles.botonFiltro,
                      seleccionado && styles.botonFiltroActivo,
                    ]}
                    onPress={() =>
                      setComplejoSeleccionado(complejo)
                    }
                  >
                    <Text
                      style={[
                        styles.textoFiltro,
                        seleccionado && styles.textoFiltroActivo,
                      ]}
                    >
                      {complejo}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.filaResultados}>
              <Text style={styles.contador}>
                {espaciosFiltrados.length} de {espacios.length} espacios
              </Text>

              {hayFiltrosActivos && (
                <Pressable onPress={limpiarFiltros}>
                  <Text style={styles.limpiar}>
                    Limpiar filtros
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          <FlatList
            data={espaciosFiltrados}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.lista}
            renderItem={({ item }) => (
              <Pressable
                style={styles.tarjeta}
                onPress={() =>
                  router.push({
                    pathname: "/espacios/[id]",
                    params: { id: item.id },
                  })
                }
              >
                {/* Fotografía de la cancha */}
                {item.imagenes.length > 0 &&
                    obtenerImagenEspacio(item.imagenes[0]) && (
                      <Image
                        source={obtenerImagenEspacio(item.imagenes[0])!}
                        style={styles.imagenEspacio}
                        resizeMode="cover"
                      />
                    )}
              
                <Text style={styles.nombre}>
                  {item.nombre}
                </Text>

                <Text style={styles.deporte}>
                  {obtenerNombreDeporte(item.deporteId)}
                </Text>

                <Text>
                  Complejo: {item.complejo}
                </Text>

                <Text>
                  Superficie: {item.superficie}
                </Text>

                <Text>
                  Capacidad: {item.capacidad} personas
                </Text>

                <Text style={styles.precio}>
                  {item.precioPorHora.toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                    maximumFractionDigits: 0,
                  })}{" "}
                  por hora
                </Text>

                <Text style={styles.enlaceDetalle}>
                  Ver detalles →
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.sinResultados}>
                <Text style={styles.mensajeVacio}>
                  No hay espacios que coincidan con los filtros.
                </Text>

                <Pressable onPress={limpiarFiltros}>
                  <Text style={styles.limpiar}>
                    Mostrar todos los espacios
                  </Text>
                </Pressable>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    backgroundColor: "#F5F5F5",
  },
  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 18,
  },
  seccionFiltros: {
    marginBottom: 12,
  },
  tituloFiltro: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8,
  },
  filaFiltros: {
    gap: 8,
    paddingBottom: 14,
  },
  botonFiltro: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },
  botonFiltroActivo: {
    backgroundColor: "#1565C0",
    borderColor: "#1565C0",
  },
  textoFiltro: {
    fontSize: 13,
    color: "#333333",
    fontWeight: "500",
  },
  textoFiltroActivo: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  filaResultados: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  contador: {
    fontSize: 13,
    color: "#666666",
  },
  limpiar: {
    fontSize: 13,
    color: "#1565C0",
    fontWeight: "600",
  },
  lista: {
    paddingBottom: 24,
  },
  tarjeta: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 5,
  },
  nombre: {
    fontSize: 18,
    fontWeight: "bold",
  },
  deporte: {
    fontSize: 13,
    color: "#1565C0",
    fontWeight: "600",
    marginBottom: 5,
  },
  precio: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
    marginTop: 6,
  },
  enlaceDetalle: {
    color: "#1565C0",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 8,
  },
  imagenEspacio: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginBottom: 10,
  },
  sinResultados: {
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  mensajeVacio: {
    textAlign: "center",
    color: "#666666",
    fontSize: 15,
  },
});