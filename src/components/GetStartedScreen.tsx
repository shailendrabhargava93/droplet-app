import React, { useState } from 'react';
import { useWaterContext } from '../context/WaterContext';
import { Button } from 'primereact/button';
import '../styles/getStarted.css';

const GetStartedScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { updateDailyGoal } = useWaterContext();
  const [currentStep, setCurrentStep] = useState(0);

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

  const handleComplete = () => {
    // Set initial daily goal
    updateDailyGoal(2000);
    
    // Mark onboarding as complete
    localStorage.setItem('onboardingComplete', 'true');
    
    // Call the completion callback
    onComplete();
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
    </div>
  );
};

export default GetStartedScreen;
