
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
import { Ionicons } from "@expo/vector-icons";

import CorazonFavorito from "../componentes/CorazonFavorito";

import type { Deporte, Espacio } from "../tipos/types";
import { obtenerEspacios } from "../servicios/espacios";
import { obtenerDeportes } from "../servicios/deportes";
import { obtenerImagenEspacio } from "../servicios/imagenes";
import { useAuth } from "../contextos/AuthContext";

import {
  useConexion,
  mostrarAvisoSinConexion,
} from "../hooks/useConexion";

export default function Inicio() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(
    null
  );

  const [deporteSeleccionado, setDeporteSeleccionado] =
    useState<string | null>(null);

  const [complejoSeleccionado, setComplejoSeleccionado] =
    useState<string | null>(null);

  const [recarga, setRecarga] = useState(0);

  const { usuario, cargandoSesion } = useAuth();
  const { sinConexion } = useConexion();

  // Cargar el catálogo solamente si hay conexión.
  // Si se recupera Internet, vuelve a consultar la API.
  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      if (sinConexion) {
        setCargando(false);
        return;
      }

      setCargando(true);
      setErrorCatalogo(null);

      try {
        const [datosEspacios, datosDeportes] = await Promise.all([
          obtenerEspacios(),
          obtenerDeportes(),
        ]);

        if (!activo) return;

        setEspacios(datosEspacios);
        setDeportes(datosDeportes);
      } catch (error) {
        if (!activo) return;

        console.error("Error al cargar el catálogo:", error);

        setErrorCatalogo(
          "No se pudo conectar con el servidor para cargar las canchas."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarDatos();

    return () => {
      activo = false;
    };
  }, [sinConexion, recarga]);

  // Obtener complejos sin repetir nombres.
  const complejos = useMemo(() => {
    return [
      ...new Set(
        espacios.map((espacio) => espacio.complejo)
      ),
    ];
  }, [espacios]);

  // Los filtros por deporte y complejo funcionan simultáneamente.
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
  }, [
    espacios,
    deporteSeleccionado,
    complejoSeleccionado,
  ]);

  function limpiarFiltros() {
    setDeporteSeleccionado(null);
    setComplejoSeleccionado(null);
  }

  function obtenerNombreDeporte(deporteId: string) {
    return (
      deportes.find((deporte) => deporte.id === deporteId)
        ?.nombre ?? "Deporte"
    );
  }

  function abrirEspacio(espacioId: string) {
    if (sinConexion) {
      mostrarAvisoSinConexion();
      return;
    }

    router.push({
      pathname: "/espacios/[id]",
      params: { id: espacioId },
    });
  }

  const hayFiltrosActivos =
    deporteSeleccionado !== null ||
    complejoSeleccionado !== null;

  return (
    <View style={styles.contenedor}>
      {/* Encabezado */}
      <Text style={styles.titulo}>
        Reservas Deportivas
      </Text>

      <Text style={styles.subtitulo}>
        Espacios deportivos de Villaguay
      </Text>

      {/* Acceso a la cuenta */}
      {cargandoSesion ? (
        <View style={styles.sesionCargando}>
          <ActivityIndicator
            size="small"
            color="#1565C0"
          />

          <Text style={styles.textoSesionCargando}>
            Recuperando sesión...
          </Text>
        </View>
      ) : usuario ? (
        <View style={styles.seccionUsuario}>
          <Text style={styles.bienvenida}>
            ¡Hola, {usuario.nombre}!
          </Text>

          <Pressable
            style={styles.botonPerfil}
            onPress={() => router.push("/perfil")}
          >
            <Ionicons
              name="person-circle-outline"
              size={22}
              color="#FFFFFF"
            />

            <Text style={styles.textoBotonPerfil}>
              Mi perfil
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.botonLogin}
          onPress={() => {
            if (sinConexion) {
              mostrarAvisoSinConexion();
            } else {
              router.push("/login");
            }
          }}
        >
          <Text style={styles.textoBotonLogin}>
            Iniciar sesión
          </Text>
        </Pressable>
      )}

      {/* Modo sin conexión */}
      {sinConexion ? (
        <View style={styles.contenedorSinConexion}>
          <View style={styles.iconoSinConexion}>
            <Ionicons
              name="cloud-offline-outline"
              size={58}
              color="#757575"
            />
          </View>

          <Text style={styles.tituloSinConexion}>
            Sin conexión a Internet
          </Text>

          <Text style={styles.mensajeSinConexion}>
            No es posible consultar las canchas ni realizar
            nuevas reservas en este momento.
          </Text>

          {usuario ? (
            <View style={styles.tarjetaOffline}>
              <Ionicons
                name="qr-code-outline"
                size={30}
                color="#1565C0"
              />

              <Text style={styles.tituloTarjetaOffline}>
                Tus reservas siguen disponibles
              </Text>

              <Text style={styles.textoTarjetaOffline}>
                Podés entrar a Mi perfil, consultar tus
                próximas reservas guardadas y presentar
                sus códigos QR sin Internet.
              </Text>

              <Pressable
                style={styles.botonReservasOffline}
                onPress={() => router.push("/mis-reservas")}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color="#FFFFFF"
                />

                <Text style={styles.textoBotonReservasOffline}>
                  Ver mis reservas
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.mensajeSinConexion}>
              Para acceder a tus reservas guardadas,
              necesitás haber iniciado sesión previamente
              en este dispositivo.
            </Text>
          )}

        </View>
      ) : cargando ? (
        /* Cargando catálogo */
        <View style={styles.centrado}>
          <ActivityIndicator
            size="large"
            color="#1565C0"
          />

          <Text style={styles.textoSesionCargando}>
            Cargando espacios deportivos...
          </Text>
        </View>
      ) : errorCatalogo ? (
        /* Error al conectar con el backend */
        <View style={styles.contenedorSinConexion}>
          <Ionicons
            name="alert-circle-outline"
            size={56}
            color="#C62828"
          />

          <Text style={styles.tituloSinConexion}>
            No se pudieron cargar las canchas
          </Text>

          <Text style={styles.mensajeSinConexion}>
            {errorCatalogo}
          </Text>

          <Pressable
            style={styles.botonReintentar}
            onPress={() =>
              setRecarga((valor) => valor + 1)
            }
          >
            <Text style={styles.textoBotonReintentar}>
              Reintentar
            </Text>
          </Pressable>

          {usuario && (
            <Pressable
              style={styles.botonReservasOffline}
              onPress={() => router.push("/mis-reservas")}
            >
              <Text style={styles.textoBotonReservasOffline}>
                Ir a mis reservas
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          {/* Filtros */}
          <View style={styles.seccionFiltros}>
            <Text style={styles.tituloFiltro}>
              Deporte
            </Text>

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
                onPress={() =>
                  setDeporteSeleccionado(null)
                }
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
                      seleccionado &&
                        styles.botonFiltroActivo,
                    ]}
                    onPress={() =>
                      setDeporteSeleccionado(deporte.id)
                    }
                  >
                    <Text
                      style={[
                        styles.textoFiltro,
                        seleccionado &&
                          styles.textoFiltroActivo,
                      ]}
                    >
                      {deporte.nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.tituloFiltro}>
              Complejo
            </Text>

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
                onPress={() =>
                  setComplejoSeleccionado(null)
                }
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
                      seleccionado &&
                        styles.botonFiltroActivo,
                    ]}
                    onPress={() =>
                      setComplejoSeleccionado(complejo)
                    }
                  >
                    <Text
                      style={[
                        styles.textoFiltro,
                        seleccionado &&
                          styles.textoFiltroActivo,
                      ]}
                    >
                      {complejo}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Cantidad de resultados */}
            <View style={styles.filaResultados}>
              <Text style={styles.contador}>
                {espaciosFiltrados.length} de{" "}
                {espacios.length} espacios
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

          {/* Listado de espacios deportivos */}
          <FlatList
            data={espaciosFiltrados}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.lista}
            renderItem={({ item }) => {
              const imagen =
                item.imagenes.length > 0
                  ? obtenerImagenEspacio(item.imagenes[0])
                  : null;

              return (
                <Pressable
                  style={styles.tarjeta}
                  onPress={() =>
                    abrirEspacio(item.id)
                  }
                >
                  {/* Fotografía */}
                  {imagen && (
                    <Image
                      source={imagen}
                      style={styles.imagenEspacio}
                      resizeMode="cover"
                    />
                  )}

                  {/* Nombre y favorito */}
                  <View style={styles.filaNombre}>
                    <Text
                      style={[
                        styles.nombre,
                        { flex: 1 },
                      ]}
                    >
                      {item.nombre}
                    </Text>

                    <CorazonFavorito
                      espacioId={item.id}
                    />
                  </View>

                  <Text style={styles.deporte}>
                    {obtenerNombreDeporte(
                      item.deporteId
                    )}
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
                    {item.precioPorHora.toLocaleString(
                      "es-AR",
                      {
                        style: "currency",
                        currency: "ARS",
                        maximumFractionDigits: 0,
                      }
                    )}{" "}
                    por hora
                  </Text>

                  <Text style={styles.enlaceDetalle}>
                    Ver detalles →
                  </Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.sinResultados}>
                <Text style={styles.mensajeVacio}>
                  No hay espacios que coincidan
                  con los filtros.
                </Text>

                <Pressable
                  onPress={limpiarFiltros}
                >
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

  botonLogin: {
    backgroundColor: "#1565C0",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 18,
  },

  textoBotonLogin: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  sesionCargando: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },

  textoSesionCargando: {
    color: "#666666",
    fontSize: 14,
  },

  seccionUsuario: {
    marginBottom: 18,
  },

  bienvenida: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 10,
  },

  botonPerfil: {
    backgroundColor: "#1565C0",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  textoBotonPerfil: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
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

  filaNombre: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  contenedorSinConexion: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingBottom: 30,
    gap: 18,
  },

  iconoSinConexion: {
    alignItems: "center",
    justifyContent: "center",
  },

  tituloSinConexion: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333333",
    textAlign: "center",
  },

  mensajeSinConexion: {
    fontSize: 15,
    color: "#666666",
    lineHeight: 23,
    textAlign: "center",
  },

  tarjetaOffline: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 14,
  },

  tituloTarjetaOffline: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#212121",
    textAlign: "center",
  },

  textoTarjetaOffline: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
    lineHeight: 21,
  },

  botonReservasOffline: {
    backgroundColor: "#1565C0",
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    width: "100%",
  },

  textoBotonReservasOffline: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
 
  botonReintentar: {
    backgroundColor: "#1565C0",
    paddingVertical: 13,
    paddingHorizontal: 26,
    borderRadius: 10,
  },

  textoBotonReintentar: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
});

