import { useCallback, useState } from "react";
import { router, Stack, useFocusEffect } from "expo-router";

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import type { Espacio } from "../tipos/types";

import { obtenerEspacios } from "../servicios/espacios";
import { useAuth } from "../contextos/AuthContext";
import { useConexion } from "../hooks/useConexion";

import CorazonFavorito from "../componentes/CorazonFavorito";
import ImagenEspacio from "../componentes/ImagenEspacio";

export default function Favoritos() {
  const { usuario } = useAuth();
  const { sinConexion } = useConexion();

  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------
  // CARGAR ESPACIOS
  // obtenerEspacios() utiliza los datos locales
  // cuando no hay conexión.
  // --------------------------------------------------
  const cargarEspacios = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      const datos = await obtenerEspacios();
      setEspacios(datos);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los espacios."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargarEspacios();
    }, [cargarEspacios])
  );

  // --------------------------------------------------
  // FAVORITOS DEL USUARIO
  // Utilizamos los IDs del usuario recuperado
  // por AuthContext, también en modo offline.
  // --------------------------------------------------
  const idsFavoritos = usuario?.espaciosFavoritos ?? [];

  const espaciosFavoritos = espacios.filter((espacio) =>
    idsFavoritos.includes(espacio.id)
  );

  // --------------------------------------------------
  // NAVEGACIÓN AL DETALLE
  // El detalle también se puede consultar offline.
  // --------------------------------------------------
  function abrirEspacio(id: string) {
    router.push({
      pathname: "/espacios/[id]",
      params: { id },
    });
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Mis favoritos",
          headerBackTitle: "Volver",
        }}
      />

      <View style={styles.contenedor}>
        {/* AVISO OFFLINE COMPACTO */}
        {sinConexion && (
          <View style={styles.avisoOffline}>
            <Ionicons
              name="cloud-offline-outline"
              size={20}
              color="#B26A00"
            />

            <Text style={styles.textoOffline}>
              Sin conexión: podés consultar tus favoritos
              guardados, pero no modificarlos.
            </Text>
          </View>
        )}

        {cargando ? (
          <View style={styles.centrado}>
            <ActivityIndicator
              size="large"
              color="#1565C0"
            />

            <Text style={styles.textoSecundario}>
              {sinConexion
                ? "Cargando favoritos guardados..."
                : "Cargando favoritos..."}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centrado}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color="#C62828"
            />

            <Text style={styles.error}>
              {error}
            </Text>

            <Pressable
              style={styles.botonReintentar}
              onPress={() => {
                void cargarEspacios();
              }}
            >
              <Text style={styles.textoBlanco}>
                Reintentar
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={espaciosFavoritos}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.lista}
            ListHeaderComponent={
              <Text style={styles.contador}>
                {espaciosFavoritos.length}{" "}
                {espaciosFavoritos.length === 1
                  ? "espacio favorito"
                  : "espacios favoritos"}
              </Text>
            }
            ListEmptyComponent={
              <View style={styles.centrado}>
                <Ionicons
                  name="heart-outline"
                  size={64}
                  color="#BDBDBD"
                />

                <Text style={styles.tituloVacio}>
                  {sinConexion
                    ? "No hay favoritos disponibles"
                    : "Todavía no tenés favoritos"}
                </Text>

                <Text style={styles.subtitulo}>
                  {sinConexion
                    ? "No encontramos favoritos en la sesión guardada de este dispositivo."
                    : "Tocá el corazón de una cancha para guardarla acá."}
                </Text>

                <Pressable
                  style={styles.botonReintentar}
                  onPress={() => router.push("/")}
                >
                  <Text style={styles.textoBlanco}>
                    Explorar canchas
                  </Text>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => {
              return (
                <View style={styles.tarjeta}>
                  {/* DATOS DE LA CANCHA */}
                  <Pressable
                    onPress={() =>
                      abrirEspacio(item.id)
                    }
                  >
                    {item.imagenes.length > 0 && (
                      <ImagenEspacio
                        fuente={item.imagenes[0]}
                        style={styles.imagen}
                      />
                    )}

                    <View style={styles.filaNombre}>
                      <Text style={styles.nombre}>
                        {item.nombre}
                      </Text>
                    </View>

                    <Text style={styles.detalle}>
                      {item.complejo}
                    </Text>

                    <Text style={styles.enlace}>
                      Ver detalles
                    </Text>
                  </Pressable>

                  {/* CORAZÓN FAVORITO */}
                  <View style={styles.corazon}>
                    {sinConexion ? (
                      // Offline: mostrar estado sin permitir
                      // modificaciones que necesiten la API.
                      <View
                        style={styles.corazonOffline}
                      >
                        <Ionicons
                          name="heart"
                          size={27}
                          color="#E53935"
                        />
                      </View>
                    ) : (
                      // Online: conservar el componente
                      // que modifica favoritos en la API.
                      <CorazonFavorito
                        espacioId={item.id}
                      />
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  lista: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },

  contador: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 14,
  },

  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },

  imagen: {
    height: 165,
    width: "100%",
    borderRadius: 10,
    marginBottom: 12,
  },

  filaNombre: {
    flexDirection: "row",
    paddingRight: 42,
  },

  nombre: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222222",
  },

  detalle: {
    fontSize: 14,
    color: "#666666",
    marginTop: 6,
  },

  enlace: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1565C0",
    marginTop: 10,
  },

  corazon: {
    position: "absolute",
    top: 185,
    right: 14,
  },

  corazonOffline: {
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },

  tituloVacio: {
    fontSize: 19,
    fontWeight: "bold",
    textAlign: "center",
  },

  subtitulo: {
    fontSize: 15,
    textAlign: "center",
    color: "#757575",
  },

  textoSecundario: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
  },

  error: {
    color: "#C62828",
    textAlign: "center",
  },

  botonReintentar: {
    backgroundColor: "#1565C0",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
  },

  textoBlanco: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  // AVISO OFFLINE
  avisoOffline: {
    backgroundColor: "#FFF3E0",
    borderWidth: 1,
    borderColor: "#FFE0B2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  textoOffline: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#6D5A39",
  },
});
