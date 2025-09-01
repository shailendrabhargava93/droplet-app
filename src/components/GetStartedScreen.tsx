import React, { useState } from 'react';
import { useWaterContext } from '../context/WaterContext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { useNotifications } from '../hooks/useReminders';
import { useToast } from '../context/ToastContext';
import '../styles/getStarted.css';

const GetStartedScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { updateDailyGoal } = useWaterContext();
  const { requestPermission } = useNotifications();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionAsked, setPermissionAsked] = useState(false);

  const DropletLogo = () => (
    <div className="logo-container">
      <img src="/icon.svg" alt="Droplet Logo" className="app-logo" />
      <div className="app-name">Droplet</div>
    </div>
  );

  const steps = [
    {
      title: "Welcome to Droplet! 💧",
      description: "Your personal hydration companion. Let's get you set up with a few quick steps.",
      icon: "pi pi-heart"
    },
    {
      title: "Set Your Daily Goal",
      description: "The recommended water intake is 2-3 liters per day. We'll start you with 2L, but you can adjust this anytime.",
      icon: "pi pi-flag"
    },
    {
      title: "Track Your Progress",
      description: "Add water whenever you drink, and we'll help you stay on track throughout the day.",
      icon: "pi pi-chart-line"
    },
    {
      title: "Stay Motivated",
      description: "Get gentle reminders to help you build a healthy hydration habit.",
      icon: "pi pi-bell"
    }
  ];

  const handleComplete = async () => {
    // Set initial daily goal
    updateDailyGoal(2000);
    
    // Check if we've already asked for permission
    if (!permissionAsked && 'Notification' in window && Notification.permission === 'default') {
      setShowPermissionDialog(true);
    } else {
      // If we've already asked or notifications aren't supported, complete onboarding
      finishOnboarding();
    }
  };

  const finishOnboarding = () => {
    // Mark onboarding as complete
    localStorage.setItem('onboardingComplete', 'true');
    
    // Call the completion callback
    onComplete();
  };

  const handlePermissionRequest = async () => {
    setPermissionAsked(true);
    setShowPermissionDialog(false);
    
    try {
      const permission = await requestPermission();
      
      if (permission === 'granted') {
        toast.showSuccess(
          'Notifications Enabled', 
          'You will now receive hydration reminders!'
        );
      } else {
        toast.showInfo(
          'Notifications Disabled',
          'You can enable reminders later in Settings'
        );
      }
      
      // Complete onboarding regardless of permission result
      finishOnboarding();
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      // Complete onboarding even if there's an error
      finishOnboarding();
    }
  };

  const nextStep = () => {
    if (currentStep === steps.length - 1) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <div className="get-started-container">
      <div className="get-started-content">
        {/* Logo */}
        <DropletLogo />

        {/* Content */}
        <div className="step-content" key={currentStep}>
          <i className={`${steps[currentStep].icon} step-icon`}></i>
          <h1 className="step-title">{steps[currentStep].title}</h1>
          <p className="step-description">{steps[currentStep].description}</p>
        </div>

        {/* Navigation Container */}
        <div className="navigation-container">
          {/* Progress dots */}
          <div className="progress-dots">
            {steps.map((_, index) => (
              <div 
                key={index} 
                className={`progress-dot ${index === currentStep ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="navigation-buttons">
            {currentStep > 0 && (
              <Button 
                label="Back" 
                className="p-button-outlined" 
                onClick={() => setCurrentStep(prev => prev - 1)}
                style={{ 
                  borderColor: '#00BCD4', 
                  color: '#00BCD4',
                  minWidth: '100px'
                }}
              />
            )}
            <Button 
              label={currentStep === steps.length - 1 ? "Get Started" : "Next"} 
              className="p-button-primary" 
              onClick={nextStep}
              style={{ 
                backgroundColor: '#00BCD4', 
                border: 'none',
                minWidth: '100px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Notification Permission Dialog */}
      <Dialog
        visible={showPermissionDialog}
        onHide={() => finishOnboarding()}
        header="Enable Notifications"
        draggable={false}
        resizable={false}
        className="notification-dialog"
        style={{ width: '90%', maxWidth: '450px' }}
        footer={
          <div className="dialog-footer">
            <Button 
              label="No Thanks" 
              className="p-button-text" 
              onClick={() => finishOnboarding()}
            />
            <Button 
              label="Enable Notifications" 
              onClick={handlePermissionRequest} 
              style={{ backgroundColor: '#00BCD4', border: 'none' }}
            />
          </div>
        }
      >
        <div className="notification-dialog-content">
          <i className="pi pi-bell" style={{ fontSize: '2rem', color: '#00BCD4', marginBottom: '1rem' }}></i>
          <p>
            Would you like to receive reminders to stay hydrated throughout the day?
          </p>
          <p>
            You can always change this setting later in the app.
          </p>
        </div>
      </Dialog>
    </div>
  );
};

export default GetStartedScreen;
