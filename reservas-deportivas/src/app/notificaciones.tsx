//Pantalla de preferencias y estado del permiso
import { useCallback, useEffect, useState, type ComponentProps } from "react";
import { ActivityIndicator, Alert, AppState, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { mostrarAvisoInmediato } from "../servicios/avisos";
import { abrirAjustesDeNotificaciones, obtenerEstadoPermiso, pedirPermiso } from "../servicios/notificaciones";
import { cancelarTodosLosRecordatorios, guardarPreferenciaRecordatorios, recordatoriosHabilitados } from "../servicios/recordatorios";
import type { EstadoPermiso } from "../tipos/notificaciones";

type NombreIcono = ComponentProps<typeof Ionicons>["name"];
type InfoPermiso = {
    icono: NombreIcono;
    color: string;
    titulo: string;
    texto: string;
};

const INFO_PERMISO: Record<EstadoPermiso, InfoPermiso> = {
    granted: {
        icono: "checkmark-circle",
        color: "#2E7D32",
        titulo: "Notificaciones habilitadas",
        texto: "El sistema permite mostrar avisos y recordatorios en este dispositivo.",
    },
    denied: {
        icono: "close-circle",
        color: "#C62828",
        titulo: "Notificaciones bloqueadas",
        texto: "El sistema no permite mostrar avisos ni recordatorios, podés habilitarlas desde los ajustes.",
    },
    undetermined: {
        icono: "help-circle",
        color: "#1565C0",
        titulo: "Permiso pendiente",
        texto: "Todavía no autorizaste las notificaciones de esta app.",
    },
};

//funcion temporal facu
async function probarAviso(tipo: "suspension" | "liberado") {
    const aviso =
        tipo === "suspension"
            ? {
                  titulo: "Turno suspendido",
                  cuerpo: "Cancha 1 · 15/11 de 18:00 a 19:00. Motivo: lluvia.",
                  datos: {
                      tipo: "cambio-turno" as const,
                      reservaId: "prueba",
                  },
              }
            : {
                  titulo: "Se liberó un turno en Cancha 1",
                  cuerpo: "15/11 de 20:00 a 21:00. Entrá a la app para reservarlo.",
                  datos: {
                      tipo: "turno-liberado" as const,
                      turnoId: "prueba",
                      espacioId: "prueba",
                  },
              };

    const mostrado = await mostrarAvisoInmediato(
        aviso.titulo,
        aviso.cuerpo,
        aviso.datos
    );

    if (!mostrado) {
        Alert.alert(
            "No se pudo mostrar",
            "Revisá el permiso del sistema y que los avisos estén activados."
        );
    }
}

export default function Notificaciones() {
    const [estadoPermiso, setEstadoPermiso] = useState<EstadoPermiso | null>(null);
    const [habilitado, setHabilitado] = useState<boolean | null>(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false); //inicializado en false para cuando se cambie el switch
    const [solicitando, setSolicitando] = useState(false); //inicializado en false para cuando se pida permiso al sistema
    const [error, setError] = useState<string | null>(null);

    //consultar la preferencia guardada y el permiso real del sistema operativo
    const cargarEstado = useCallback(async () => {
        setError(null);

        try {
            const [preferencia, permiso] = await Promise.all([
                recordatoriosHabilitados(),
                obtenerEstadoPermiso(),
            ]);
            setHabilitado(preferencia);
            setEstadoPermiso(permiso);
        } catch (err) {
            setError(
                err instanceof Error
                ? err.message
                : "No se pudo consultar el estado de las notificaciones."
            );
        } finally{
            setCargando(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            void cargarEstado();
        }, [cargarEstado])
    );

    // Refrescar el permiso cuando el usuario vuelve de los ajustes.
    useEffect(() => {
        const suscripcion = AppState.addEventListener(
            "change",
            (estadoApp) => {
                if (estadoApp === "active") {
                    void cargarEstado();
                }
            }
        );
        return suscripcion.remove();
    }, [cargarEstado]);

    async function permitirNotificaciones() {
        setSolicitando(true);
        try{
            const permiso = await pedirPermiso();
            setEstadoPermiso(permiso);

            if(permiso !== "granted") {
                Alert.alert(
                    "No se habilitaron",
                    "Podes habilitar las notificaciones desde los ajustes del sistema.",
                    [
                        {text: "Cerrar", style: "cancel" },
                        {
                            text: "Abrir ajustes",
                            onPress: () => {
                                void abrirAjustesDeNotificaciones();
                            },
                        },
                    ]
                );
            }
        } catch (error) {
            console.warn("No se pudo solicitar el permiso: ", error);
            Alert.alert("Error", "No se pudo solicitar el permiso de notificaciones.");
        } finally {
            setSolicitando(false);
        }
    }

    async function cambiarPreferencia(activo: boolean) {
        //cambio de preferencia con actualización optimista
        const anterior = habilitado;
        setGuardando(true);
        setHabilitado(activo);

        try {
            await guardarPreferenciaRecordatorios(activo);

            if (!activo) {
                // Al apagarlos, no deben quedar avisos ya programados.
                await cancelarTodosLosRecordatorios().catch((err) => {
                    console.warn("No se pudieron cancelar los recordatorios: ", err);
                });
                return;
            }

            let permiso = estadoPermiso;

            if(permiso === "undetermined") {
                    permiso = await pedirPermiso();
                    setEstadoPermiso(permiso);
                }
            if (permiso !== "granted") {
                Alert.alert(
                    "Falta el permiso del sistema", 
                    "La preferencia quedó activada, pero el sistema bloquea las notificaciones. Tenes que habilitarlas desde los ajustes para que los avisos lleguen.",
                    [
                        {text: "Ahora no", style: "cancel" },
                        {
                            text: "Abrir ajustes",
                            onPress: () => {
                                void abrirAjustesDeNotificaciones();
                            },
                        },
                    ]
                );
            }
        } catch (error){
            setHabilitado(anterior);

            Alert.alert("Error", "No se pudo guardar la preferencia");
            console.warn("Error al cambiar los recordatorios: ", error);
        } finally {
            setGuardando(false);
        }
    }

    //4 retornos tempranos
    if (Platform.OS === "web") {
        return (
            <>
                <Stack.Screen options={{ title: "Notificaciones" }} />
                    <View style={styles.centrado}>
                        <Ionicons 
                            name="notifications-off-outline"
                            size={60}
                            color="#9E9E9E"
                        />
                        <Text style={styles.textoSecundario}>
                            Las notificaciones sólo están disponibles en Android e iOS.
                        </Text>
                    </View>
            </>
        );
    }

    if(cargando) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator 
                    size="large"
                    color="#1565C0"
                />
                <Text style={styles.textoSecundario}>
                    Cargando preferencias...
                </Text>
            </View>
        );
    }

    if(error) {
        return (
            <>
                <Stack.Screen options={{ title: "Notificaciones" }} />
                    <View style={styles.centrado}>
                        <Ionicons 
                            name="alert-circle-outline"
                            size={60}
                            color="#C62828"
                        />
                        <Text style={styles.error}>{error}</Text>
                        <Pressable
                            style={styles.botonPrincipal}
                            onPress={() => {
                                setCargando(true)
                                void cargarEstado();
                            }}
                        >
                            <Text style={styles.textoBoton}>Reintentar</Text>
                        </Pressable>
                    </View>
            </>
        );
    }

    if (habilitado === null || estadoPermiso === null) {
        return (
            <View style={styles.centrado}>
                <Text style={styles.textoSecundario}>
                    No se pudo leer la preferencia.
                </Text>
            </View>
        );
    }

    const info = INFO_PERMISO[estadoPermiso];
    //interfaz principal
    return(
        <>
            <Stack.Screen options={{ title: "Notificaciones", headerBackTitle: "Volver" }} />
            <ScrollView
                style={styles.contenedor}
                contentContainerStyle={styles.contenido}
            >
                {/* Preferencia */}
                <View style={styles.tarjeta}>
                    <View style={styles.fila}>
                        <View style={styles.icono}>
                            <Ionicons 
                                name="notifications-outline"
                                size={24}
                                color={"#1565C0"}
                            />
                        </View>

                        <View style={styles.textos}>
                            <Text style={styles.titulo}>
                                Avisos de turnos
                            </Text>
                            <Text style={styles.descripcion}>
                                Recibí un recordatorio 2 horas antes y avisos si el complejo suspende o mueve tu turno, o si se libera un turno en un espacio favorito.
                            </Text>
                        </View>

                        <Switch
                            value={habilitado}
                            onValueChange={(valor) => {
                                void cambiarPreferencia(valor);
                            }}
                            disabled={guardando || solicitando}
                            trackColor={{
                                false: "#CFD8DC",
                                true: "#90CAF9",
                            }}
                            thumbColor={habilitado ? "#1565C0" : "#F5F5F5"}
                        />
                    </View>
                    <Pressable
                        style={styles.botonSecundario}
                        onPress={() => void probarAviso("suspension")}
                    >
                        <Text style={styles.textoBotonSecundario}>
                            Probar aviso de suspensión
                        </Text>
                    </Pressable>
                    <Pressable
                        style={styles.botonSecundario}
                        onPress={() => void probarAviso("liberado")}
                    >
                        <Text style={styles.textoBotonSecundario}>
                            Probar aviso de turno liberado
                        </Text>
                    </Pressable>
                    
                    {guardando && (
                        <ActivityIndicator color="#1565C0" />
                    )}
                </View>

                {/* Permiso del sistema */}
                <View style={styles.tarjeta}>
                    <Text style={styles.tituloSeccion}>Estado del permiso</Text>
                    <View style={styles.estadoFila}>
                        <Ionicons
                            name={info.icono}
                            size={27}
                            color={info.color}
                        />
                        <Text style={[styles.estadoTexto, { color: info.color }, ]}>
                            {info.titulo}
                        </Text>
                    </View>
                    <Text style={styles.descripcion}>{info.texto}</Text>
                    {estadoPermiso === "undetermined" && (
                        <Pressable
                            style={styles.botonPrincipal}
                            onPress={() => {
                                void permitirNotificaciones();
                            }}
                            disabled={solicitando || guardando}
                        >
                            {solicitando ? (
                                <ActivityIndicator color={"#FFF"}/>
                            ): (
                                <Text style={styles.textoBoton}>Permitir notificaciones</Text>
                            )}
                        </Pressable>
                    )}

                    {estadoPermiso === "denied" && (
                        <Pressable
                            style={styles.botonSecundario}
                            onPress={() => {
                                void abrirAjustesDeNotificaciones();
                            }}
                            disabled={solicitando || guardando}
                        >
                            <Text style={styles.textoBotonSecundario}>
                                Abrir ajustes del sistema
                            </Text>
                        </Pressable>
                    )}
                </View>

                {/* Aviso si la preferencia está activa pero el sistema bloquea */}
                {habilitado && estadoPermiso !== "granted" && (
                    <View style={styles.aviso}>
                        <Ionicons 
                            name="alert-circle-outline"
                            size={22}
                            color="#E65100"
                        />
                        <Text style={styles.textoAviso}>
                            Los avisos están activados en la app, pero el sistema todavía no permite mostrarlos.
                        </Text>
                    </View>
                )}

                {/* Información */}
                <View style={styles.tarjeta}>
                    <Text style={styles.tituloSeccion}>Cómo funcionan</Text>
                    <View style={styles.vineta}>
                        <Ionicons
                            name="phone-portrait-outline"
                            size={19}
                            color="#1565C0"
                        />
                        <Text style={styles.textoVineta}>
                            Se generan en este dispositivo. El recordatorio de 2 horas se programa con anticipación; los demás avisos se muestran al sincronizar Mis reservas.
                        </Text>
                    </View>

                     <View style={styles.vineta}>
                        <Ionicons
                            name="time-outline"
                            size={19}
                            color="#1565C0"
                        />
                        <Text style={styles.textoVineta}>
                            Recordatorio: 2 horas antes del inicio de cada reserva confirmada.
                        </Text>
                    </View>

                    <View style={styles.vineta}>
                        <Ionicons
                            name="alert-circle-outline"
                            size={19}
                            color="#1565C0"
                        />
                        <Text style={styles.textoVineta}>
                            Si el complejo suspende o reprograma tu turno, recibís un aviso cuando la app vuelve a consultar tus reservas.
                        </Text>
                    </View>

                    <View style={styles.vineta}>
                        <Ionicons
                            name="heart-outline"
                            size={19}
                            color="#1565C0"
                        />
                        <Text style={styles.textoVineta}>
                            Si se libera un turno en un espacio favorito, recibís un aviso en la próxima sincronización.
                        </Text>
                    </View>

                    <View style={styles.vineta}>
                        <Ionicons
                            name="close-circle-outline"
                            size={19}
                            color="#1565C0"
                        />
                        <Text style={styles.textoVineta}>
                            Si desactivás los avisos, se cancelan los recordatorios ya programados.
                        </Text>
                    </View>
                </View>

                {!habilitado && (
                    <View style={styles.aviso}>
                        <Ionicons
                            name="information-circle-outline"
                            size={22}
                            color="#1565C0"
                        />
                        <Text style={styles.textoAviso}>
                            Al volver a activarlos, los recordatorios se programan la próxima vez que abras Mis reservas y los avisos se revisan en esa misma sincronización.
                        </Text>
                    </View>
                )}
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
        paddingBottom: 36,
        gap: 20,
    },
    tarjeta: {
        backgroundColor: "#FFF",
        borderRadius: 14,
        padding: 18,
        gap: 14,
    },
    fila: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    icono: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#E3F2FD",
        alignItems: "center",
        justifyContent: "center",
    },
    textos: {
        flex: 1,
        gap: 4,
    },
    titulo:{
        fontSize: 17,
        fontWeight: "bold",
        color: "#212121",
    },
    tituloSeccion: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#212121",
    },
    descripcion: {
        fontSize: 13,
        color: "#757575",
        lineHeight: 19,
    },
    estadoFila: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    estadoTexto: {
        flex: 1,
        fontSize: 15,
        fontWeight:"600",
    },
    botonPrincipal: {
        backgroundColor: "#1565C0",
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: "center",
    },
    textoBoton:{
        color:"#FFF",
        fontSize: 15,
        fontWeight: "bold",
    },
    botonSecundario: {
        backgroundColor: "#E3F2FD",
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: "center",
    },
    textoBotonSecundario: {
        color:"#1565C0",
        fontSize: 15,
        fontWeight: "bold",
    },
    aviso: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: "#FFF3E0",
        borderRadius: 12,
        padding: 14,
    },
    textoAviso: {
        flex: 1,
        fontSize: 13,
        color: "#795548",
        lineHeight: 19,
    },
    vineta: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    textoVineta: {
        flex: 1,
        fontSize: 14,
        color: "#424242",
        lineHeight: 20,
    },
    centrado: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 14,
        backgroundColor: "#F5F5F5",
    },
    textoSecundario: {
        fontSize: 15,
        color: "#757575",
        textAlign: "center",
    },
    error: {
        color: "#C62828",
        textAlign: "center",
        fontSize: 15,
    },
});