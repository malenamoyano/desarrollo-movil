// Botones galería/cámara + miniaturas + quitar
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FotoSeleccionada } from "../tipos/estadoCancha"

const MAX_BYTES = 5 * 1024 * 1024;

type Props = {
    fotos: FotoSeleccionada[];
    onCambiar: (fotos: FotoSeleccionada[]) => void;
    max?: number;
    deshabilitado?: boolean;
};

export default function SelectorFotos({ fotos, onCambiar, max = 5, deshabilitado = false}: Props) {
  const restantes = Math.max(0, max - fotos.length);
  const bloqueado = deshabilitado || restantes === 0;

  function agregar(assets: ImagePicker.ImagePickerAsset[]) {
    const nuevas: FotoSeleccionada[] = assets.map((a, i) => ({
      uri: a.uri,
      nombre: a.fileName ?? `foto-${Date.now()}-${i}.jpg`,
      tipoMime: a.mimeType ?? "image/jpeg",
      bytes: a.fileSize
    }));

    const grandes = nuevas.filter((f) => (f.bytes ?? 0) > MAX_BYTES);
    if (grandes.length > 0) {
      Alert.alert("Foto muy grande", "El máximo por foto es de 5 MB.");
    }

    const validas = nuevas.filter((f) => (f.bytes ?? 0) <= MAX_BYTES);
    onCambiar([...fotos, ...validas].slice(0, max));
  }

  async function elegirDeGaleria() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if(!permiso.granted) {
      Alert.alert("Permiso necesario", "Necesitamos acceso a tus fotos");
    return;
  }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: restantes,
      quality: 0.7,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });

    if (resultado.canceled) return;
    agregar(resultado.assets);
  }

  async function sacarFoto() {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();

    if(!permiso.granted) {
      Alert.alert("Permiso necesario", "Necesitamos acceso a su camara.")
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    
    if (resultado.canceled) return;
    agregar(resultado.assets);
  }

  function quitar(uri: string) {
    onCambiar(fotos.filter((foto) => foto.uri !== uri));
  }

  return (
    <View style={styles.contenedor}>
      <View style={styles.botones}>
        <Pressable
          style={[styles.boton, bloqueado && styles.botonDeshabilitado]}
          onPress={elegirDeGaleria}
          disabled={bloqueado}
        >
          <Ionicons name="image-outline" size={22} color="#1565C0"/>
          <Text style={styles.textoBoton}>Galería</Text>
        </Pressable>

        <Pressable
          style={[styles.boton, bloqueado && styles.botonDeshabilitado]}
          onPress={sacarFoto}
          disabled={bloqueado}
        >
          <Ionicons name="camera-outline" size={22} color="#1565C0" />
          <Text style={styles.textoBoton}>Sacar foto</Text>
        </Pressable>
      </View>

      <Text style={styles.contador}>
        {fotos.length} / {max} fotos
      </Text>

      {fotos.length > 0 && (
        <View style={styles.miniaturas}>
          {fotos.map((foto) => (
            <View key={foto.uri} style={styles.miniaturaContenedor}>
              <Image
                source={{ uri: foto.uri }}
                style={styles.miniatura} 
              />

              <Pressable
                style={styles.quitar}
                onPress={() => quitar(foto.uri)}
                disabled={deshabilitado}
                hitSlop={8}
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color="#C62828" 
                />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: 12,
  },

  botones: {
    flexDirection: "row",
    gap: 10,
  },

  boton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E3F2FD",
    borderRadius: 10,
    paddingVertical: 12,
  },

  botonDeshabilitado: {
    opacity: 0.5,
  },

  textoBoton: {
    color: "#1565C0",
    fontWeight: "600",
  },

  contador: {
    fontSize: 13,
    color: "#666",
  },

  miniaturas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  miniaturaContenedor: {
    position: "relative",
  },

  miniatura: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#E0E0E0",
  },

  quitar: {
    position: "absolute",
    top: -6,
    right: -6,
  },
});