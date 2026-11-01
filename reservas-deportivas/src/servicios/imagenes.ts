
import type { ImageSourcePropType } from "react-native";

export const imagenesEspacios: Record<
  string,
  ImageSourcePropType
> = {
  "futbol5-1": require(
    "../../assets/images/espacios/futbol5-1.jpg"
  ),

  "futbol5-2": require(
    "../../assets/images/espacios/futbol5-2.jpg"
  ),

  "futbol11": require(
    "../../assets/images/espacios/futbol11.jpg"
  ),

  "basquet-1": require(
    "../../assets/images/espacios/basquet-1.jpg"
  ),

  "basquet-2": require(
    "../../assets/images/espacios/basquet-2.jpg"
  ),

  "basquet-3": require(
    "../../assets/images/espacios/basquet-3.jpg"
  ),

  "voley-1": require(
    "../../assets/images/espacios/voley-1.jpg"
  ),

  "voley-2": require(
    "../../assets/images/espacios/voley-2.jpg"
  ),

  "tenis-1": require(
    "../../assets/images/espacios/tenis-1.jpg"
  ),

  "tenis-2": require(
    "../../assets/images/espacios/tenis-2.jpg"
  ),

  "gimnasio": require(
    "../../assets/images/espacios/gimnasio.jpg"
  ),
};

export function obtenerImagenEspacio(
  clave: string
): ImageSourcePropType | undefined {
  return imagenesEspacios[clave];
}
