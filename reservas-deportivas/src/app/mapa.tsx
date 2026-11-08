import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import MapView, { Marker } from "react-native-maps";
import { useLocalSearchParams } from "expo-router";

// Ajustar estas rutas si tus archivos están en otra ubicación
import type { Espacio } from "../tipos/types";
import { obtenerEspacios } from "../servicios/espacios";

// Región inicial aproximada
const REGION_INICIAL = {
  latitude: -31.8642,
  longitude: -59.0281,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function Mapa() {
const { id } = useLocalSearchParams<{ id?: string }>();

const [items, setItems] = useState<Espacio[]>([]);
const [region, setRegion] = useState(REGION_INICIAL);
const [loading, setLoading] = useState(true);

// Cargar espacios
useEffect(() => {
async function cargarMapa() {
  try {
    const espacios = await obtenerEspacios();
    const filtrados = id
      ? espacios.filter((espacio) => espacio.id === id)
      : espacios;

    setItems(filtrados);

      // Si venimos con ?id=, centramos el mapa en ese espacio
    if (id && filtrados.length > 0) {
      setRegion({
        latitude: filtrados[0].coordenadas.latitud,
        longitude: filtrados[0].coordenadas.longitud,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }); 
    }
  } catch (error) {  
    console.error("Error al cargar el mapa:", error);  
  } finally {  
    setLoading(false);  
  }  
}  

cargarMapa();

}, [id]);

// Abrir Google Maps
async function abrirComoLlegar(espacio: Espacio) {
if (!espacio.coordenadas) return;

const { latitud, longitud } = espacio.coordenadas;  

const url =  
  `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`;  

try {  
  await Linking.openURL(url);  
} catch (error) {  
  console.error("No se pudo abrir Google Maps:", error);  
}

}

if (loading) {
return (
<View style={s.center}>
<ActivityIndicator size="large" />
<Text>Cargando mapa...</Text>
</View>
);
}

// Comprobar que existan coordenadas válidas
const ubicados = items.filter(
(espacio) =>
espacio.coordenadas != null &&
typeof espacio.coordenadas.latitud === "number" &&
typeof espacio.coordenadas.longitud === "number"
);

return (
<View style={s.container}>
<MapView  
style={s.map}  
region={region}  
>
{ubicados.map((espacio) => (
<Marker
key={espacio.id}
coordinate={{
latitude: espacio.coordenadas!.latitud,
longitude: espacio.coordenadas!.longitud,
}}
title={espacio.nombre}
description={espacio.complejo}
/>
))}
</MapView>

{/* Botones para llegar a cada espacio */}  
  <ScrollView style={s.bottom} contentContainerStyle={s.bottomContent}>
  {ubicados.length === 0 && (
    <Text>Todavía no hay espacios con coordenadas disponibles.</Text>
  )}

  {ubicados.map((espacio) => (
    <Pressable
      key={espacio.id}
      style={s.button}
      onPress={() => abrirComoLlegar(espacio)}
    >
      <Text style={s.white}>Cómo llegar: {espacio.nombre}</Text>
    </Pressable>
  ))}
</ScrollView>
</View>

);
}

const s = StyleSheet.create({
container: {
flex: 1,
},

map: {
flex: 1,
},

center: {
flex: 1,
alignItems: "center",
justifyContent: "center",
},

bottom: {
  maxHeight: 200,
  backgroundColor: "white",
},

bottomContent: {
  padding: 10,
},

button: {
padding: 11,
backgroundColor: "#175CD3",
borderRadius: 8,
marginTop: 6,
},

white: {
color: "white",
fontWeight: "bold",
textAlign: "center",
},
});

