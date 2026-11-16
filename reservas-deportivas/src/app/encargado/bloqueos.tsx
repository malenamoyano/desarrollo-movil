import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { Espacio } from "../../tipos/types";
import type { Bloqueo } from "../../tipos/api";

import { obtenerEspacios } from "../../servicios/espacios";

import {
  obtenerBloqueos,
  crearBloqueos,
  eliminarBloqueo,
} from "../../servicios/encargado/encargado";

import { useConexion, mostrarAvisoSinConexion } from "../../hooks/useConexion";

// Fecha local en formato AAAA-MM-DD.
function obtenerFechaLocal(): string {
  const hoy = new Date();

  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const comprobacion = new Date(anio, mes - 1, dia, 12);

  return (
    comprobacion.getFullYear() === anio &&
    comprobacion.getMonth() === mes - 1 &&
    comprobacion.getDate() === dia
  );
}

function formatearFecha(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);

  return new Date(anio, mes - 1, dia, 12).toLocaleDateString(
    "es-AR",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

const HORAS_INICIO = Array.from(
  { length: 16 },
  (_, i) => `${String(i + 8).padStart(2, "0")}:00`
);

const HORAS_FIN = Array.from(
  { length: 16 },
  (_, i) => `${String(i + 9).padStart(2, "0")}:00`
);

const MOTIVOS_SUGERIDOS = [
  "Cancha anegada",
  "Lluvia",
  "Mantenimiento",
  "Reparación de superficie",
  "Falla de iluminación",
  "Limpieza",
  "Evento institucional",
];

function crearFechaISO(
  anio: number,
  mes: number,
  dia: number
): string {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function obtenerDiasCalendario(mesVisible: Date): (number | null)[] {
  const anio = mesVisible.getFullYear();
  const mes = mesVisible.getMonth();

  const primerDia = new Date(anio, mes, 1, 12);
  const desplazamiento = (primerDia.getDay() + 6) % 7;
  const cantidadDias = new Date(anio, mes + 1, 0, 12).getDate();

  const dias: (number | null)[] = [
    ...Array.from({ length: desplazamiento }, () => null),
    ...Array.from({ length: cantidadDias }, (_, i) => i + 1),
  ];

  while (dias.length % 7 !== 0) {
    dias.push(null);
  }

  return dias;
}

function esHoraInicioValida(hora: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora);
}

function esHoraFinValida(hora: string): boolean {
  return (
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora) ||
    hora === "24:00"
  );
}

export default function Bloqueos() {
  const { sinConexion } = useConexion();

  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);

  const [fecha, setFecha] = useState(obtenerFechaLocal());
  const [espacioIds, setEspacioIds] = useState<string[]>([]);

  const [todoElDia, setTodoElDia] = useState(true);
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [motivo, setMotivo] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [calendarioVisible, setCalendarioVisible] = useState(false);

  const [mesVisible, setMesVisible] = useState(() => {
    const [anio, mes] = obtenerFechaLocal().split("-").map(Number);
    return new Date(anio, mes - 1, 1, 12);
  });

const [selectorHora, setSelectorHora] = useState<
  "inicio" | "fin" | null
>(null);

  // Cargar espacios y bloqueos cada vez que se abre la pantalla
  // o se cambia la fecha.
  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function cargarDatos() {
        setCargando(true);
        setError(null);

        try {
          const datosEspacios = await obtenerEspacios();

          if (!activo) return;

          setEspacios(datosEspacios.filter((item) => item.activo));

          if (sinConexion) {
            setBloqueos([]);
            return;
          }

          if (!esFechaValida(fecha)) {
            setError("Ingresá una fecha válida con formato AAAA-MM-DD.");
            setBloqueos([]);
            return;
          }

          const datosBloqueos = await obtenerBloqueos({
            desde: fecha,
          });

          if (!activo) return;

          // Mostrar solamente los bloqueos de la fecha seleccionada.
          setBloqueos(
            datosBloqueos.filter((item) => item.fecha === fecha)
          );
        } catch (err) {
          if (!activo) return;

          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los datos."
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
    }, [fecha, sinConexion])
  );

  const todosSeleccionados =
    espacios.length > 0 &&
    espacios.every((espacio) => espacioIds.includes(espacio.id));

  function alternarEspacio(id: string) {
    setEspacioIds((actuales) =>
      actuales.includes(id)
        ? actuales.filter((item) => item !== id)
        : [...actuales, id]
    );
  }

  function alternarTodos() {
    if (todosSeleccionados) {
      setEspacioIds([]);
    } else {
      setEspacioIds(espacios.map((item) => item.id));
    }
  }

  function abrirCalendario() {
  const [anio, mes] = fecha.split("-").map(Number);

  setMesVisible(new Date(anio, mes - 1, 1, 12));
  setCalendarioVisible(true);
}

