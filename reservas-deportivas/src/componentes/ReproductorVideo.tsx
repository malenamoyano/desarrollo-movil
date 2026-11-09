import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { StyleSheet, View, Text } from 'react-native';
import { useMedioLocal } from '../hooks/useMedioLocal';

type Props = {
  videoUrl: VideoSource | null;
};

export default function ReproductorVideo({ videoUrl }: Props) {

  const urlRemota = typeof videoUrl === 'string' && /^https?:\/\//i.test(videoUrl)
    ? videoUrl
    : null;

  const uriLocal = useMedioLocal(urlRemota);

  const fuente: VideoSource = urlRemota
    ? uriLocal ?? urlRemota
    : videoUrl;
  
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

      <VideoView
        style={styles.video}
        player={player}
        nativeControls
        contentFit="contain"
      />
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
});
