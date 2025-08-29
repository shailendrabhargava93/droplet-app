import React from 'react';
import { useWaterContext } from '../context/WaterContext';
import { useUnitContext } from '../context/UnitContext';

const TodayIntakes: React.FC = () => {
  const { formatAmount } = useUnitContext();
  const { waterIntakes } = useWaterContext();

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

  // Get beverage icon based on type
  const getBeverageIconSrc = (type: string) => {
    switch (type) {
      case 'water':
        return 'https://cdn-icons-png.flaticon.com/512/824/824239.png';
      case 'coffee':
        return 'https://cdn-icons-png.flaticon.com/512/751/751621.png';
      case 'tea':
        return 'https://cdn-icons-png.flaticon.com/512/12257/12257379.png';
      case 'juice':
        return 'https://cdn-icons-png.flaticon.com/512/3165/3165589.png';
      case 'milk':
        return 'https://cdn-icons-png.flaticon.com/512/3528/3528201.png';
      case 'soda':
        return 'https://cdn-icons-png.flaticon.com/512/734/734748.png';
      default:
        return 'https://cdn-icons-png.flaticon.com/512/824/824239.png';
    }
  };

  // Format date to display only the time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get beverage class based on type
  const getBeverageClass = (type: string) => {
    switch (type) {
      case 'water':
        return 'beverage-water';
      case 'coffee':
        return 'beverage-coffee';
      case 'tea':
        return 'beverage-tea';
      case 'juice':
        return 'beverage-juice';
      default:
        return 'beverage-water';
    }
  };

  return (
    <div id="today-intakes" className="today-intakes-card">
      <h2 className="today-drinks-title">Today's drinks</h2>

      {todayIntakes.length > 0 ? (
        <div className="drinks-list">
          {todayIntakes.map((intake) => (
            <div key={intake.id} className="drink-item">
              <div className="drink-icon-container">
                <div
                  className={`drink-icon slim ${getBeverageClass(
                    intake.beverageType
                  )}`}
                >
                  <img
                    src={getBeverageIconSrc(intake.beverageType)}
                    alt={intake.beverageType}
                    className="drink-svg-icon small"
                  />
                </div>
              </div>
              <div className="drink-details">
                <div className="drink-info">
                  <span className="drink-type">
                    {intake.beverageType.charAt(0).toUpperCase() +
                      intake.beverageType.slice(1)}
                  </span>
                  <span className="drink-time">
                    {formatTime(intake.timestamp)}
                  </span>
                </div>
              </div>
              <div className="drink-amount">
                <span>{formatAmount(intake.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-drinks-message">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,17L12,17c-0.55,0-1-0.45-1-1v-4c0-0.55,0.45-1,1-1h0 c0.55,0,1,0.45,1,1v4C13,16.55,12.55,17,12,17z M13,9h-2V7h2V9z" />
          </svg>
          <p>No drinks added today</p>
        </div>
      )}
    </div>
  );
};

export default TodayIntakes;
