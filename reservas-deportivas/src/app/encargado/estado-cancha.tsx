// Pantalla: elegir cancha, nota, fotos, subir, historial
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import SelectorFotos from "../../componentes/SelectorFotos";
import ImagenEspacio from "../../componentes/ImagenEspacio";
import { useAuth } from "../../contextos/AuthContext";
import { mostrarAvisoSinConexion, useConexion } from "../../hooks/useConexion";
import { subirImagenes } from "../../servicios/archivos";
import { descargarMedio } from "../../servicios/mediosEspacios";
import { obtenerEspacios } from "../../servicios/espacios";
import { guardarReporteEstado, obtenerReportesEstado } from "../../servicios/estadosCancha";
import type { FotoSeleccionada, ReporteEstado } from "../../tipos/estadoCancha";
import type { Espacio } from "../../tipos/types";

function formatearFecha(fechaISO: string): string {
    const fecha = new Date(`${fechaISO}T12:00:00`);

    return fecha.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export default function EstadoCancha() {
    const { usuario } = useAuth();
    const { sinConexion } = useConexion();
    const { espacioId: espacioInicial } = useLocalSearchParams<{ espacioId?: string }>();

    const [espacios, setEspacios] = useState<Espacio[]>([]);
    const [espacioId, setEspacioId] = useState(espacioInicial ?? "");
    const [nota, setNota] = useState("");
    const [fotos, setFotos] = useState<FotoSeleccionada[]>([]);
    const [subiendo, setSubiendo] = useState(false);
    const [progreso, setProgreso] = useState<string | null>(null);
    const [reportes, setReportes] = useState<ReporteEstado[]>([]);
    const [cargandoReportes, setCargandoReportes] = useState(true);

    useEffect(() => {
        let activo = true;

        async function cargarEspacios() {
            const datos = await obtenerEspacios();
            if (activo) setEspacios(datos);
        }
        cargarEspacios();
        
        return () => {
            activo = false;
        };
    }, []);

    // Si el encargado llega desde la agenda con otro espacio, actualizamos la selección.
    useEffect(() => {
        if (espacioInicial) setEspacioId(espacioInicial);
    }, [espacioInicial]);

    useEffect(() => {
        cargarReportes();
    }, [espacioId]);

    async function cargarReportes() {
        setCargandoReportes(true);
        try {
            const datos = await obtenerReportesEstado(
                espacioId || undefined
            );
            setReportes(datos);
        } catch (error){
            console.warn("No se pudieron cargar los reportes: ", error)
        } finally {
            setCargandoReportes(false);
        }
    }

    async function subirFotos() {
        if (!espacioId) {
            Alert.alert("Falta la cancha", "Tenes que elegir un espacio.");
            return;
        }

        if (fotos.length === 0) {
            Alert.alert("Falta la foto", "Tenes que agregar al menos una foto.");
            return;
        }
        if (sinConexion) {
            mostrarAvisoSinConexion();
            return;
        }

        setSubiendo(true);
        setProgreso(null);

        try {
            const { subidas, errores } = await subirImagenes(
                fotos.map((foto) => ({uri: foto.uri})),
                (hechos, total) => setProgreso(`Subiendo ${hechos} de ${total}...`)
            );

            if (subidas.length > 0) {
                const espacio = espacios.find((e) => e.id === espacioId);

                await guardarReporteEstado({
                    usuarioId: usuario?.id ?? "",
                    espacioId,
                    espacioNombre: espacio?.nombre ?? espacioId,
                    fecha: new Date().toISOString().split("T")[0],
                    nota: nota.trim(),
                    urls: subidas.map((subida) => subida.url),
                });

                // Cachear las fotos para verlas sin conexión.
                subidas.forEach((subida) => {
                    void descargarMedio(subida.url).catch(() => {});
                });

                setFotos([]);
                setNota("");
                await cargarReportes();
            }
            Alert.alert(
                subidas.length > 0 ? "Listo" : "No se pudo subir",
                `${subidas.length} foto(s) subida(s).` +
                (errores.length > 0 ? `\n\n${errores.join("\n")}` : "")
            );
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "No se pudieron subir las fotos."
            );
        } finally {
            setSubiendo(false);
            setProgreso(null);
        }
    }

    const puedeSubir = !subiendo && fotos.length > 0 && !!espacioId && !sinConexion;

    return (
        <View style={styles.contenedor}>
            <ScrollView contentContainerStyle={styles.scroll}>
                {sinConexion && (
                    <View style={styles.avisoSinConexion}>
                        <Ionicons 
                            name="cloud-offline-outline"
                            size={18}
                            color="#C62828"
                        />
                        <Text style={styles.textoAviso}>
                            Sin Conexión: podes elegir fotos, pero no subirlas.
                        </Text>
                    </View>
                )}

                <Text style={styles.tituloSeccion}>Cancha</Text>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chips}
                >
                    {espacios.map((espacio) => {
                        const activo = espacio.id === espacioId;

                        return (
                            <Pressable
                                key={espacio.id}
                                style={[styles.chip, activo && styles.chipActivo]}
                                onPress={() => setEspacioId(espacio.id)}
                                disabled={subiendo}
                            >
                                <Text
                                    style={[styles.chipTexto, activo && styles.chipTextoActivo]}
                                >
                                    {espacio.nombre}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
                
                <Text style={styles.tituloSeccion}>Nota (opcional)</Text>

                <TextInput 
                    style={styles.nota}
                    value={nota}
                    onChangeText={setNota}
                    placeholder="Ej: cancha anegada, red rota..."
                    placeholderTextColor="#9E9E9E"
                    multiline
                    maxLength={300}
                    editable={!subiendo}
                />
                <Text style={styles.tituloSeccion}>Fotos</Text>

                <SelectorFotos 
                    fotos={fotos}
                    onCambiar={setFotos}
                    max={5}
                    deshabilitado={subiendo}
                />

                {progreso && (
                    <Text style={styles.progreso}>{progreso}</Text>
                )}

                <Pressable
                    style={[styles.botonSubir, !puedeSubir && styles.botonDeshabilitado]}
                    onPress={subirFotos}
                    disabled={!puedeSubir}
                >
                    {subiendo ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons 
                                name="cloud-upload-outline"
                                size={21}
                                color="#FFF"
                            />
                            <Text style={styles.textoBotonSubir}>
                                {fotos.length > 0
                                    ?   `Subir ${fotos.length} foto(s)`
                                    :   "Subir fotos"}
                            </Text>
                        </>
                    )}
                </Pressable>
                <Text style={styles.tituloSeccion}>Historial</Text>
                
                {cargandoReportes ? (
                    <ActivityIndicator color="#1565C0" />
                ) : reportes.length === 0 ? (
                    <Text style={styles.vacio}>
                        Todavía no hay fotos cargadas.
                    </Text>
                ) : (
                    reportes.map((reporte) => (
                        <View key={reporte.id} style={styles.tarjetaReporte}>
                            <View style={styles.cabeceraReporte}>
                                <Text style={styles.nombreEspacio}>
                                    {reporte.espacioNombre}
                                </Text>
                                <Text style={styles.fecha}>
                                    {formatearFecha(reporte.fecha)}
                                </Text>
                            </View>

                            {reporte.nota ? (
                                <Text style={styles.notaReporte}>
                                    {reporte.nota}
                                </Text>
                            ) : null}

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.fotosReporte}
                            >
                                {reporte.urls.map((url) => (
                                    <ImagenEspacio 
                                        key={url}
                                        fuente={url}
                                        style={styles.fotoReporte}
                                    />
                                ))}
                            </ScrollView>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: "#F5F5F5",
    },
    scroll: {
        padding: 16,
        paddingBottom: 40,
    },
    avisoSinConexion: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#FFEBEE",
        borderRadius: 8,
        padding: 10,
        marginBottom: 14,
    },

    textoAviso: {
        flex: 1,
        color: "#C62828",
        fontSize: 13,
    },

    tituloSeccion: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#212121",
        marginBottom: 10,
        marginTop: 6,
    },

    chips: {
        gap: 8,
        paddingBottom: 8,
    },
    chip: {
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: "#FFF",
        borderWidth: 1,
        borderColor: "#E0E0E0",
    },

    chipActivo: {
        backgroundColor: "#1565C0",
        borderColor: "#1565C0",
    },

    chipTexto: {
        color: "#424242",
        fontSize: 13,
        fontWeight: "600",
    },

    chipTextoActivo: {
        color: "#FFF",
    },

    nota: {
        backgroundColor: "#FFF",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E0E0E0",
        padding: 12,
        minHeight: 80,
        textAlignVertical: "top",
        color: "#212121",
        marginBottom: 6,
    },
    progreso: {
        marginTop: 10,
        color: "#1565C0",
        fontSize: 13,
        fontWeight: "600",
    },
    botonSubir: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        backgroundColor: "#1565C0",
        borderRadius: 10,
        paddingVertical: 14,
        marginTop: 16,
    },
    botonDeshabilitado: {
        opacity: 0.5,
    },
    textoBotonSubir: {
        color: "#FFF",
        fontSize: 15,
        fontWeight: "bold",
    },

    vacio: {
        color: "#9E9E9E",
        fontSize: 14,
        textAlign: "center",
        paddingVertical: 20,
    },

    tarjetaReporte: {
        backgroundColor: "#FFF",
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        elevation: 1,
    },

    cabeceraReporte: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },

    nombreEspacio: {
        flex: 1,
        fontSize: 14,
        fontWeight: "bold",
        color: "#212121",
    },

    fecha: {
        fontSize: 12,
        color: "#757575",
    },
    notaReporte: {
        fontSize: 13,
        color: "#616161",
        marginBottom: 10,
        lineHeight: 19,
    },
    fotosReporte: {
        gap: 8,
    },
    fotoReporte: {
        width: 120,
        height: 90,
        borderRadius: 8,
    },
});