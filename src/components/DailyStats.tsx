import React, { useEffect, useState } from 'react';
import { useWaterContext } from '../context/WaterContext';
import { useUnitContext } from '../context/UnitContext';

const DailyStats: React.FC = () => {
  const { dailyGoal, waterIntakes } = useWaterContext();
  const { formatAmount } = useUnitContext();
  const [timeSinceLastDrink, setTimeSinceLastDrink] = useState<number>(0);

  // Get only today's intakes
  const today = new Date();
  const todayIntakes = waterIntakes.filter((intake) => {
    const intakeDate = new Date(intake.timestamp);
    return (
      intakeDate.getDate() === today.getDate() &&
      intakeDate.getMonth() === today.getMonth() &&
      intakeDate.getFullYear() === today.getFullYear()
    );
  });

  useEffect(() => {
    const updateTimeSinceLastDrink = () => {
      if (todayIntakes.length === 0) return;

      const lastIntake = todayIntakes[todayIntakes.length - 1];
      const lastIntakeTime = new Date(lastIntake.timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - lastIntakeTime.getTime()) / (1000 * 60));
      setTimeSinceLastDrink(diffInMinutes);
    };

    // Update initially
    updateTimeSinceLastDrink();

    // Update every minute
    const intervalId = setInterval(updateTimeSinceLastDrink, 60000);

    return () => clearInterval(intervalId);
  }, [todayIntakes]);

  const formatGoal = () => {
    return formatAmount(dailyGoal);
  };

  return (
    <div className="daily-stats-container" style={{ width: '100%' }}>
      <div className="daily-stats-card">
        <div className="stats-item">
          <div className="stats-label">Daily Goal</div>
          <div className="stats-value">{formatGoal()}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">Time Since Last Drink</div>
          <div className="stats-value">
            {timeSinceLastDrink}<span>min</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyStats;
