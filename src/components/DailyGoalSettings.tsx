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
        <InputNumber
          id="goal"
          value={newGoal}
          onValueChange={(e) => setNewGoal(e.value as number | null)}
          min={1}
          step={100}
          showButtons={false}
          className="goal-input"
          suffix={unit === 'ml' ? ' ml' : ' oz'}
        />
      </div>

      <div className="goal-preset-chips">
        {[1000, 2000, 2500, 3000].map((amount) => (
          <div
            key={amount}
            className={`goal-preset-chip ${
              newGoal === amount ? 'selected' : ''
            }`}
            onClick={() => {
              setNewGoal(amount);
              updateDailyGoal(amount);
              showSuccessToast(amount);
            }}
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
