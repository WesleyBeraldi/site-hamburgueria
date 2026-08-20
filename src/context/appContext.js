import { createContext, useContext } from 'react';

export const AppContext = createContext(null);

export function useApp() {
  const contexto = useContext(AppContext);

  if (!contexto) {
    throw new Error('useApp precisa ser usado dentro de AppProvider.');
  }

  return contexto;
}
