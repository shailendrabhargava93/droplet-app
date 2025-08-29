import React from 'react';
import { Button } from 'primereact/button';

const ShareApp: React.FC = () => {
  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Droplet - Water Tracker',
          text: 'Check out Droplet, a beautiful app to track your water intake!',
          url: window.location.href,
        })
        .then(() => console.log('Successful share'))
        .catch((error) => console.log('Error sharing', error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      // Copy to clipboard instead
      navigator.clipboard
        .writeText(
          `Check out Droplet, a beautiful app to track your water intake! ${window.location.href}`
        )
        .then(() => {
          alert('Link copied to clipboard! Share it with your friends.');
        });
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <i
          className="pi pi-share-alt settings-icon"
          style={{ color: '#00BCD4' }}
        ></i>
        <h3>Share App</h3>
      </div>

      <div className="share-content">
        <p className="share-description">
          Love Droplet? Share it with your friends and family to help them stay
          hydrated too!
        </p>

        <div className="share-actions">
          <Button
            label="Share Droplet"
            icon="pi pi-share-alt"
            className="share-button"
            onClick={handleShare}
            style={{ backgroundColor: '#00BCD4', border: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};

export default ShareApp;
