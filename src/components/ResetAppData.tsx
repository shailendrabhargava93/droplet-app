import React, { useState } from 'react';
import { useWaterContext } from '../context/WaterContext';
import { useReminders } from '../hooks/useReminders';
import { Button } from 'primereact/button';

const ResetAppData: React.FC = () => {
  const [showDialog, setShowDialog] = useState(false);
  const { updateDailyGoal } = useWaterContext();
  const { removeReminder } = useReminders();

  const handleReset = () => {
    setShowDialog(true);
  };

  const confirmReset = () => {
    // Reset all data
    localStorage.clear(); // Clear all localStorage data
    
    // Reset water intakes and daily goal
    localStorage.setItem('waterIntakes', '[]');
    localStorage.setItem('dailyGoal', '2000');
    updateDailyGoal(2000);
    
    // Reset reminders
    localStorage.setItem('reminders', '[]');
    removeReminder('1'); // Remove the default reminder
    
    // Reset unit preferences
    localStorage.setItem('unit', 'ml');
    
    // Hide dialog
    setShowDialog(false);
    
    // Reload the app to ensure all states are fresh
    window.location.reload();
  };

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <i
          className="pi pi-trash settings-icon"
          style={{ color: '#00BCD4' }}
        ></i>
        <h3>Reset Data</h3>
      </div>

      <div className="share-content">
        <p className="share-description">
          Need to start fresh? You can reset all your data and settings here.
        </p>

        <div className="share-actions">
          <Button
            label="Reset Data"
            icon="pi pi-trash"
            className="share-button"
            onClick={handleReset}
            style={{ backgroundColor: '#00BCD4', border: 'none' }}
          />
        </div>
      </div>

      {showDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="settings-section" style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}>
            <div className="settings-section-header">
              <i className="pi pi-exclamation-triangle" style={{ color: '#00BCD4' }}></i>
              <h3>Confirm Reset</h3>
            </div>
            
            <div className="share-content">
              <p className="share-description">
                This action will reset all
              </p>
              
              <ul className="share-description" style={{ 
                listStyleType: 'disc',
                marginBottom: '16px',
              }}>
                <li>Water intake history</li>
                <li>Daily goal settings</li>
                <li>Reminder settings</li>
                <li>Unit preferences</li>
              </ul>
              
              <p style={{ 
                color: '#ff5722',
                marginBottom: '20px',
                fontSize: '0.9rem',
                fontWeight: '500',
              }}>
                Warning: This action cannot be undone!
              </p>

              <div className="share-actions" style={{ 
                display: 'flex',
                gap: '12px'
              }}>
                <Button
                  label="Cancel"
                  className="p-button-text"
                  onClick={() => setShowDialog(false)}
                />
                <Button
                  label="Reset All"
                  icon="pi pi-trash"
                  onClick={confirmReset}
                  style={{ backgroundColor: '#00BCD4', border: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResetAppData;