function cambiarMes(cantidad: number) {
  setMesVisible((actual) =>
    new Date(
      actual.getFullYear(),
      actual.getMonth() + cantidad,
      1,
      12
    )
  );
}

function seleccionarDia(dia: number) {
  setFecha(
    crearFechaISO(
      mesVisible.getFullYear(),
      mesVisible.getMonth(),
      dia
    )
  );

  setCalendarioVisible(false);
}

function seleccionarHora(hora: string) {
  if (selectorHora === "inicio") {
    setInicio(hora);

    if (fin && fin <= hora) {
      setFin("");
    }
  } else if (selectorHora === "fin") {
    setFin(hora);
  }

  setSelectorHora(null);
}

  function validarFormulario(): boolean {
    if (sinConexion) {
      mostrarAvisoSinConexion();
      return false;
    }

    if (!esFechaValida(fecha)) {
      Alert.alert(
        "Fecha inválida",
        "Ingresá la fecha en formato AAAA-MM-DD."
      );
      return false;
    }

    if (espacioIds.length === 0) {
      Alert.alert(
        "Falta seleccionar una cancha",
        "Seleccioná al menos un espacio deportivo."
      );
      return false;
    }

    if (!motivo.trim()) {
      Alert.alert(
        "Falta el motivo",
        "Escribí el motivo del bloqueo."
      );
      return false;
    }

    if (!todoElDia) {
      if (
        !esHoraInicioValida(inicio) ||
        !esHoraFinValida(fin)
      ) {
        Alert.alert(
          "Horario inválido",
          "Ingresá las horas en formato HH:MM. La hora de finalización puede ser 24:00."
        );
        return false;
      }

      if (fin <= inicio) {
        Alert.alert(
          "Horario incorrecto",
          "La hora de finalización debe ser posterior a la hora de inicio."
        );
        return false;
      }
    }

    return true;
  }

  function confirmarCreacion() {
    if (guardando || !validarFormulario()) return;

    const detalleHorario = todoElDia
      ? "Todo el día"
      : `Desde las ${inicio} hasta las ${fin}`;

    Alert.alert(
      "Confirmar bloqueo",
      `Se bloquearán ${espacioIds.length} espacio(s) el ${formatearFecha(fecha)}.\n\nHorario: ${detalleHorario}.\n\nMotivo: ${motivo.trim()}.\n\nLas reservas confirmadas afectadas serán canceladas y se notificará a los jugadores.`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Confirmar bloqueo",
          style: "destructive",
          onPress: () => {
            void guardarBloqueo();
          },
        },
      ]
    );
  }

  async function guardarBloqueo() {
    if (guardando) return;

    setGuardando(true);

    try {
      const nuevosBloqueos = await crearBloqueos({
        espacioIds,
        fecha,
        ...(todoElDia ? {} : { inicio, fin }),
        motivo: motivo.trim(),
      });

      setBloqueos((actuales) =>
        [...actuales, ...nuevosBloqueos]
      );

      setMotivo("");
      setInicio("");
      setFin("");

      Alert.alert(
        "Bloqueo registrado",
        `Se registraron ${nuevosBloqueos.length} bloqueo(s) correctamente.`
      );
    } catch (err) {
      Alert.alert(
        "No se pudo crear el bloqueo",
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setGuardando(false);
    }
  }

  function confirmarEliminacion(bloqueo: Bloqueo) {
    if (sinConexion) {
      mostrarAvisoSinConexion();
      return;
    }

    Alert.alert(
      "Quitar bloqueo",
      "¿Querés eliminar este bloqueo? Las reservas que fueron canceladas al crearlo no se recuperarán automáticamente.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar bloqueo",
          style: "destructive",
          onPress: () => {
            void quitarBloqueo(bloqueo.id);
          },
        },
      ]
    );
  }

  async function quitarBloqueo(id: string) {
    if (eliminandoId !== null) return;

    setEliminandoId(id);

    try {
      await eliminarBloqueo(id);

      setBloqueos((actuales) =>
        actuales.filter((item) => item.id !== id)
      );

      Alert.alert(
        "Bloqueo eliminado",
        "El bloqueo se quitó correctamente. Las reservas canceladas no se restauran automáticamente."
      );
    } catch (err) {
      Alert.alert(
        "No se pudo eliminar",
        err instanceof Error
          ? err.message
          : "Ocurrió un error al quitar el bloqueo."
      );
    } finally {
      setEliminandoId(null);
    }
  }

  const espaciosPorId = new Map(
    espacios.map((espacio) => [espacio.id, espacio])
  );

  const bloqueosOrdenados = [...bloqueos].sort((a, b) =>
    (a.inicio ?? "").localeCompare(b.inicio ?? "")
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Gestionar bloqueos",
          headerBackTitle: "Volver",
          headerTitleAlign: "center",
        }}
      />

      {/* Calendario */}
        <Modal
        visible={calendarioVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarioVisible(false)}
        >
        <View style={styles.modalFondo}>
            <View style={styles.modalTarjeta}>
            <Text style={styles.tituloModal}>
                Seleccionar fecha
            </Text>

            <View style={styles.navegacionMes}>
                <Pressable onPress={() => cambiarMes(-1)}>
                <Ionicons
                    name="chevron-back"
                    size={25}
                    color="#1565C0"
                />
                </Pressable>

                <Text style={styles.textoMes}>
                {mesVisible.toLocaleDateString("es-AR", {
                    month: "long",
                    year: "numeric",
                })}
                </Text>

                <Pressable onPress={() => cambiarMes(1)}>
                <Ionicons
                    name="chevron-forward"
                    size={25}
                    color="#1565C0"
                />
                </Pressable>
            </View>

            <View style={styles.grillaCalendario}>
                {DIAS_SEMANA.map((dia, indice) => (
                <Text
                    key={`${dia}-${indice}`}
                    style={styles.diaSemana}
                >
                    {dia}
                </Text>
                ))}
            </View>

            <View style={styles.grillaCalendario}>
                {obtenerDiasCalendario(mesVisible).map((dia, indice) => {
                const fechaDia =
                    dia === null
                    ? ""
                    : crearFechaISO(
                        mesVisible.getFullYear(),
                        mesVisible.getMonth(),
                        dia
                        );

                const seleccionado = fechaDia === fecha;
                const esHoy = fechaDia === obtenerFechaLocal();

                return (
                    <Pressable
                    key={indice}
                    style={[
                        styles.celdaDia,
                        dia === null && styles.celdaDiaVacia,
                        seleccionado && styles.celdaDiaSeleccionado,
                        esHoy && !seleccionado && styles.celdaDiaHoy,
                    ]}
                    disabled={dia === null}
                    onPress={() => dia !== null && seleccionarDia(dia)}
                    >
                    <Text
                        style={[
                        styles.textoDia,
                        seleccionado && styles.textoDiaSeleccionado,
                        ]}
                    >
                        {dia ?? ""}
                    </Text>
                    </Pressable>
                );
                })}
            </View>

            <View style={styles.botonesModal}>
                <Pressable
                onPress={() => setCalendarioVisible(false)}
                >
                <Text style={styles.textoCancelarModal}>
                    Cancelar
                </Text>
                </Pressable>

                <Pressable
                onPress={() => {
                    const hoy = obtenerFechaLocal();
                    const [anio, mes] = hoy.split("-").map(Number);

                    setFecha(hoy);
                    setMesVisible(new Date(anio, mes - 1, 1, 12));
                    setCalendarioVisible(false);
                }}
                >
                <Text style={styles.textoHoyModal}>Hoy</Text>
                </Pressable>
            </View>
            </View>
        </View>
        </Modal>

        {/* Selector de horarios */}
        <Modal
        visible={selectorHora !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectorHora(null)}
        >
        <View style={styles.modalFondo}>
            <View style={styles.modalTarjeta}>
            <Text style={styles.tituloModal}>
                {selectorHora === "inicio"
                ? "Seleccionar hora de inicio"
                : "Seleccionar hora de finalización"}
            </Text>

            <ScrollView style={styles.listaHoras}>
                {(selectorHora === "inicio"
                ? HORAS_INICIO
                : HORAS_FIN.filter((hora) => hora > inicio)
                ).map((hora) => {
                const seleccionada =
                    hora === (selectorHora === "inicio" ? inicio : fin);

                return (
                    <Pressable
                    key={hora}
                    style={[
                        styles.opcionHora,
                        seleccionada && styles.opcionHoraActiva,
                    ]}
                    onPress={() => seleccionarHora(hora)}
                    >
                    <Text
                        style={[
                        styles.textoOpcionHora,
                        seleccionada && styles.textoOpcionHoraActivo,
                        ]}
                    >
                        {hora}
                    </Text>

                    {seleccionada && (
                        <Ionicons
                        name="checkmark-circle"
                        size={21}
                        color="#1565C0"
                        />
                    )}
                    </Pressable>
                );
                })}
            </ScrollView>

            <Pressable
                style={styles.cerrarModal}
                onPress={() => setSelectorHora(null)}
            >
                <Text style={styles.textoCancelarModal}>
                Cancelar
                </Text>
            </Pressable>
            </View>
        </View>
        </Modal>

      <ScrollView
        style={styles.contenedor}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        {sinConexion && (
          <View style={styles.avisoSinConexion}>
            <Ionicons
              name="cloud-offline-outline"
              size={22}
              color="#E65100"
            />

            <View style={styles.contenidoAviso}>
              <Text style={styles.tituloAviso}>
                Modo sin conexión
              </Text>
              <Text style={styles.textoAviso}>
                Para consultar, crear o eliminar bloqueos necesitás
                conexión a Internet.
              </Text>
            </View>
          </View>
        )}

        {/* Fecha */}
        <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>
            Fecha del bloqueo
        </Text>

        <Pressable
            style={styles.filaFecha}
            onPress={abrirCalendario}
            disabled={guardando}
        >
            <Ionicons
            name="calendar-outline"
            size={23}
            color="#1565C0"
            />

            <View style={styles.datosFecha}>
            <Text style={styles.fechaSeleccionada}>
                {formatearFecha(fecha)}
            </Text>

            <Text style={styles.fechaISO}>
                {fecha}
            </Text>
            </View>

            <Ionicons
            name="chevron-down"
            size={21}
            color="#757575"
            />
        </Pressable>
        </View>

        {/* Selección de espacios */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>
            Espacios deportivos
          </Text>

          <Pressable
            style={[
              styles.opcionEspacio,
              todosSeleccionados && styles.opcionEspacioActiva,
            ]}
            onPress={alternarTodos}
            disabled={guardando || espacios.length === 0}
          >
            <Ionicons
              name={
                todosSeleccionados
                  ? "checkbox"
                  : "square-outline"
              }
              size={22}
              color={todosSeleccionados ? "#FFFFFF" : "#1565C0"}
            />

            <Text
              style={[
                styles.textoEspacio,
                todosSeleccionados && styles.textoEspacioActivo,
              ]}
            >
              Seleccionar todos los espacios
            </Text>
          </Pressable>

          {espacios.map((espacio) => {
            const seleccionado = espacioIds.includes(espacio.id);

            return (
              <Pressable
                key={espacio.id}
                style={[
                  styles.opcionEspacio,
                  seleccionado && styles.opcionEspacioActiva,
                ]}
                onPress={() => alternarEspacio(espacio.id)}
                disabled={guardando}
              >
                <Ionicons
                  name={
                    seleccionado
                      ? "checkbox"
                      : "square-outline"
                  }
                  size={22}
                  color={seleccionado ? "#FFFFFF" : "#1565C0"}
                />

                <View style={styles.datosEspacio}>
                  <Text
                    style={[
                      styles.textoEspacio,
                      seleccionado && styles.textoEspacioActivo,
                    ]}
                  >
                    {espacio.nombre}
                  </Text>

                  <Text
                    style={[
                      styles.complejoEspacio,
                      seleccionado && styles.complejoEspacioActivo,
                    ]}
                  >
                    {espacio.complejo}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          <Text style={styles.textoAyuda}>
            Espacios seleccionados: {espacioIds.length}
          </Text>
        </View>

        {/* Tipo de bloqueo */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>
            Duración del bloqueo
          </Text>

          <View style={styles.filaOpciones}>
            <Pressable
              style={[
                styles.botonTipo,
                todoElDia && styles.botonTipoActivo,
              ]}
              onPress={() => setTodoElDia(true)}
              disabled={guardando}
            >
              <Ionicons
                name="sunny-outline"
                size={19}
                color={todoElDia ? "#FFFFFF" : "#1565C0"}
              />
              <Text
                style={[
                  styles.textoTipo,
                  todoElDia && styles.textoTipoActivo,
                ]}
              >
                Todo el día
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.botonTipo,
                !todoElDia && styles.botonTipoActivo,
              ]}
              onPress={() => setTodoElDia(false)}
              disabled={guardando}
            >
              <Ionicons
                name="time-outline"
                size={19}
                color={!todoElDia ? "#FFFFFF" : "#1565C0"}
              />
              <Text
                style={[
                  styles.textoTipo,
                  !todoElDia && styles.textoTipoActivo,
                ]}
              >
                Por horario
              </Text>
            </Pressable>
          </View>

        {!todoElDia && (
            <>
            <View style={styles.filaHorarios}>
            <View style={styles.campoHorario}>
                <Text style={styles.etiqueta}>Desde</Text>

                <Pressable
                style={styles.selectorHora}
                onPress={() => setSelectorHora("inicio")}
                disabled={guardando}
                >
                <Text style={styles.textoHora}>
                    {inicio || "Seleccionar"}
                </Text>

                <Ionicons
                    name="chevron-down"
                    size={18}
                    color="#1565C0"
                />
                </Pressable>
            </View>

            <View style={styles.campoHorario}>
                <Text style={styles.etiqueta}>Hasta</Text>

                <Pressable
                style={[
                    styles.selectorHora,
                    !inicio && styles.selectorDeshabilitado,
                ]}
                onPress={() => setSelectorHora("fin")}
                disabled={!inicio || guardando}
                >
                <Text style={styles.textoHora}>
                    {fin || "Seleccionar"}
                </Text>

                <Ionicons
                    name="chevron-down"
                    size={18}
                    color={!inicio ? "#9E9E9E" : "#1565C0"}
                />
                </Pressable>
            </View>
            </View>

            <Text style={styles.textoAyuda}>
            Elegí primero el horario de inicio y después el de finalización.
            </Text>
        </>
        )}

          {todoElDia && (
            <Text style={styles.textoAyuda}>
              Se bloquearán todos los turnos de los espacios
              seleccionados durante esa fecha.
            </Text>
          )}
        </View>

        {/* Motivo */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>
            Motivo del bloqueo
          </Text>

          <Text style={styles.textoAyuda}>
            Seleccioná un motivo frecuente o escribí uno personalizado.
          </Text>

        <View style={styles.motivosSugeridos}>
        {MOTIVOS_SUGERIDOS.map((sugerencia) => {
            const seleccionado = motivo === sugerencia;

            return (
            <Pressable
                key={sugerencia}
                style={[
                styles.chipMotivo,
                seleccionado && styles.chipMotivoActivo,
                ]}
                onPress={() => setMotivo(sugerencia)}
                disabled={guardando}
            >
                <Text
                style={[
                    styles.textoChipMotivo,
                    seleccionado && styles.textoChipMotivoActivo,
                ]}
                >
                {sugerencia}
                </Text>
            </Pressable>
            );
        })}
        </View>

          <TextInput
            style={styles.inputMotivo}
            value={motivo}
            onChangeText={setMotivo}
            placeholder="Ej: Cancha anegada, mantenimiento de iluminación..."
            multiline
            maxLength={200}
            textAlignVertical="top"
            editable={!guardando}
          />

          <Text style={styles.textoAyuda}>
            El motivo será visible para identificar por qué se
            bloqueó el espacio.
          </Text>
        </View>

        {/* Crear */}
        <Pressable
          style={[
            styles.botonCrear,
            (guardando || sinConexion) && styles.botonDeshabilitado,
          ]}
          onPress={confirmarCreacion}
          disabled={guardando || sinConexion}
        >
          {guardando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="lock-closed-outline"
                size={21}
                color="#FFFFFF"
              />
              <Text style={styles.textoBotonCrear}>
                Crear bloqueo
              </Text>
            </>
          )}
        </Pressable>

        {/* Historial */}
        <View style={styles.seccionHistorial}>
          <Text style={styles.tituloSeccion}>
            Bloqueos del día
          </Text>

          {cargando ? (
            <ActivityIndicator
              size="large"
              color="#1565C0"
            />
          ) : error ? (
            <View style={styles.error}>
              <Ionicons
                name="alert-circle-outline"
                size={25}
                color="#C62828"
              />
              <Text style={styles.textoError}>{error}</Text>
            </View>
          ) : sinConexion ? (
            <Text style={styles.textoVacio}>
              El historial requiere conexión a Internet.
            </Text>
          ) : bloqueosOrdenados.length === 0 ? (
            <View style={styles.vacio}>
              <Ionicons
                name="checkmark-circle-outline"
                size={42}
                color="#9E9E9E"
              />
              <Text style={styles.textoVacio}>
                No hay bloqueos para esta fecha.
              </Text>
            </View>
          ) : (
            bloqueosOrdenados.map((bloqueo) => {
              const espacio = espaciosPorId.get(bloqueo.espacioId);
              const eliminando = eliminandoId === bloqueo.id;

              return (
                <View
                  key={bloqueo.id}
                  style={styles.tarjetaBloqueo}
                >
                  <View style={styles.cabeceraBloqueo}>
                    <View style={styles.iconoBloqueo}>
                      <Ionicons
                        name="lock-closed"
                        size={21}
                        color="#757575"
                      />
                    </View>

                    <View style={styles.datosBloqueo}>
                      <Text style={styles.nombreBloqueo}>
                        {espacio?.nombre ?? bloqueo.espacioId}
                      </Text>

                      <Text style={styles.fechaBloqueo}>
                        {bloqueo.inicio && bloqueo.fin
                          ? `${bloqueo.inicio} – ${bloqueo.fin}`
                          : "Día completo"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.motivoBloqueo}>
                    <Text style={styles.etiquetaMotivo}>
                      Motivo
                    </Text>
                    <Text style={styles.textoMotivo}>
                      {bloqueo.motivo}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.botonEliminar}
                    onPress={() => confirmarEliminacion(bloqueo)}
                    disabled={eliminandoId !== null}
                  >
                    {eliminando ? (
                      <ActivityIndicator
                        color="#C62828"
                        size="small"
                      />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#C62828"
                      />
                    )}

                    <Text style={styles.textoEliminar}>
                      {eliminando ? "Eliminando..." : "Quitar bloqueo"}
                    </Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
    paddingBottom: 40,
    gap: 18,
  },

  seccion: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },

  tituloSeccion: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#212121",
  },

  avisoSinConexion: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },

  contenidoAviso: {
    flex: 1,
    gap: 4,
  },

  tituloAviso: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#E65100",
  },

  textoAviso: {
    fontSize: 13,
    color: "#795548",
    lineHeight: 19,
  },

  filaFecha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  inputFecha: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: "#212121",
    fontSize: 16,
  },

  textoAyuda: {
    fontSize: 12,
    color: "#757575",
    lineHeight: 18,
  },

  opcionEspacio: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },

  opcionEspacioActiva: {
    backgroundColor: "#1565C0",
    borderColor: "#1565C0",
  },

  datosEspacio: {
    flex: 1,
    gap: 3,
  },

  textoEspacio: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
    flex: 1,
  },

  textoEspacioActivo: {
    color: "#FFFFFF",
  },

  complejoEspacio: {
    fontSize: 12,
    color: "#757575",
  },

  complejoEspacioActivo: {
    color: "#E3F2FD",
  },

  filaOpciones: {
    flexDirection: "row",
    gap: 10,
  },

  botonTipo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#1565C0",
    backgroundColor: "#FFFFFF",
  },

  botonTipoActivo: {
    backgroundColor: "#1565C0",
  },

  textoTipo: {
    color: "#1565C0",
    fontWeight: "600",
    fontSize: 13,
  },

  textoTipoActivo: {
    color: "#FFFFFF",
  },

  filaHorarios: {
    flexDirection: "row",
    gap: 12,
  },

  campoHorario: {
    flex: 1,
    gap: 6,
  },

  etiqueta: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555555",
  },

  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 12,
    color: "#212121",
    fontSize: 16,
  },

  inputMotivo: {
    minHeight: 95,
    backgroundColor: "#F5F5F5",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 12,
    color: "#212121",
    fontSize: 14,
  },

  botonCrear: {
    backgroundColor: "#1565C0",
    paddingVertical: 15,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },

  botonDeshabilitado: {
    opacity: 0.5,
  },

  textoBotonCrear: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },

  seccionHistorial: {
    gap: 13,
    marginTop: 4,
  },

  tarjetaBloqueo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    gap: 13,
    elevation: 1,
  },

  cabeceraBloqueo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconoBloqueo: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
  },

  datosBloqueo: {
    flex: 1,
    gap: 4,
  },

  nombreBloqueo: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#212121",
  },

  fechaBloqueo: {
    fontSize: 13,
    color: "#757575",
  },

  motivoBloqueo: {
    backgroundColor: "#F5F5F5",
    borderRadius: 9,
    padding: 11,
    gap: 4,
  },

  etiquetaMotivo: {
    fontSize: 12,
    color: "#757575",
    fontWeight: "600",
  },

  textoMotivo: {
    fontSize: 14,
    color: "#333333",
  },

  botonEliminar: {
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },

  textoEliminar: {
    color: "#C62828",
    fontSize: 14,
    fontWeight: "600",
  },

  vacio: {
    alignItems: "center",
    padding: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    gap: 8,
  },

  textoVacio: {
    fontSize: 13,
    color: "#757575",
    textAlign: "center",
  },

  error: {
    backgroundColor: "#FFEBEE",
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  textoError: {
    flex: 1,
    color: "#C62828",
    fontSize: 13,
  },

  datosFecha: {
  flex: 1,
  gap: 3,
},

fechaSeleccionada: {
  color: "#212121",
  fontSize: 15,
  fontWeight: "600",
  textTransform: "capitalize",
},

fechaISO: {
  color: "#757575",
  fontSize: 12,
},

modalFondo: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.45)",
  justifyContent: "center",
  alignItems: "center",
  padding: 22,
},

