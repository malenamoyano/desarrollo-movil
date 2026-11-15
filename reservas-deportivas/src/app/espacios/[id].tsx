
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import type { Espacio } from "../../tipos/types";

import { obtenerEspacioPorId } from "../../servicios/espacios";
import { obtenerDeportePorId } from "../../servicios/deportes";

import ImagenEspacio from "../../componentes/ImagenEspacio";
import ReproductorVideo from "../../componentes/ReproductorVideo";

import {
  useConexion,
  mostrarAvisoSinConexion,
} from "../../hooks/useConexion";

// Nombres de respaldo para mostrar el deporte sin Internet.
const nombresDeportes: Record<string, string> = {
  "dep-futbol5": "Fútbol 5",
  "dep-futbol11": "Fútbol 11",
  "dep-basquet": "Básquet",
  "dep-voley": "Vóley",
  "dep-tenis": "Tenis",
  "dep-gimnasio": "Gimnasio",
};

export default function DetalleEspacio() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { sinConexion } = useConexion();

  const [espacio, setEspacio] = useState<Espacio | null>(
    null
  );

  const [nombreDeporte, setNombreDeporte] = useState(
    "Espacio deportivo"
  );

  const [cargando, setCargando] = useState(true);

  // --------------------------------------------------
  // CARGAR DETALLE CON O SIN CONEXIÓN
  // --------------------------------------------------
  useEffect(() => {
    let activo = true;

    async function cargarDetalle() {
      setCargando(true);

      try {
        if (!id) {
          if (activo) {
            setEspacio(null);
          }

          return;
        }

        // El servicio recupera el espacio desde
        // el catálogo o el almacenamiento local.
        const datos = await obtenerEspacioPorId(id);

        if (!activo) return;

        setEspacio(datos);

        if (!datos) {
          return;
        }

        // Nombre disponible sin consultar la API.
        const nombreAlternativo =
          nombresDeportes[datos.deporteId] ??
          "Espacio deportivo";

        setNombreDeporte(nombreAlternativo);

        // Solo consultar el deporte cuando hay Internet.
        if (!sinConexion) {
          try {
            const deporte = await obtenerDeportePorId(
              datos.deporteId
            );

            if (activo && deporte) {
              setNombreDeporte(deporte.nombre);
            }
          } catch (error) {
            console.warn(
              "No se pudo actualizar el deporte:",
              error
            );
          }
        }
      } catch (error) {
        if (activo) {
          console.error(
            "Error al cargar el espacio:",
            error
          );

          setEspacio(null);
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargarDetalle();

    return () => {
      activo = false;
    };
  }, [id, sinConexion]);

  // --------------------------------------------------
  // DISPONIBILIDAD: REQUIERE INTERNET
  // --------------------------------------------------
  function verDisponibilidad() {
    if (sinConexion) {
      mostrarAvisoSinConexion();
      return;
    }

    if (!espacio) return;

    router.push({
      pathname: "/espacios/[id]/turnos",
      params: { id: espacio.id },
    });
  }

  // --------------------------------------------------
  // UBICACIÓN EN EL MAPA
  // --------------------------------------------------
  function verUbicacion() {
    if (!espacio?.coordenadas) return;

    const { latitud, longitud } = espacio.coordenadas;

    if (
      !Number.isFinite(latitud) ||
      !Number.isFinite(longitud)
    ) {
      return;
    }

    // La pantalla mapa.tsx recibe el ID
    // para centrarse en la cancha seleccionada.
    router.push({
      pathname: "/mapa",
      params: { id: espacio.id },
    });
  }

  // --------------------------------------------------
  // CARGANDO
  // --------------------------------------------------
  if (cargando) {
    return (
      <View style={styles.centrado}>
        <Stack.Screen
          options={{ title: "Cargando..." }}
        />

        <ActivityIndicator
          size="large"
          color="#1976D2"
        />

        <Text style={styles.textoCarga}>
          {sinConexion
            ? "Cargando información guardada..."
            : "Cargando espacio deportivo..."}
        </Text>
      </View>
    );
  }

  // --------------------------------------------------
  // ESPACIO NO ENCONTRADO
  // --------------------------------------------------
  if (!espacio) {
    return (
      <View style={styles.centrado}>
        <Stack.Screen
          options={{
            title: "Espacio no encontrado",
          }}
        />

        <Ionicons
          name="alert-circle-outline"
          size={50}
          color="#757575"
        />

        <Text style={styles.textoCarga}>
          No se encontró el espacio deportivo.
        </Text>

        {sinConexion && (
          <Text style={styles.textoCarga}>
            Es posible que todavía no esté
            guardado en este dispositivo.
          </Text>
        )}
      </View>
    );
  }

  // --------------------------------------------------
  // VIDEO
  // --------------------------------------------------

  // Los videos incluidos mediante require() son números.
  // Las rutas locales también pueden reproducirse offline.
  // No asumimos que videoUrl siempre es un string.
  const videoEsLocal =
    typeof espacio.videoUrl === "number" ||
    (typeof espacio.videoUrl === "string" &&
      (espacio.videoUrl.startsWith("file://") ||
        espacio.videoUrl.startsWith("content://") ||
        espacio.videoUrl.startsWith("asset://")));

  const puedeMostrarVideo =
    !sinConexion ||
    espacio.videoUrl == null ||
    videoEsLocal;

  // --------------------------------------------------
  // VALIDAR COORDENADAS
  // --------------------------------------------------
  const tieneCoordenadas =
    espacio.coordenadas != null &&
    Number.isFinite(espacio.coordenadas.latitud) &&
    Number.isFinite(espacio.coordenadas.longitud);

  // --------------------------------------------------
  // INTERFAZ DEL DETALLE
  // --------------------------------------------------
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
        {/* AVISO OFFLINE */}
        {sinConexion && (
          <View style={styles.avisoOffline}>
            <Ionicons
              name="cloud-offline-outline"
              size={25}
              color="#B26A00"
            />

            <View style={styles.contenidoAviso}>
              <Text style={styles.tituloAviso}>
                Modo sin conexión
              </Text>

              <Text style={styles.textoAviso}>
                Estás consultando información guardada
                del espacio deportivo. La disponibilidad
                requiere Internet.
              </Text>
            </View>
          </View>
        )}

        {/* FOTOGRAFÍA DEL ESPACIO */}
        {espacio.imagenes.length > 0 ? (
          <ImagenEspacio
            fuente={espacio.imagenes[0]}
            style={styles.imagenEspacio}
          />
        ) : (
          <View style={styles.sinImagen}>
            <Text style={styles.textoSinImagen}>
              Imagen no disponible
            </Text>
          </View>
        )}

        {/* NOMBRE Y COMPLEJO */}
        <Text style={styles.titulo}>
          {espacio.nombre}
        </Text>

        <Text style={styles.subtitulo}>
          {espacio.complejo}
        </Text>

        {/* ------------------------------------------
            UBICACIÓN DE LA CANCHA
            ------------------------------------------ */}
        {tieneCoordenadas && (
          <Pressable
            style={styles.botonMapa}
            onPress={verUbicacion}
            accessibilityRole="button"
            accessibilityLabel="Ver ubicación de la cancha en el mapa"
          >
            <View style={styles.iconoMapa}>
              <Ionicons
                name="location-outline"
                size={25}
                color="#1565C0"
              />
            </View>

            <View style={styles.contenidoMapa}>
              <Text style={styles.tituloMapa}>
                Ubicación de la cancha
              </Text>

              <Text style={styles.descripcionMapa}>
                Ver en el mapa y cómo llegar
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color="#1565C0"
            />
          </Pressable>
        )}

        {/* CARACTERÍSTICAS */}
        <View style={styles.tarjeta}>
          <Text style={styles.seccion}>
            Características
          </Text>

          {/* VIDEO */}
          {puedeMostrarVideo ? (
            <ReproductorVideo
              videoUrl={espacio.videoUrl ?? null}
            />
          ) : (
            <Text style={styles.mensajeVideoOffline}>
              El video necesita conexión y todavía
              no está disponible como archivo local.
            </Text>
          )}

          <Text style={styles.etiqueta}>
            Superficie
          </Text>

          <Text>
            {espacio.superficie}
          </Text>

          <Text style={styles.etiqueta}>
            Capacidad
          </Text>

          <Text>
            {espacio.capacidad} personas
          </Text>

          <Text style={styles.etiqueta}>
            Techado
          </Text>

          <Text>
            {espacio.techado ? "Sí" : "No"}
          </Text>

          <Text style={styles.etiqueta}>
            Iluminación
          </Text>

          <Text>
            {espacio.iluminacion ? "Sí" : "No"}
          </Text>
        </View>

        {/* PRECIO */}
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

          {sinConexion && (
            <Text style={styles.notaOffline}>
              Último precio guardado. Puede haber cambiado.
            </Text>
          )}
        </View>

        {/* REGLAS */}
        <View style={styles.tarjeta}>
          <Text style={styles.seccion}>
            Reglas del espacio
          </Text>

          <Text style={styles.reglas}>
            {espacio.reglas}
          </Text>
        </View>

        {/* DISPONIBILIDAD */}
        <Pressable
          style={[
            styles.botonDisponibilidad,
            sinConexion &&
              styles.botonDisponibilidadOffline,
          ]}
          onPress={verDisponibilidad}
        >
          <Ionicons
            name={
              sinConexion
                ? "wifi-outline"
                : "calendar-outline"
            }
            size={20}
            color="#FFFFFF"
          />

          <Text style={styles.textoBoton}>
            Ver disponibilidad
          </Text>
        </Pressable>

        <Text style={styles.ayudaDisponibilidad}>
          {sinConexion
            ? "Necesitás conexión a Internet para consultar horarios y reservar."
            : "Consultá los horarios disponibles sin iniciar sesión."}
        </Text>
      </ScrollView>
    </>
  );
}

// --------------------------------------------------
// ESTILOS
// --------------------------------------------------
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
    padding: 24,
    gap: 14,
    backgroundColor: "#F5F5F5",
  },

  textoCarga: {
    fontSize: 15,
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
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

  // ----------------------------------------
  // UBICACIÓN EN EL MAPA
  // ----------------------------------------
  botonMapa: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#D8E8FA",
  },

  iconoMapa: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },

  contenidoMapa: {
    flex: 1,
    gap: 4,
  },

  tituloMapa: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1565C0",
  },

  descripcionMapa: {
    fontSize: 13,
    color: "#666666",
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

  botonDisponibilidad: {
    backgroundColor: "#1976D2",
    borderRadius: 12,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  botonDisponibilidadOffline: {
    backgroundColor: "#9E9E9E",
  },

  textoBoton: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
  },

  ayudaDisponibilidad: {
    fontSize: 13,
    color: "#666666",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },

  // MODO SIN CONEXIÓN
  avisoOffline: {
    backgroundColor: "#FFF3E0",
    borderColor: "#FFE0B2",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  contenidoAviso: {
    flex: 1,
    gap: 5,
  },

  tituloAviso: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#8B5400",
  },

  textoAviso: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6D5A39",
  },

  notaOffline: {
    fontSize: 12,
    color: "#8B5400",
    marginTop: 8,
    fontStyle: "italic",
  },

  mensajeVideoOffline: {
    fontSize: 13,
    color: "#777777",
    lineHeight: 20,
    marginBottom: 12,
  },
});
