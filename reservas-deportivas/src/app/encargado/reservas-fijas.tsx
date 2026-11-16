
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
import { useAuth } from "../../contextos/AuthContext";

import type { Espacio, ReservaFija } from "../../tipos/types";

import { obtenerEspacios } from "../../servicios/espacios";

import {
  obtenerReservasFijas,
  crearReservaFija,
  editarReservaFija,
  eliminarReservaFija,
} from "../../servicios/encargado/encargado";

const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const DIAS_CALENDARIO = ["L", "M", "X", "J", "V", "S", "D"];

const HORAS_INICIO = Array.from(
  { length: 16 },
  (_, i) => `${String(i + 8).padStart(2, "0")}:00`
);

const HORAS_FIN = Array.from(
  { length: 16 },
  (_, i) => `${String(i + 9).padStart(2, "0")}:00`
);

type CampoFecha = "desde" | "hasta";

function obtenerFechaActual(): string {
  const fecha = new Date();

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function esFechaValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia, 12);

  return (
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia
  );
}

function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);

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

function obtenerNombreDia(dia: number): string {
  const nombre = DIAS_SEMANA[dia];
  return nombre.endsWith("s") ? nombre : `${nombre}s`;
}

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

export default function ReservasFijas() {
  const { usuario } = useAuth();
  const esAdministrador = usuario?.rol === "administrador";

  const [reservas, setReservas] = useState<ReservaFija[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intentoCarga, setIntentoCarga] = useState(0);

  const [filtroEstado, setFiltroEstado] = useState<
    "activas" | "inactivas"
    >("activas");

  const [formularioVisible, setFormularioVisible] = useState(false);
  const [reservaEditando, setReservaEditando] =
    useState<ReservaFija | null>(null);

  const [espacioId, setEspacioId] = useState("");
  const [titular, setTitular] = useState("");
  const [dia, setDia] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(1);
  const [inicio, setInicio] = useState("18:00");
  const [fin, setFin] = useState("19:00");
  const [desde, setDesde] = useState(obtenerFechaActual());
  const [hasta, setHasta] = useState("");

  const [guardando, setGuardando] = useState(false);

  // Estados de los calendarios y selectores de horarios.
  const [calendarioVisible, setCalendarioVisible] = useState(false);
  const [campoFecha, setCampoFecha] = useState<CampoFecha | null>(null);

  const [mesVisible, setMesVisible] = useState(() => {
    const [anio, mes] = obtenerFechaActual().split("-").map(Number);
    return new Date(anio, mes - 1, 1, 12);
  });

  const [selectorHora, setSelectorHora] = useState<
    "inicio" | "fin" | null
  >(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function cargarDatos() {
        setCargando(true);
        setError(null);

        try {
          const [datosReservas, datosEspacios] = await Promise.all([
            obtenerReservasFijas(),
            obtenerEspacios(),
          ]);

          if (!activo) return;

          setReservas(datosReservas);
          setEspacios(datosEspacios);
        } catch (err) {
          if (!activo) return;

          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar las reservas fijas."
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
    }, [intentoCarga])
  );

  const espaciosPorId = new Map(
    espacios.map((espacio) => [espacio.id, espacio])
  );

const reservasActivas = reservas.filter(
  (reserva) => reserva.activa
);

const reservasInactivas = reservas.filter(
  (reserva) => !reserva.activa
);

const reservasFiltradas =
  filtroEstado === "activas"
    ? reservasActivas
    : reservasInactivas;

  function limpiarFormulario() {
    setReservaEditando(null);
    setEspacioId("");
    setTitular("");
    setDia(1);
    setInicio("18:00");
    setFin("19:00");
    setDesde(obtenerFechaActual());
    setHasta("");
  }

  function abrirNuevaReserva() {
    limpiarFormulario();
    setFormularioVisible(true);
  }

  function abrirEdicion(reserva: ReservaFija) {
    setReservaEditando(reserva);
    setEspacioId(reserva.espacioId);
    setTitular(reserva.titular);
    setDia(reserva.dia);
    setInicio(reserva.inicio);
    setFin(reserva.fin);
    setDesde(reserva.desde);
    setHasta(reserva.hasta ?? "");
    setFormularioVisible(true);
  }

  function abrirCalendario(campo: CampoFecha) {
    const valor = campo === "desde" ? desde : hasta;
    const fechaBase = valor || obtenerFechaActual();
    const [anio, mes] = fechaBase.split("-").map(Number);

    setCampoFecha(campo);
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

  function seleccionarDiaCalendario(diaSeleccionado: number) {
    const fechaSeleccionada = crearFechaISO(
      mesVisible.getFullYear(),
      mesVisible.getMonth(),
      diaSeleccionado
    );

    if (campoFecha === "desde") {
      setDesde(fechaSeleccionada);
    } else if (campoFecha === "hasta") {
      setHasta(fechaSeleccionada);
    }

    setCalendarioVisible(false);
    setCampoFecha(null);
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

  async function guardarReserva() {
    if (!esAdministrador) return;

    if (!espacioId || !titular.trim() || !desde || !inicio || !fin) {
      Alert.alert(
        "Datos incompletos",
        "Completá todos los campos obligatorios."
      );
      return;
    }

    if (!esFechaValida(desde)) {
      Alert.alert(
        "Fecha inválida",
        "Seleccioná una fecha inicial válida."
      );
      return;
    }

    if (hasta && !esFechaValida(hasta)) {
      Alert.alert(
        "Fecha inválida",
        "Seleccioná una fecha final válida."
      );
      return;
    }

    if (hasta && hasta < desde) {
      Alert.alert(
        "Rango inválido",
        "La fecha final no puede ser anterior a la fecha inicial."
      );
      return;
    }

    if (
      !esHoraInicioValida(inicio) ||
      !esHoraFinValida(fin) ||
      fin <= inicio
    ) {
      Alert.alert(
        "Horario inválido",
        "La hora de finalización debe ser posterior a la de inicio."
      );
      return;
    }

    try {
      setGuardando(true);

      const datos = {
        espacioId,
        titular: titular.trim(),
        dia,
        inicio,
        fin,
        desde,
        hasta: hasta || null,
      };

      if (reservaEditando) {
        // La API no permite modificar el espacioId mediante PATCH.
        await editarReservaFija(reservaEditando.id, {
            titular: datos.titular,
            dia: datos.dia,
            inicio: datos.inicio,
            fin: datos.fin,
            desde: datos.desde,
            hasta: datos.hasta,
        });

        const actualizadas = await obtenerReservasFijas();
        setReservas(actualizadas);

        } else {
        const nuevaReserva = await crearReservaFija(datos);

        setReservas((actuales) => [
            nuevaReserva,
            ...actuales.filter((reserva) => reserva.id !== nuevaReserva.id),
        ]);

        setFiltroEstado("activas");
        }

      setFormularioVisible(false);
      limpiarFormulario();

      Alert.alert(
        "Operación exitosa",
        reservaEditando
          ? "La reserva fija fue actualizada."
          : "La reserva fija fue creada."
      );
    } catch (err) {
      Alert.alert(
        "No se pudo guardar",
        err instanceof Error
          ? err.message
          : "Ocurrió un error al guardar la reserva fija."
      );
    } finally {
      setGuardando(false);
    }
  }

  function confirmarBaja(reserva: ReservaFija) {
    if (!esAdministrador) return;

    Alert.alert(
      "Dar de baja reserva fija",
      `¿Querés dar de baja la reserva de ${reserva.titular}?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Dar de baja",
          style: "destructive",
          onPress: async () => {
            try {
              await eliminarReservaFija(reserva.id);

              const actualizadas = await obtenerReservasFijas();
              setReservas(actualizadas);

              Alert.alert(
                "Operación exitosa",
                "La reserva fija fue dada de baja."
              );
            } catch (err) {
              Alert.alert(
                "No se pudo dar de baja",
                err instanceof Error
                  ? err.message
                  : "Ocurrió un error al realizar la operación."
              );
            }
          },
        },
      ]
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Reservas fijas",
          headerBackTitle: "Volver",
          headerTitleAlign: "center",
        }}
      />

      {/* Calendario para seleccionar fechas */}
      <Modal
        visible={calendarioVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCalendarioVisible(false);
          setCampoFecha(null);
        }}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalTarjeta}>
            <Text style={styles.tituloModal}>
              {campoFecha === "desde"
                ? "Fecha de inicio"
                : "Fecha de finalización"}
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
              {DIAS_CALENDARIO.map((nombre, indice) => (
                <Text
                  key={`${nombre}-${indice}`}
                  style={styles.diaSemana}
                >
                  {nombre}
                </Text>
              ))}
            </View>

            <View style={styles.grillaCalendario}>
              {obtenerDiasCalendario(mesVisible).map((diaCalendario, indice) => {
                const fechaDia =
                  diaCalendario === null
                    ? ""
                    : crearFechaISO(
                        mesVisible.getFullYear(),
                        mesVisible.getMonth(),
                        diaCalendario
                      );

                const fechaSeleccionada =
                  campoFecha === "desde" ? desde : hasta;

                const seleccionado = fechaDia === fechaSeleccionada;
                const esHoy = fechaDia === obtenerFechaActual();

                return (
                  <Pressable
                    key={indice}
                    style={[
                      styles.celdaDia,
                      diaCalendario === null && styles.celdaDiaVacia,
                      seleccionado && styles.celdaDiaSeleccionado,
                      esHoy && !seleccionado && styles.celdaDiaHoy,
                    ]}
                    disabled={diaCalendario === null}
                    onPress={() => {
                      if (diaCalendario !== null) {
                        seleccionarDiaCalendario(diaCalendario);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.textoDia,
                        seleccionado && styles.textoDiaSeleccionado,
                      ]}
                    >
                      {diaCalendario ?? ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.botonesModal}>
              <Pressable
                onPress={() => {
                  setCalendarioVisible(false);
                  setCampoFecha(null);
                }}
              >
                <Text style={styles.textoCancelarModal}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  const hoy = obtenerFechaActual();
                  const [anio, mes] = hoy.split("-").map(Number);

                  if (campoFecha === "desde") {
                    setDesde(hoy);
                  } else if (campoFecha === "hasta") {
                    setHasta(hoy);
                  }

                  setMesVisible(new Date(anio, mes - 1, 1, 12));
                  setCalendarioVisible(false);
                  setCampoFecha(null);
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
              {(
                selectorHora === "inicio"
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

      <View style={styles.contenedor}>
        <View style={styles.encabezado}>
          <Text style={styles.titulo}>
            Reservas recurrentes
          </Text>

          <Text style={styles.descripcion}>
            {esAdministrador
              ? "Consultá y administrá los horarios reservados de forma permanente."
              : "Consultá los horarios reservados de forma permanente para grupos y titulares."}
          </Text>
        </View>

        {cargando ? (
          <View style={styles.cargando}>
            <ActivityIndicator size="large" color="#1565C0" />
            <Text style={styles.textoSecundario}>
              Cargando reservas fijas...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContenedor}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color="#C62828"
            />

            <Text style={styles.tituloError}>
              No se pudieron cargar las reservas
            </Text>

            <Text style={styles.mensajeError}>
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
        ) : (
          <ScrollView
            contentContainerStyle={styles.lista}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.resumen}>
              <View style={styles.iconoResumen}>
                <Ionicons
                  name="repeat-outline"
                  size={25}
                  color="#1565C0"
                />
              </View>

              <View style={styles.datosResumen}>
                <Text style={styles.numeroResumen}>
                  {reservas.filter((r) => r.activa).length}
                </Text>

                <Text style={styles.textoResumen}>
                  Reservas fijas activas
                </Text>
              </View>
            </View>

            {/* Filtros */}
            <View style={styles.filtros}>
              {(["activas", "inactivas"] as const).map((filtro) => (
                <Pressable
                  key={filtro}
                  style={[
                    styles.filtro,
                    filtroEstado === filtro && styles.filtroSeleccionado,
                  ]}
                  onPress={() => setFiltroEstado(filtro)}
                >
                  <Text
                    style={[
                      styles.textoFiltro,
                      filtroEstado === filtro &&
                        styles.textoFiltroSeleccionado,
                    ]}
                  >
                    {filtro === "activas" ? "Activas" : "Inactivas"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {esAdministrador && (
              <Pressable
                style={styles.botonNueva}
                onPress={abrirNuevaReserva}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={21}
                  color="#FFFFFF"
                />

                <Text style={styles.textoBotonNueva}>
                  Nueva reserva fija
                </Text>
              </Pressable>
            )}

            {/* Formulario de creación y edición */}
            {formularioVisible && esAdministrador && (
              <View style={styles.formulario}>
                <View style={styles.cabeceraFormulario}>
                  <Text style={styles.tituloFormulario}>
                    {reservaEditando
                      ? "Editar reserva fija"
                      : "Nueva reserva fija"}
                  </Text>

                  <Pressable
                    onPress={() => {
                      setFormularioVisible(false);
                      limpiarFormulario();
                    }}
                    disabled={guardando}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={27}
                      color="#757575"
                    />
                  </Pressable>
                </View>

                <Text style={styles.etiqueta}>
                  Espacio deportivo *
                </Text>

                {reservaEditando ? (
                  <View style={styles.espacioFijo}>
                    <Ionicons
                      name="business-outline"
                      size={21}
                      color="#1565C0"
                    />

                    <View style={styles.datosEspacioFijo}>
                      <Text style={styles.nombreEspacioFijo}>
                        {espaciosPorId.get(espacioId)?.nombre ?? espacioId}
                      </Text>

                      <Text style={styles.ayudaEspacioFijo}>
                        El espacio no se puede modificar al editar.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.opciones}>
                    {espacios
                      .filter((espacio) => espacio.activo)
                      .map((espacio) => (
                        <Pressable
                          key={espacio.id}
                          style={[
                            styles.opcion,
                            espacioId === espacio.id &&
                              styles.opcionSeleccionada,
                          ]}
                          onPress={() => setEspacioId(espacio.id)}
                        >
                          <Text
                            style={[
                              styles.textoOpcion,
                              espacioId === espacio.id &&
                                styles.textoOpcionSeleccionada,
                            ]}
                          >
                            {espacio.nombre}
                          </Text>
                        </Pressable>
                      ))}
                  </View>
                )}

                <Text style={styles.etiqueta}>
                  Titular o grupo *
                </Text>

                <View style={styles.campoTexto}>
                  <Text style={styles.inputTitular}>
                    {titular || " "}
                  </Text>
                </View>

                {/* Titular editable mediante campo de texto */}
                <View style={styles.inputTitularContenedor}>
                  <Text
                    style={[
                      styles.placeholderTitular,
                      titular.length > 0 && styles.placeholderOculto,
                    ]}
                  >
                    Nombre del titular o grupo
                  </Text>
                  <TextInput
                    style={styles.inputTitularReal}
                    value={titular}
                    onChangeText={setTitular}
                    placeholder="Ej. Grupo de los martes"
                    maxLength={100}
                    editable={!guardando}
                  />
                </View>

                <Text style={styles.etiqueta}>
                  Día de la semana *
                </Text>

                <View style={styles.opciones}>
                  {DIAS_SEMANA.map((nombre, indice) => (
                    <Pressable
                      key={nombre}
                      style={[
                        styles.opcion,
                        dia === indice && styles.opcionSeleccionada,
                      ]}
                      onPress={() =>
                        setDia(indice as 0 | 1 | 2 | 3 | 4 | 5 | 6)
                      }
                      disabled={guardando}
                    >
                      <Text
                        style={[
                          styles.textoOpcion,
                          dia === indice &&
                            styles.textoOpcionSeleccionada,
                        ]}
                      >
                        {nombre}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Horarios */}
                <Text style={styles.etiqueta}>
                  Horario *
                </Text>

                <View style={styles.filaHorarios}>
                  <View style={styles.campoHorario}>
                    <Text style={styles.subEtiqueta}>
                      Desde
                    </Text>

                    <Pressable
                      style={styles.selectorHora}
                      onPress={() => setSelectorHora("inicio")}
                      disabled={guardando}
                    >
                      <Text style={styles.textoHora}>
                        {inicio}
                      </Text>

                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color="#1565C0"
                      />
                    </Pressable>
                  </View>

                  <View style={styles.campoHorario}>
                    <Text style={styles.subEtiqueta}>
                      Hasta
                    </Text>

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
                        color="#1565C0"
                      />
                    </Pressable>
                  </View>
                </View>

                <Text style={styles.textoAyuda}>
                  Elegí primero la hora de inicio y después la de finalización.
                </Text>

                {/* Vigencia */}
                <Text style={styles.etiqueta}>
                  Vigencia de la reserva
                </Text>

                <Text style={styles.subEtiqueta}>
                  Fecha de inicio *
                </Text>

                <Pressable
                  style={styles.selectorFecha}
                  onPress={() => abrirCalendario("desde")}
                  disabled={guardando}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={22}
                    color="#1565C0"
                  />

                  <View style={styles.datosFecha}>
                    <Text style={styles.fechaSeleccionada}>
                      {formatearFecha(desde)}
                    </Text>

                    <Text style={styles.fechaISO}>
                      {desde}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color="#757575"
                  />
                </Pressable>

                <Text style={styles.subEtiqueta}>
                  Fecha de finalización (opcional)
                </Text>

                <View style={styles.filaFechaFinal}>
                  <Pressable
                    style={styles.selectorFecha}
                    onPress={() => abrirCalendario("hasta")}
                    disabled={guardando}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={22}
                      color="#1565C0"
                    />

                    <View style={styles.datosFecha}>
                      <Text style={styles.fechaSeleccionada}>
                        {hasta
                          ? formatearFecha(hasta)
                          : "Sin fecha de finalización"}
                      </Text>

                      <Text style={styles.fechaISO}>
                        {hasta || "Tocá para agregar una fecha"}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color="#757575"
                    />
                  </Pressable>

                  {hasta !== "" && (
                    <Pressable
                      style={styles.botonLimpiarFecha}
                      onPress={() => setHasta("")}
                      disabled={guardando}
                    >
                      <Ionicons
                        name="close-circle"
                        size={23}
                        color="#C62828"
                      />
                    </Pressable>
                  )}
                </View>

                <Pressable
                  style={[
                    styles.botonGuardar,
                    guardando && styles.botonDeshabilitado,
                  ]}
                  onPress={guardarReserva}
                  disabled={guardando}
                >
                  {guardando ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="save-outline"
                        size={19}
                        color="#FFFFFF"
                      />

                      <Text style={styles.textoBotonGuardar}>
                        {reservaEditando
                          ? "Guardar cambios"
                          : "Crear reserva"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {/* Listado */}
            {reservasFiltradas.length === 0 ? (
              <View style={styles.vacio}>
                <Ionicons
                  name="calendar-outline"
                  size={48}
                  color="#9E9E9E"
                />

                <Text style={styles.tituloVacio}>
                {filtroEstado === "activas"
                    ? "No hay reservas activas"
                    : "No hay reservas inactivas"}
                </Text>

                <Text style={styles.textoSecundario}>
                  Todavía no se registraron reservas recurrentes.
                </Text>
              </View>
            ) : (
              reservasFiltradas.map((reserva) => {
                const espacio = espaciosPorId.get(reserva.espacioId);

                return (
                  <View
                    key={reserva.id}
                    style={styles.tarjeta}
                  >
                    <View style={styles.cabeceraTarjeta}>
                      <View style={styles.iconoTarjeta}>
                        <Ionicons
                          name="repeat-outline"
                          size={23}
                          color="#1565C0"
                        />
                      </View>

                      <View style={styles.datosTarjeta}>
                        <Text style={styles.nombreTitular}>
                          {reserva.titular}
                        </Text>

                        <Text style={styles.nombreEspacio}>
                          {espacio?.nombre ?? reserva.espacioId}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.estado,
                          reserva.activa
                            ? styles.estadoActivo
                            : styles.estadoInactivo,
                        ]}
                      >
                        <Text
                          style={[
                            styles.textoEstado,
                            reserva.activa
                              ? styles.textoActivo
                              : styles.textoInactivo,
                          ]}
                        >
                          {reserva.activa ? "Activa" : "Inactiva"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.separador} />

                    <View style={styles.filaInformacion}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#757575"
                      />

                      <Text style={styles.textoInformacion}>
                        Todos los {obtenerNombreDia(reserva.dia)}
                      </Text>
                    </View>

                    <View style={styles.filaInformacion}>
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color="#757575"
                      />

                      <Text style={styles.textoInformacion}>
                        {reserva.inicio} a {reserva.fin}
                      </Text>
                    </View>

                    <View style={styles.filaInformacion}>
                      <Ionicons
                        name="calendar-number-outline"
                        size={18}
                        color="#757575"
                      />

                      <Text style={styles.textoInformacion}>
                        Desde: {formatearFecha(reserva.desde)}
                      </Text>
                    </View>

                    <View style={styles.filaInformacion}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#757575"
                      />

                      <Text style={styles.textoInformacion}>
                        Hasta:{" "}
                        {reserva.hasta
                          ? formatearFecha(reserva.hasta)
                          : "Sin fecha de finalización"}
                      </Text>
                    </View>

                    {esAdministrador && reserva.activa && (
                      <View style={styles.acciones}>
                        <Pressable
                          style={styles.botonEditar}
                          onPress={() => abrirEdicion(reserva)}
                        >
                          <Ionicons
                            name="create-outline"
                            size={18}
                            color="#1565C0"
                          />

                          <Text style={styles.textoBotonEditar}>
                            Editar
                          </Text>
                        </Pressable>

                        <Pressable
                          style={styles.botonBaja}
                          onPress={() => confirmarBaja(reserva)}
                        >
                          <Ionicons
                            name="close-circle-outline"
                            size={18}
                            color="#C62828"
                          />

                          <Text style={styles.textoBotonBaja}>
                            Dar de baja
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
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

  encabezado: {
    padding: 18,
    gap: 6,
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

  lista: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 36,
    gap: 14,
  },

  resumen: {
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  iconoResumen: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },

  datosResumen: {
    flex: 1,
    gap: 3,
  },

  numeroResumen: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#1565C0",
  },

  textoResumen: {
    fontSize: 13,
    color: "#666666",
  },

  filtros: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 2,
  },

  filtro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },

  filtroSeleccionado: {
    backgroundColor: "#E3F2FD",
    borderColor: "#1565C0",
  },

  textoFiltro: {
    fontSize: 13,
    color: "#666666",
    fontWeight: "500",
  },

  textoFiltroSeleccionado: {
    color: "#1565C0",
    fontWeight: "bold",
  },

  botonNueva: {
    backgroundColor: "#1565C0",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    padding: 14,
    borderRadius: 11,
  },

  textoBotonNueva: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },

  formulario: {
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    padding: 16,
    gap: 12,
    elevation: 1,
  },

  cabeceraFormulario: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  tituloFormulario: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212121",
  },

  etiqueta: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333333",
    marginTop: 5,
  },

  subEtiqueta: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 5,
  },

  opciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  opcion: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  opcionSeleccionada: {
    backgroundColor: "#E3F2FD",
    borderColor: "#1565C0",
  },

  textoOpcion: {
    color: "#555555",
    fontSize: 12,
  },

  textoOpcionSeleccionada: {
    color: "#1565C0",
    fontWeight: "bold",
  },

  espacioFijo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    borderRadius: 9,
    padding: 13,
    gap: 10,
  },

  datosEspacioFijo: {
    flex: 1,
    gap: 4,
  },

  nombreEspacioFijo: {
    color: "#1565C0",
    fontSize: 14,
    fontWeight: "bold",
  },

  ayudaEspacioFijo: {
    color: "#666666",
    fontSize: 12,
  },

  inputTitularContenedor: {
    position: "relative",
  },

  inputTitularReal: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#212121",
  },

  placeholderTitular: {
    display: "none",
  },

  placeholderOculto: {
    display: "none",
  },

  campoTexto: {
    display: "none",
  },

  inputTitular: {
    display: "none",
  },

  filaHorarios: {
    flexDirection: "row",
    gap: 12,
  },

  campoHorario: {
    flex: 1,
    gap: 6,
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

  textoAyuda: {
    fontSize: 12,
    color: "#757575",
    lineHeight: 18,
  },

  selectorFecha: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 12,
    gap: 12,
  },

  datosFecha: {
    flex: 1,
    gap: 3,
  },

  fechaSeleccionada: {
    color: "#212121",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  fechaISO: {
    color: "#757575",
    fontSize: 12,
  },

  filaFechaFinal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  botonLimpiarFecha: {
    width: 40,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
  },

  botonGuardar: {
    backgroundColor: "#2E7D32",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: 13,
    borderRadius: 9,
    marginTop: 8,
  },

  botonDeshabilitado: {
    opacity: 0.6,
  },

  textoBotonGuardar: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  tarjeta: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 13,
    gap: 12,
    elevation: 1,
  },

  cabeceraTarjeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  iconoTarjeta: {
    width: 43,
    height: 43,
    borderRadius: 10,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },

  datosTarjeta: {
    flex: 1,
    gap: 4,
  },

  nombreTitular: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#212121",
  },

  nombreEspacio: {
    fontSize: 13,
    color: "#666666",
  },

  estado: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  estadoActivo: {
    backgroundColor: "#E8F5E9",
  },

  estadoInactivo: {
    backgroundColor: "#EEEEEE",
  },

  textoEstado: {
    fontSize: 11,
    fontWeight: "bold",
  },

  textoActivo: {
    color: "#2E7D32",
  },

  textoInactivo: {
    color: "#757575",
  },

  separador: {
    height: 1,
    backgroundColor: "#EEEEEE",
  },

  filaInformacion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  textoInformacion: {
    fontSize: 13,
    color: "#555555",
  },

  acciones: {
    flexDirection: "row",
    gap: 10,
    marginTop: 5,
  },

  botonEditar: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#E3F2FD",
    paddingVertical: 11,
    borderRadius: 9,
  },

  textoBotonEditar: {
    color: "#1565C0",
    fontWeight: "bold",
    fontSize: 13,
  },

  botonBaja: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FFEBEE",
    paddingVertical: 11,
    borderRadius: 9,
  },

  textoBotonBaja: {
    color: "#C62828",
    fontWeight: "bold",
    fontSize: 13,
  },

  vacio: {
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },

  tituloVacio: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333333",
  },

  cargando: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  textoSecundario: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
  },

  errorContenedor: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },

  tituloError: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#C62828",
    textAlign: "center",
  },

  mensajeError: {
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
  },

  botonReintentar: {
    backgroundColor: "#1565C0",
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 9,
  },

  textoBotonReintentar: {
    color: "#FFFFFF",
    fontWeight: "bold",
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
});
