import { useEffect, useEffectEvent, useState } from 'react';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { StyleSheet, View, Text } from 'react-native';
import { Asset } from 'expo-asset';
import { useMedioLocal } from '../hooks/useMedioLocal';
import { useConexion } from '../hooks/useConexion';

type Props = {
  videoUrl: VideoSource | null;
};

export default function ReproductorVideo({ videoUrl }: Props) {

  const esAssetEmpaquetado = typeof videoUrl === 'number';

  const [uriEmpaquetada, setUriEmpaquetada] = useState<string | null>(() => {
    if (typeof videoUrl !== 'number') return null;
    return Asset.fromModule(videoUrl).localUri;
  })

  useEffect(() => {
    if (typeof videoUrl !== 'number') {
      setUriEmpaquetada(null);
      return;
    }
    let activo = true;

    Asset.fromModule(videoUrl)
      .downloadAsync()
      .then((asset) => {
        if (activo) setUriEmpaquetada(asset.localUri);
      })
      .catch((error) => {
        console.warn("No se pudo preparar el video local: ", error);
      });
      return () => {
        activo = false;
      };
  }, [videoUrl]);

  const urlRemota = typeof videoUrl === 'string' && /^https?:\/\//i.test(videoUrl)
    ? videoUrl
    : null;

  const { sinConexion } = useConexion();
  const uriLocal = useMedioLocal(urlRemota);

  const tieneCopiaLocal = urlRemota != null && uriLocal != null && uriLocal !== urlRemota;
  const puedeReproducir = !urlRemota || !sinConexion || tieneCopiaLocal;

  const fuente: VideoSource = puedeReproducir
    ? urlRemota
      ? uriLocal ?? urlRemota
      : esAssetEmpaquetado
        ? uriEmpaquetada ?? videoUrl
        : videoUrl
    : null;
  
 const player = useVideoPlayer(fuente, (player) => {
    player.loop = false;
  
  });

  if (!videoUrl) {
    return null;
  }

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>
        Video de la cancha
      </Text>

      {puedeReproducir ? (
        <VideoView
          style={styles.video}
          player={player}
          nativeControls
          contentFit="contain"
        />
      ) : (
        <Text style={styles.mensajeOffline}>
          El video necesita conexión y todavía no está disponible como archivo local.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    marginVertical: 15,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  video: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  mensajeOffline: {
    fontSize: 13,
    color:"#777",
    lineHeight: 20,
  },
});
