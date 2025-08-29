import React from 'react';
import DailyGoalSettings from './DailyGoalSettings';
import ReminderSettings from './ReminderSettings';
import UnitSettings from './UnitSettings';
import ShareApp from './ShareApp';
import AboutSection from './AboutSection';
import ResetAppData from './ResetAppData';

const SettingsScreen: React.FC = () => {
  return (
    <div className="settings-container">
      <h2 className="settings-title">Settings</h2>

      <DailyGoalSettings />
      <ReminderSettings />
      <UnitSettings />
      <ShareApp />
      <AboutSection />
      <ResetAppData />
    </div>
  );
};

export default SettingsScreen;
