import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useRef,
} from 'react';
import { createRoot } from 'react-dom/client';

import DiceAnimation from '../components/DiceAnimation';
import { performRoll } from '../services/diceService';
import type { RollResult, DiceRoll } from '../types';

export interface DiceState {
  currentRollResult: RollResult | null;
  showDiceAnimation: boolean;
  error: string | null;
}

export interface DiceContextProps extends DiceState {
  performDiceRoll: (roll: DiceRoll) => Promise<RollResult>;
  resetError: () => void;
}

const DiceContext = createContext<DiceContextProps | undefined>(undefined);

export const DiceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [state, setState] = useState<DiceState>({
    currentRollResult: null,
    showDiceAnimation: false,
    error: null,
  });

  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const performDiceRoll = useCallback(
    async (roll: DiceRoll): Promise<RollResult> => {
      try {
        const result = performRoll(roll);
        setState(prev => ({
          ...prev,
          currentRollResult: result,
          showDiceAnimation: true,
        }));
        return result;
      } catch (error) {
        setState(prev => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : 'Error performing dice roll',
        }));
        throw error;
      }
    },
    []
  );

  const value = {
    ...state,
    performDiceRoll,
    resetError,
  };

  return (
    <DiceContext.Provider value={value}>
      {children}
      {state.showDiceAnimation &&
        state.currentRollResult &&
        (() => {
          if (!containerRef.current) {
            containerRef.current = document.createElement('div');
            containerRef.current.id = 'dice-animation-container';
            containerRef.current.style.position = 'fixed';
            containerRef.current.style.top = '50%';
            containerRef.current.style.left = '50%';
            containerRef.current.style.transform = 'translate(-50%, -50%)';
            containerRef.current.style.width = '100vw';
            containerRef.current.style.height = '100vh';
            containerRef.current.style.backgroundColor = 'transparent';
            containerRef.current.style.zIndex = '1000';
            document.body.appendChild(containerRef.current);
            rootRef.current = createRoot(containerRef.current);
          }

          if (rootRef.current) {
            rootRef.current.render(
              <DiceAnimation
                roll={state.currentRollResult}
                onAnimationComplete={() => {
                  setState(prev => ({ ...prev, showDiceAnimation: false }));
                  setTimeout(() => {
                    rootRef.current?.unmount();
                    containerRef.current?.remove();
                    rootRef.current = null;
                    containerRef.current = null;
                  }, 100);
                }}
              />
            );
          }
          return null;
        })()}
    </DiceContext.Provider>
  );
};

export const useDice = () => {
  const context = useContext(DiceContext);
  if (context === undefined) {
    throw new Error('useDice must be used within a DiceProvider');
  }
  return context;
};
