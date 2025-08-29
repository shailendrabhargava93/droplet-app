import React, { createContext, useContext, useState, useEffect } from 'react';

interface WaterIntake {
  id: string;
  amount: number;
  timestamp: number;
  beverageType: string;
}

interface WaterContextType {
  waterIntakes: WaterIntake[];
  dailyGoal: number;
  addWaterIntake: (amount: number, beverageType?: string) => void;
  removeWaterIntake: (id: string) => void;
  updateDailyGoal: (goal: number) => void;
  todayTotal: number;
  progress: number;
}

const WaterContext = createContext<WaterContextType | null>(null);

export const useWaterContext = () => {
  const context = useContext(WaterContext);
  if (!context) {
    throw new Error('useWaterContext must be used within a WaterProvider');
  }
  return context;
};

export const WaterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [waterIntakes, setWaterIntakes] = useState<WaterIntake[]>(() => {
    const savedIntakes = localStorage.getItem('waterIntakes');
    return savedIntakes ? JSON.parse(savedIntakes) : [];
  });

  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const savedGoal = localStorage.getItem('dailyGoal');
    return savedGoal ? parseInt(savedGoal) : 2000; // Default 2000ml (2L)
  });

  useEffect(() => {
    localStorage.setItem('waterIntakes', JSON.stringify(waterIntakes));
  }, [waterIntakes]);

  useEffect(() => {
    localStorage.setItem('dailyGoal', dailyGoal.toString());
  }, [dailyGoal]);

  // Calculate today's total intake
  const todayTotal = waterIntakes
    .filter((intake) => {
      const intakeDate = new Date(intake.timestamp);
      const today = new Date();
      return (
        intakeDate.getDate() === today.getDate() &&
        intakeDate.getMonth() === today.getMonth() &&
        intakeDate.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, intake) => sum + intake.amount, 0);

  // Calculate progress percentage
  const progress = Math.min(Math.round((todayTotal / dailyGoal) * 100), 100);

  const addWaterIntake = (amount: number, beverageType: string = 'water') => {
    const newIntake = {
      id: Date.now().toString(),
      amount,
      timestamp: Date.now(),
      beverageType,
    };
    setWaterIntakes((prev) => [...prev, newIntake]);
  };

  const removeWaterIntake = (id: string) => {
    setWaterIntakes((prev) => prev.filter((intake) => intake.id !== id));
  };

  const updateDailyGoal = (goal: number) => {
    setDailyGoal(goal);
  };

  return (
    <WaterContext.Provider
      value={{
        waterIntakes,
        dailyGoal,
        addWaterIntake,
        removeWaterIntake,
        updateDailyGoal,
        todayTotal,
        progress,
      }}
    >
      {children}
    </WaterContext.Provider>
  );
};
