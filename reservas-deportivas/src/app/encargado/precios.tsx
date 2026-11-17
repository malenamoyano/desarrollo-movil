import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Stack, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../contextos/AuthContext";

import type { Espacio } from "../../tipos/types";

import { obtenerEspacios } from "../../servicios/espacios";

import {
  actualizarPrecioEspacio,
} from "../../servicios/encargado/encargado";

import {
  guardarEspaciosLocales,
} from "../../servicios/cacheEspacios";

export default function Precios() {
  const { usuario } = useAuth();
  const esAdministrador = usuario?.rol === "administrador";

  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [preciosEditados, setPreciosEditados] = useState<
    Record<string, string>
  >({});

  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intentoCarga, setIntentoCarga] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!esAdministrador) return;

      let activo = true;

      async function cargarEspacios() {
        setCargando(true);
        setError(null);

        try {
          const datos = await obtenerEspacios();

          if (!activo) return;

          setEspacios(datos);

          const precios: Record<string, string> = {};

          datos.forEach((espacio) => {
            precios[espacio.id] = String(espacio.precioPorHora);
          });

          setPreciosEditados(precios);
        } catch (err) {
          if (!activo) return;

          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los espacios."
          );
        } finally {
          if (activo) {
            setCargando(false);
          }
        }
      }

      void cargarEspacios();

      return () => {
        activo = false;
      };
    }, [esAdministrador, intentoCarga])
  );

  async function guardarPrecio(espacio: Espacio) {
    if (!esAdministrador || guardandoId !== null) return;

    const valor = preciosEditados[espacio.id] ?? "";
    const precioNuevo = Number(valor);

    if (
      valor.trim() === "" ||
      !Number.isSafeInteger(precioNuevo) ||
      precioNuevo <= 0
    ) {
      Alert.alert(
        "Precio inválido",
        "Ingresá un precio entero mayor que cero."
      );
      return;
    }

    if (precioNuevo === espacio.precioPorHora) {
      Alert.alert(
        "Sin cambios",
        "El precio ingresado es igual al precio actual."
      );
      return;
    }

    try {
      setGuardandoId(espacio.id);

      const espacioActualizado = await actualizarPrecioEspacio(
        espacio.id,
        precioNuevo
      );

      const precioConfirmado =
        espacioActualizado.precioPorHora;

      const espaciosActualizados = espacios.map((actual) =>
        actual.id === espacio.id
          ? {
              ...actual,
              precioPorHora: precioConfirmado,
            }
          : actual
      );

      setEspacios(espaciosActualizados);

      setPreciosEditados((actuales) => ({
        ...actuales,
        [espacio.id]: String(precioConfirmado),
      }));

      try {
        await guardarEspaciosLocales(espaciosActualizados);

        Alert.alert(
          "Precio actualizado",
          `El precio de ${espacio.nombre} se actualizó correctamente.`
        );
      } catch {
        Alert.alert(
          "Precio actualizado",
          "El servidor guardó el nuevo precio, pero no se pudo actualizar la copia local."
        );
      }
    } catch (err) {
      Alert.alert(
        "No se pudo actualizar el precio",
        err instanceof Error
          ? err.message
          : "Ocurrió un error al guardar el precio."
      );
    } finally {
      setGuardandoId(null);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Gestionar precios",
          headerBackTitle: "Volver",
          headerTitleAlign: "center",
        }}
      />

      {!esAdministrador ? (
        <View style={styles.mensajeAcceso}>
          <Ionicons
            name="lock-closed-outline"
            size={45}
            color="#C62828"
          />

          <Text style={styles.tituloError}>
            Acceso restringido
          </Text>

          <Text style={styles.textoSecundario}>
            Solamente el administrador puede gestionar los precios.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.contenedor}
          contentContainerStyle={styles.contenido}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.encabezado}>
            <Text style={styles.titulo}>
              Precios por hora
            </Text>

            <Text style={styles.descripcion}>
              Consultá y modificá el importe de alquiler de cada
              espacio deportivo.
            </Text>
          </View>

          {cargando ? (
            <View style={styles.estadoCarga}>
              <ActivityIndicator
                size="large"
                color="#1565C0"
              />

              <Text style={styles.textoSecundario}>
                Cargando espacios...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.estadoCarga}>
              <Ionicons
                name="alert-circle-outline"
                size={45}
                color="#C62828"
              />

              <Text style={styles.tituloError}>
                No se pudieron cargar los espacios
              </Text>

              <Text style={styles.textoSecundario}>
                {error}
              </Text>

              <Pressable
                style={styles.botonReintentar}
                onPress={() =>
                  setIntentoCarga((actual) => actual + 1)
                }
              >
                <Text style={styles.textoBotonReintentar}>
                  Reintentar
                </Text>
              </Pressable>
            </View>
          ) : espacios.length === 0 ? (
            <View style={styles.estadoCarga}>
              <Ionicons
                name="business-outline"
                size={45}
                color="#9E9E9E"
              />

              <Text style={styles.tituloError}>
                No hay espacios disponibles
              </Text>
            </View>
          ) : (
            espacios.map((espacio) => {
              const guardando = guardandoId === espacio.id;

              return (
                <View
                  key={espacio.id}
                  style={styles.tarjeta}
                >
                  <View style={styles.cabeceraTarjeta}>
                    <View style={styles.iconoTarjeta}>
                      <Ionicons
                        name="business-outline"
                        size={24}
                        color="#1565C0"
                      />
                    </View>

                    <View style={styles.datosEspacio}>
                      <Text style={styles.nombreEspacio}>
                        {espacio.nombre}
                      </Text>

                      <Text style={styles.complejo}>
                        {espacio.complejo}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.separador} />

                  <Text style={styles.etiqueta}>
                    Precio por hora
                  </Text>

                  <View style={styles.filaPrecio}>
                    <View style={styles.campoPrecio}>
                      <Text style={styles.simboloPesos}>
                        $
                      </Text>

                      <TextInput
                        style={styles.inputPrecio}
                        value={
                          preciosEditados[espacio.id] ?? ""
                        }
                        onChangeText={(valor) =>
                          setPreciosEditados((actuales) => ({
                            ...actuales,
                            [espacio.id]: valor.replace(/\D/g, ""),
                          }))
                        }
                        keyboardType="numeric"
                        placeholder="Ingresar precio"
                        editable={guardandoId === null}
                        selectTextOnFocus
                      />
                    </View>

                    <Pressable
                      style={[
                        styles.botonGuardar,
                        guardando && styles.botonDeshabilitado,
                      ]}
                      onPress={() => guardarPrecio(espacio)}
                      disabled={guardandoId !== null}
                    >
                      {guardando ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons
                            name="save-outline"
                            size={18}
                            color="#FFFFFF"
                          />

                          <Text style={styles.textoBotonGuardar}>
                            Guardar
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>

                  <Text style={styles.textoAyuda}>
                    Precio actual: $
                    {espacio.precioPorHora.toLocaleString("es-AR")}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  contenido: {
    padding: 16,
    paddingBottom: 35,
    gap: 14,
  },

  encabezado: {
    gap: 6,
    marginBottom: 5,
  },

  titulo: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#212121",
  },

  descripcion: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },

  estadoCarga: {
    flex: 1,
    minHeight: 250,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  textoSecundario: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
  },

  tituloError: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333333",
    textAlign: "center",
  },

  botonReintentar: {
    backgroundColor: "#1565C0",
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 9,
    marginTop: 5,
  },

  textoBotonReintentar: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    padding: 16,
    gap: 12,
    elevation: 1,
  },

  cabeceraTarjeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  iconoTarjeta: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },

  datosEspacio: {
    flex: 1,
    gap: 4,
  },

  nombreEspacio: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#212121",
  },

  complejo: {
    fontSize: 12,
    color: "#757575",
  },

  separador: {
    height: 1,
    backgroundColor: "#EEEEEE",
  },

  etiqueta: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333333",
  },

  filaPrecio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  campoPrecio: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 9,
    paddingHorizontal: 12,
  },

  simboloPesos: {
    fontSize: 16,
    color: "#555555",
    fontWeight: "bold",
    marginRight: 6,
  },

  inputPrecio: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 11,
    fontSize: 15,
    color: "#212121",
  },

  botonGuardar: {
    minWidth: 105,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#2E7D32",
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 9,
  },

  botonDeshabilitado: {
    opacity: 0.6,
  },

  textoBotonGuardar: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },

  textoAyuda: {
    fontSize: 12,
    color: "#757575",
  },

  mensajeAcceso: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
    gap: 12,
  },
});