modalTarjeta: {
  width: "100%",
  maxWidth: 380,
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 20,
  gap: 18,
  elevation: 5,
},

tituloModal: {
  fontSize: 18,
  fontWeight: "bold",
  color: "#212121",
  textAlign: "center",
},

navegacionMes: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

textoMes: {
  fontSize: 16,
  fontWeight: "bold",
  color: "#212121",
  textTransform: "capitalize",
},

grillaCalendario: {
  flexDirection: "row",
  flexWrap: "wrap",
},

diaSemana: {
  width: "14.2857%",
  textAlign: "center",
  color: "#757575",
  fontWeight: "bold",
  paddingVertical: 8,
},

celdaDia: {
  width: "14.2857%",
  height: 42,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 22,
},

celdaDiaVacia: {
  backgroundColor: "transparent",
},

celdaDiaSeleccionado: {
  backgroundColor: "#1565C0",
},

celdaDiaHoy: {
  borderWidth: 1,
  borderColor: "#1565C0",
},

textoDia: {
  color: "#212121",
  fontSize: 14,
},

textoDiaSeleccionado: {
  color: "#FFFFFF",
  fontWeight: "bold",
},

botonesModal: {
  flexDirection: "row",
  justifyContent: "space-between",
  borderTopWidth: 1,
  borderTopColor: "#EEEEEE",
  paddingTop: 14,
},

