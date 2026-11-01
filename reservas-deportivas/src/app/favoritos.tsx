
import { useCallback, useState } from "react";
import { router, Stack, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { Espacio } from "../tipos/types";
import { obtenerEspacios } from "../servicios/espacios";
import { obtenerImagenEspacio } from "../servicios/imagenes";
import { useAuth } from "../contextos/AuthContext";
import CorazonFavorito from "../componentes/CorazonFavorito";

export default function Favoritos() {
  const { usuario } = useAuth();

  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      cargarEspacios();
    }, [cargarEspacios])
  );

  const idsFavoritos = usuario?.espaciosFavoritos ?? [];

  const espaciosFavoritos = espacios.filter((espacio) =>
    idsFavoritos.includes(espacio.id)
  );

  return (
    <>
      <Stack.Screen options={{ title: "Mis favoritos" }} />

      <View style={styles.contenedor}>
        {cargando ? (
          <View style={styles.centrado}>
            <ActivityIndicator size="large" color="#1565C0" />
            <Text>Cargando favoritos...</Text>
          </View>
        ) : error ? (
          <View style={styles.centrado}>
            <Text style={styles.error}>{error}</Text>

            <Pressable
              style={styles.botonReintentar}
              onPress={cargarEspacios}
            >
              <Text style={styles.textoBlanco}>Reintentar</Text>
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
                  Todavía no tenés favoritos
                </Text>

                <Text style={styles.subtitulo}>
                  Tocá el corazón de una cancha para guardarla acá.
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
              const imagen = item.imagenes[0]
                ? obtenerImagenEspacio(item.imagenes[0])
                : null;

              return (
                <View style={styles.tarjeta}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/espacios/[id]",
                        params: { id: item.id },
                      })
                    }
                  >
                    {imagen && (
                      <Image
                        source={imagen}
                        style={styles.imagen}
                        resizeMode="cover"
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
                      Ver disponibilidad y detalles
                    </Text>
                  </Pressable>

                  <View style={styles.corazon}>
                    <CorazonFavorito espacioId={item.id} />
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
  },
  subtitulo: {
    fontSize: 15,
    textAlign: "center",
    color: "#757575",
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
});
