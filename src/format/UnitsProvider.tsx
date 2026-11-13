import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { LengthUnit, Units, WeightUnit } from './units';

type UnitsState = {
  units: Units;
  setWeightUnit: (unit: WeightUnit) => void;
  setLengthUnit: (unit: LengthUnit) => void;
};

const UnitsContext = createContext<UnitsState | null>(null);

export type UnitsProviderProps = {
  /** The units the app starts in: the saved choice, or the default for the phone. */
  initial: Units;
  /** Told about every change, to remember it for the next launch. */
  onWeightUnitChange?: (unit: WeightUnit) => void;
  onLengthUnitChange?: (unit: LengthUnit) => void;
  children: ReactNode;
};

/** Holds the chosen units and switches every screen at once when they change. */
export function UnitsProvider({ initial, onWeightUnitChange, onLengthUnitChange, children }: UnitsProviderProps) {
  const [units, setUnits] = useState(initial);

  const setWeightUnit = useCallback(
    (weight: WeightUnit) => {
      setUnits((current) => ({ ...current, weight }));
      onWeightUnitChange?.(weight);
    },
    [onWeightUnitChange],
  );
  const setLengthUnit = useCallback(
    (length: LengthUnit) => {
      setUnits((current) => ({ ...current, length }));
      onLengthUnitChange?.(length);
    },
    [onLengthUnitChange],
  );

  const value = useMemo(() => ({ units, setWeightUnit, setLengthUnit }), [units, setWeightUnit, setLengthUnit]);
  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

/** The chosen units and the setters for them. */
export function useUnits(): UnitsState {
  const state = useContext(UnitsContext);
  if (!state) throw new Error('useUnits is used outside a UnitsProvider');
  return state;
}