textoCancelarModal: {
  color: "#757575",
  fontSize: 15,
  fontWeight: "600",
},

textoHoyModal: {
  color: "#1565C0",
  fontSize: 15,
  fontWeight: "bold",
},

selectorHora: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#F5F5F5",
  borderRadius: 9,
  borderWidth: 1,
  borderColor: "#E0E0E0",
  padding: 12,
},

selectorDeshabilitado: {
  opacity: 0.5,
},

textoHora: {
  color: "#212121",
  fontSize: 15,
  fontWeight: "600",
},

listaHoras: {
  maxHeight: 320,
},

opcionHora: {
  paddingVertical: 13,
  paddingHorizontal: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#EEEEEE",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

opcionHoraActiva: {
  backgroundColor: "#E3F2FD",
  borderRadius: 8,
},

textoOpcionHora: {
  color: "#212121",
  fontSize: 16,
},

textoOpcionHoraActivo: {
  color: "#1565C0",
  fontWeight: "bold",
},

cerrarModal: {
  alignItems: "center",
  paddingTop: 8,
},

motivosSugeridos: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
},

chipMotivo: {
  borderRadius: 20,
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: "#1565C0",
  backgroundColor: "#FFFFFF",
},

chipMotivoActivo: {
  backgroundColor: "#1565C0",
},

textoChipMotivo: {
  color: "#1565C0",
  fontSize: 12,
  fontWeight: "600",
},

textoChipMotivoActivo: {
  color: "#FFFFFF",
},
});