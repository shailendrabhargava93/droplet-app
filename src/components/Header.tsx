import React from 'react';
import PWAInstallPrompt from './PWAInstallPrompt';

const Header: React.FC = () => {
  return (
    <div className="app-header">
      <div className="logo-container">
        <img src="/icon.svg" alt="Droplet Logo" className="app-logo" />
        <h1 className="app-name">Droplet</h1>
      </div>
      <div style={{ marginLeft: 'auto' }}>
        <PWAInstallPrompt />
      </div>
    </div>
  );
};

export default Header;
