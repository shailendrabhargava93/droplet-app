import React from 'react';
import WaterWave from './WaterWave';
import { useWaterContext } from '../context/WaterContext';
import { Button } from 'primereact/button';

const WaterProgress: React.FC = () => {
  const { todayTotal, dailyGoal, progress } = useWaterContext();

  // Get current date
  const today = new Date();
  const [date, setDate] = React.useState<Date>(today);

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Get motivational message based on progress
  const getMotivationalMessage = () => {
    if (progress >= 100) {
      return "Awesome! You've reached your daily goal! 🎉";
    } else if (progress >= 75) {
      return 'Almost there! Keep up the good work! 💧';
    } else if (progress >= 50) {
      return 'Halfway there! Keep drinking! 💦';
    } else if (progress >= 25) {
      return 'Good start! Continue hydrating! 🚰';
    } else {
      return 'Time to hydrate! Start drinking! 💧';
    }
  };

  return (
    <div className="progress-card">
      <div className="date-navigation">
        <Button
          icon="pi pi-chevron-left"
          className="p-button-text p-button-rounded"
          onClick={() => setDate(new Date(date.setDate(date.getDate() - 1)))}
        />
        <h2 className="date-header">{formattedDate}</h2>
        <Button
          icon="pi pi-chevron-right"
          className="p-button-text p-button-rounded"
          onClick={() => setDate(new Date(date.setDate(date.getDate() + 1)))}
        />
      </div>

      <div className="progress-center">
        <WaterWave progress={progress} current={todayTotal} goal={dailyGoal} />
      </div>

      <div className="motivational-message">{getMotivationalMessage()}</div>

      <div className="todays-drinks-link">
        <Button
          label="See your drinks ›"
          className="p-button-text p-button-plain"
          style={{ color: '#00BCD4' }}
          onClick={() =>
            document
              .getElementById('today-intakes')
              ?.scrollIntoView({ behavior: 'smooth' })
          }
        />
      </div>
    </div>
  );
};

export default WaterProgress;
