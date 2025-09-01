import React, { useState } from 'react';
import { useWaterContext } from '../context/WaterContext';
import { useToast } from '../context/ToastContext';
import { useUnitContext } from '../context/UnitContext';
import { InputNumber } from 'primereact/inputnumber';

const DailyGoalSettings: React.FC = () => {
  const { dailyGoal, updateDailyGoal } = useWaterContext();
  const [newGoal, setNewGoal] = useState<number | null>(dailyGoal);
  const toast = useToast();
  const { formatAmount, unit } = useUnitContext();

  const showSuccessToast = (goal: number) => {
    toast.showSuccess(
      'Goal Updated',
      `Daily water goal set to ${formatAmount(goal)}`
    );
  };

  const handleGoalChange = (value: number | null) => {
    if (value === null) return;
    
    const validValue = Math.min(Math.max(value, 100), 10000);
    setNewGoal(validValue);
    updateDailyGoal(validValue);
    showSuccessToast(validValue);
  };

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <i
          className="pi pi-circle-fill settings-icon"
          style={{ color: '#00BCD4' }}
        ></i>
        <h3>Daily Goal</h3>
      </div>

      <div className="goal-input-container">
        <div className="goal-input-wrapper">
          <InputNumber
            id="goal"
            value={newGoal}
            onValueChange={(e) => {
              const value = e.value as number | null;
              handleGoalChange(value);
            }}
            min={100}
            max={10000}
            step={unit === 'ml' ? 100 : 1}
            showButtons={false}
            className="goal-input"
            maxLength={6}
          />
          <span className="goal-unit">{unit}</span>
        </div>
      </div>

      <div className="goal-preset-chips">
        {[1000, 2000, 2500, 3000].map((amount) => (
          <div
            key={amount}
            className={`goal-preset-chip ${
              newGoal === amount ? 'selected' : ''
            }`}
            onClick={() => handleGoalChange(amount)}
          >
            {formatAmount(amount)}
          </div>
        ))}
      </div>

      <p className="recommended-text">
        Recommended daily water intake:{' '}
        {unit === 'ml' ? '2000-3000ml' : '68-101oz'}
      </p>
    </div>
  );
};

export default DailyGoalSettings;
