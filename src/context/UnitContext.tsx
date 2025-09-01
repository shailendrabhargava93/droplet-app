import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

type Unit = 'ml' | 'oz';

interface UnitContextProps {
  unit: Unit;
  setUnit: (unit: Unit) => void;
  convertToCurrentUnit: (amount: number, fromUnit?: Unit) => number;
  formatAmount: (amount: number) => string;
}

const UnitContext = createContext<UnitContextProps | null>(null);

export const useUnitContext = () => {
  const context = useContext(UnitContext);
  if (!context) {
    throw new Error('useUnitContext must be used within a UnitProvider');
  }
  return context;
};

interface UnitProviderProps {
  children: ReactNode;
}

export const UnitProvider: React.FC<UnitProviderProps> = ({ children }) => {
  const [unit, setUnitState] = useState<Unit>(() => {
    const savedUnit = localStorage.getItem('preferredUnit');
    return (savedUnit as Unit) || 'ml';
  });

  useEffect(() => {
    localStorage.setItem('preferredUnit', unit);
  }, [unit]);

  const setUnit = (newUnit: Unit) => {
    setUnitState(newUnit);
  };

  // Conversion rates
  const ML_TO_OZ = 0.033814;
  const OZ_TO_ML = 29.5735;

  // Convert between units
  const convertToCurrentUnit = (
    amount: number,
    fromUnit: Unit = 'ml'
  ): number => {
    if (fromUnit === unit) return amount;

    if (fromUnit === 'ml' && unit === 'oz') {
      return Math.round(amount * ML_TO_OZ * 10) / 10; // Round to 1 decimal place
    }

    if (fromUnit === 'oz' && unit === 'ml') {
      return Math.round(amount * OZ_TO_ML);
    }

    return amount;
  };

  // Format amount based on current unit
  const formatAmount = (amount: number): string => {
    if (unit === 'ml') {
      return `${amount} ml`;
    } else {
      return `${amount} oz`;
    }
  };

  return (
    <UnitContext.Provider
      value={{
        unit,
        setUnit,
        convertToCurrentUnit,
        formatAmount,
      }}
    >
      {children}
    </UnitContext.Provider>
  );
};
