// Este componente resuelve las dos cosas:
// Si es una clave mock → usa obtenerImagenEspacio.
// Si es una URL → usa useMedioLocal y muestra la foto local si ya está descargada.

import { Image, StyleSheet, type ImageResizeMode, type ImageStyle, type StyleProp } from 'react-native';
import { obtenerImagenEspacio } from "../servicios/imagenes"
import { useMedioLocal } from '../hooks/useMedioLocal'

interface Props {
    fuente: string;
    style?: StyleProp<ImageStyle>;
    resizeMode?: ImageResizeMode;
}

export default function ImagenEspacio({fuente, style, resizeMode = "cover"}: Props) {
    const esUrl = /^https?:\/\//i.test(fuente);
    const uri = useMedioLocal(esUrl ? fuente : null); //llamo al hook

    if(!esUrl) {
        const imagen = obtenerImagenEspacio(fuente); //si no es url, uso el mapa de imagenes mock
        if(!imagen) return null;
        return <Image source={imagen} style={[estilos.imagen, style]} resizeMode={resizeMode}/>; //retorno esa imagen del mock
    }

    return (
        <Image 
            source={{ uri: uri ?? fuente }}
            style={[estilos.imagen, style]}
            resizeMode={resizeMode}
        />
    );
    //si es url, muestro la local o remota
}

const estilos = StyleSheet.create({
    imagen: {
        width: "100%",
        height: 180,
        borderRadius: 10,
        backgroundColor: "#E0E0E0",
    },
});
