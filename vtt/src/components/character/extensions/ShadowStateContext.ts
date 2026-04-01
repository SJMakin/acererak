import { createContext, useContext } from 'react';
import type { ShadowState } from '../../../services/shadowStateService';

interface ShadowStateContextValue {
  shadowState: ShadowState;
  onUpdateStat: (key: string, newValue: string | number) => void;
}

export const ShadowStateContext = createContext<ShadowStateContextValue>({
  shadowState: { stats: {}, projections: {} },
  onUpdateStat: () => {},
});

export const useShadowState = () => useContext(ShadowStateContext);
