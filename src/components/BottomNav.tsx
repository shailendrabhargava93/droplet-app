import React from 'react';
import { Button } from 'primereact/button';

type Tab = 'stats' | 'add' | 'settings';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="bottom-nav-container">
      <div className="bottom-nav">
        <div
          className={`bottom-nav-item ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => onTabChange('stats')}
        >
          <i className="pi pi-calendar bottom-nav-icon"></i>
          <span className="bottom-nav-label">Today</span>
        </div>

        <div className="bottom-nav-center">
          <Button
            icon="pi pi-plus"
            className="p-button-rounded add-button"
            onClick={() => onTabChange('add')}
            style={{ backgroundColor: '#00BCD4' }}
          />
        </div>

        <div
          className={`bottom-nav-item ${
            activeTab === 'settings' ? 'active' : ''
          }`}
          onClick={() => onTabChange('settings')}
        >
          <i className="pi pi-cog bottom-nav-icon"></i>
          <span className="bottom-nav-label">Settings</span>
        </div>
      </div>
    </div>
  );
};
