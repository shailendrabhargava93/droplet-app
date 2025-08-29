import React from 'react';

const Header: React.FC = () => {
  return (
    <div className="app-header">
      <div className="logo-container">
        <img src="/icon.svg" alt="Droplet Logo" className="app-logo" />
        <h1 className="app-name">Droplet</h1>
      </div>
    </div>
  );
};

export default Header;
