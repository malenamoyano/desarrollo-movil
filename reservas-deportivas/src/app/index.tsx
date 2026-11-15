import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import CorazonFavorito from "../componentes/CorazonFavorito";
import ImagenEspacio from "../componentes/ImagenEspacio";

import type { Deporte, Espacio } from "../tipos/types";

import { obtenerEspacios } from "../servicios/espacios";
import { obtenerDeportes } from "../servicios/deportes";
import { sincronizarFotosEspacio } from "../servicios/mediosEspacios";

import {
  guardarPreferenciasCatalogo,
  obtenerPreferenciasCatalogo,
} from "../servicios/preferenciasLocales";

import { useAuth } from "../contextos/AuthContext";

import {
  useConexion,
  mostrarAvisoSinConexion,
} from "../hooks/useConexion";

const nombresDeportes: Record<string, string> = {
  "dep-futbol5": "Fútbol 5",
  "dep-futbol11": "Fútbol 11",
  "dep-basquet": "Básquet",
  "dep-voley": "Vóley",
  "dep-tenis": "Tenis",
  "dep-gimnasio": "Gimnasio",
};

export default function Inicio() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [cargando, setCargando] = useState(true);

  const [errorCatalogo, setErrorCatalogo] = useState<
    string | null
  >(null);

  const [deporteSeleccionado, setDeporteSeleccionado] =
    useState<string | null>(null);

  const [complejoSeleccionado, setComplejoSeleccionado] =
    useState<string | null>(null);

  // Evita sobrescribir las preferencias antes de recuperarlas.
  const [preferenciasCargadas, setPreferenciasCargadas] =
    useState(false);

  const [recarga, setRecarga] = useState(0);

  const { usuario, cargandoSesion } = useAuth();
  const { sinConexion } = useConexion();

  // --------------------------------------------------
  // RECUPERAR PREFERENCIAS DESDE KV-STORE
  // --------------------------------------------------
  useEffect(() => {
    let activo = true;

    async function cargarPreferencias() {
      try {
        const preferencias =
          await obtenerPreferenciasCatalogo();

        if (!activo) return;

        setDeporteSeleccionado(
          preferencias.deporteSeleccionado
        );

        setComplejoSeleccionado(
          preferencias.complejoSeleccionado
        );
      } catch (error) {
        console.warn(
          "No se pudieron cargar las preferencias:",
          error
        );
      } finally {
        if (activo) {
          setPreferenciasCargadas(true);
        }
      }
    }

    void cargarPreferencias();

    return () => {
      activo = false;
    };
  }, []);

  // --------------------------------------------------
  // GUARDAR PREFERENCIAS AL CAMBIAR FILTROS
  // --------------------------------------------------
  useEffect(() => {
    if (!preferenciasCargadas) return;

    void guardarPreferenciasCatalogo({
      deporteSeleccionado,
      complejoSeleccionado,
    }).catch((error) => {
      console.warn(
        "No se pudieron guardar las preferencias:",
        error
      );
    });
  }, [
    preferenciasCargadas,
    deporteSeleccionado,
    complejoSeleccionado,
  ]);

  // --------------------------------------------------
  // REDIRECCIÓN DE USUARIOS DE GESTIÓN
  // --------------------------------------------------
  useEffect(() => {
    if (cargandoSesion || !usuario) return;

    if (
      usuario.rol === "encargado" ||
      usuario.rol === "administrador"
    ) {
      router.replace("/encargado");
    }
  }, [cargandoSesion, usuario?.rol]);

  // --------------------------------------------------
  // CARGA DE ESPACIOS CON Y SIN CONEXIÓN
  // --------------------------------------------------
  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      setCargando(true);
      setErrorCatalogo(null);

      try {
        const datosEspacios = await obtenerEspacios();

        if (!activo) return;

        setEspacios(datosEspacios);

        if (!sinConexion) {
          try {
            const datosDeportes = await obtenerDeportes();

            if (activo) {
              setDeportes(datosDeportes);
            }
          } catch (error) {
            console.warn(
              "No se pudieron actualizar los deportes:",
              error
            );
          }
        }
      } catch (error) {
        if (!activo) return;

        console.error(
          "Error al cargar el catálogo:",
          error
        );

        setErrorCatalogo(
          "No se pudieron recuperar los espacios deportivos."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargarDatos();

    return () => {
      activo = false;
    };
  }, [sinConexion, recarga]);

  // --------------------------------------------------
  // SINCRONIZACIÓN DE FOTOGRAFÍAS
  // --------------------------------------------------
  useEffect(() => {
    if (sinConexion || espacios.length === 0) {
      return;
    }

    espacios.forEach((espacio) => {
      void sincronizarFotosEspacio(espacio).catch(
        (error) => {
          console.warn(
            "No se pudo sincronizar una fotografía:",
            error
          );
        }
      );
    });
  }, [espacios, sinConexion]);

  // --------------------------------------------------
  // DEPORTES Y COMPLEJOS PARA LOS FILTROS
  // --------------------------------------------------
  const deportesParaFiltros = useMemo(() => {
    const idsDisponibles = [
      ...new Set(
        espacios.map((espacio) => espacio.deporteId)
      ),
    ];

    return idsDisponibles.map((id) => ({
      id,
      nombre:
        deportes.find((deporte) => deporte.id === id)
          ?.nombre ??
        nombresDeportes[id] ??
        id.replace(/^dep-/, "").replace(/-/g, " "),
    }));
  }, [espacios, deportes]);

  const complejos = useMemo(() => {
    return [
      ...new Set(
        espacios.map((espacio) => espacio.complejo)
      ),
    ];
  }, [espacios]);

  // --------------------------------------------------
  // FILTRADO DE ESPACIOS
  // --------------------------------------------------
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
      deportesParaFiltros.find(
        (deporte) => deporte.id === deporteId
      )?.nombre ?? "Deporte"
    );
  }

  // --------------------------------------------------
  // NAVEGACIÓN AL DETALLE
  // --------------------------------------------------
  function abrirEspacio(espacioId: string) {
    router.push({
      pathname: "/espacios/[id]",
      params: { id: espacioId },
    });
  }

  const hayFiltrosActivos =
    deporteSeleccionado !== null ||
    complejoSeleccionado !== null;

  // --------------------------------------------------
  // RECUPERACIÓN DE SESIÓN
  // --------------------------------------------------
  if (cargandoSesion) {
    return (
      <View style={styles.pantallaBloqueo}>
        <View style={styles.iconoBloqueo}>
          <Ionicons
            name="finger-print-outline"
            size={48}
            color="#1565C0"
          />
        </View>

        <Text style={styles.tituloBloqueo}>
          Reservas Deportivas
        </Text>

        <Text style={styles.descripcionBloqueo}>
          Estamos verificando tu acceso para proteger
          tu cuenta.
        </Text>

        <ActivityIndicator
          size="large"
          color="#1565C0"
        />

        <Text style={styles.textoSesionCargando}>
          Esperá un momento para continuar...
        </Text>
      </View>
    );
  }

  // --------------------------------------------------
  // ACCESO AL PANEL DE GESTIÓN
  // --------------------------------------------------
  if (
    usuario?.rol === "encargado" ||
    usuario?.rol === "administrador"
  ) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator
          size="large"
          color="#1565C0"
        />

        <Text style={styles.textoSesionCargando}>
          Ingresando al panel de gestión...
        </Text>
      </View>
    );
  }

  // --------------------------------------------------
  // INTERFAZ PRINCIPAL
  // --------------------------------------------------
  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>
        Reservas Deportivas
      </Text>

      <Text style={styles.subtitulo}>
        Espacios deportivos de Villaguay
      </Text>

      {/* USUARIO Y PERFIL EN LA MISMA FILA */}
      {usuario ? (
        <View style={styles.seccionUsuario}>
          <Text
            style={styles.bienvenida}
            numberOfLines={2}
          >
            ¡Hola, {usuario.nombre}!
          </Text>

          <Pressable
            style={styles.botonPerfil}
            onPress={() => router.push("/perfil")}
          >
            <Ionicons
              name="person-circle-outline"
              size={18}
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

      {/* AVISO OFFLINE COMPACTO */}
      {sinConexion && (
        <View style={styles.avisoOffline}>
          <View style={styles.filaAvisoOffline}>
            <Ionicons
              name="cloud-offline-outline"
              size={19}
              color="#B26A00"
            />

            <Text style={styles.tituloAvisoOffline}>
              Sin conexión
            </Text>

            {usuario && (
              <Pressable
                style={styles.botonReservasOffline}
                onPress={() =>
                  router.push("/mis-reservas")
                }
              >
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color="#FFFFFF"
                />

                <Text
                  style={styles.textoBotonReservasOffline}
                >
                  Mis reservas
                </Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.textoAvisoOffline}>
            Podés ver espacios y reservas guardados.
            Para consultar horarios o hacer nuevas
            reservas necesitás Internet.
          </Text>
        </View>
      )}

      {/* CATÁLOGO DE ESPACIOS */}
      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator
            size="large"
            color="#1565C0"
          />

          <Text style={styles.textoSesionCargando}>
            {sinConexion
              ? "Cargando espacios guardados..."
              : "Cargando espacios deportivos..."}
          </Text>
        </View>
      ) : errorCatalogo && espacios.length === 0 ? (
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

          {usuario && !sinConexion && (
            <Pressable
              style={styles.botonReservasOffline}
              onPress={() =>
                router.push("/mis-reservas")
              }
            >
              <Text
                style={styles.textoBotonReservasOffline}
              >
                Ir a mis reservas
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          {/* FILTRO POR DEPORTE */}
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

              {deportesParaFiltros.map((deporte) => {
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

            {/* FILTRO POR COMPLEJO */}
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

            {/* RESULTADOS */}
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

          {/* LISTADO DE ESPACIOS */}
          <FlatList
            data={espaciosFiltrados}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.lista}
            renderItem={({ item }) => {
              return (
                <Pressable
                  style={styles.tarjeta}
                  onPress={() =>
                    abrirEspacio(item.id)
                  }
                >
                  {item.imagenes.length > 0 && (
                    <ImagenEspacio
                      fuente={item.imagenes[0]}
                      style={styles.imagenEspacio}
                    />
                  )}

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
                  {sinConexion && espacios.length === 0
                    ? "Todavía no hay espacios guardados en este dispositivo."
                    : "No hay espacios que coincidan con los filtros."}
                </Text>

                {hayFiltrosActivos && (
                  <Pressable onPress={limpiarFiltros}>
                    <Text style={styles.limpiar}>
                      Mostrar todos los espacios
                    </Text>
                  </Pressable>
                )}
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

// --------------------------------------------------
// ESTILOS
// --------------------------------------------------
const styles = StyleSheet.create({
  pantallaBloqueo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F5F5F5",
    gap: 14,
  },

  iconoBloqueo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  tituloBloqueo: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#212121",
    textAlign: "center",
  },

  descripcionBloqueo: {
    fontSize: 15,
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },

  contenedor: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#F5F5F5",
  },

  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 5,
  },

  subtitulo: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 12,
  },

  botonLogin: {
    backgroundColor: "#1565C0",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  textoBotonLogin: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },

  textoSesionCargando: {
    color: "#666666",
    fontSize: 14,
  },

  seccionUsuario: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },

  bienvenida: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#333333",
  },

  botonPerfil: {
    backgroundColor: "#1565C0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  textoBotonPerfil: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },

  seccionFiltros: {
    marginBottom: 8,
  },

  tituloFiltro: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8,
  },

  filaFiltros: {
    gap: 8,
    paddingBottom: 10,
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

  botonReservasOffline: {
    backgroundColor: "#1565C0",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },

  textoBotonReservasOffline: {
    color: "#FFFFFF",
    fontSize: 12,
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

  avisoOffline: {
    backgroundColor: "#FFF3E0",
    borderWidth: 1,
    borderColor: "#FFE0B2",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    gap: 5,
    marginBottom: 10,
  },

  filaAvisoOffline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  tituloAvisoOffline: {
    flex: 1,
    fontSize: 14,
    fontWeight: "bold",
    color: "#8B5400",
  },

  textoAvisoOffline: {
    fontSize: 12,
    color: "#6D5A39",
    lineHeight: 17,
  },
});
