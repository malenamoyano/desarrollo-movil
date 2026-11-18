import { createContext, useContext } from "react";

type InicioListoContextType = {
  avisarInicioListo: () => void;
};

export const InicioListoContext =
  createContext<InicioListoContextType>({
    avisarInicioListo: () => {},
  });

export function useInicioListo() {
  return useContext(InicioListoContext);
}