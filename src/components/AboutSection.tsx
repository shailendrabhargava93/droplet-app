import React from 'react';

const AboutSection: React.FC = () => {
  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <i
          className="pi pi-info-circle settings-icon"
          style={{ color: '#00BCD4' }}
        ></i>
        <h3>About Droplet</h3>
      </div>

      <div className="about-content">
        <p className="about-description">
          Droplet helps you stay hydrated throughout the day with beautiful
          visualizations and gentle reminders. Track your water intake and build
          healthy hydration habits.
        </p>

        <p className="about-version">Version 1.0.0</p>

        <p className="about-love">Built with ❤️ for better hydration</p>
      </div>
    </div>
  );
};

export default AboutSection;
