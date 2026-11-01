import * as Network from "expo-network";
import { Alert } from "react-native";

export function mostrarAvisoSinConexion() {
  Alert.alert(
    "No hay conexión",
    "Esta función necesita conexión a Internet. " +
      "Sin conexión podés ingresar a Mi perfil, " +
      "consultar tus próximas reservas guardadas y mostrar sus QR.",
    [{ text: "Entendido" }]
  );
}

export function useConexion() {
  const estado = Network.useNetworkState();

  const sinConexion =
    estado.isConnected === false ||
    estado.isInternetReachable === false;

  return { sinConexion };
}
