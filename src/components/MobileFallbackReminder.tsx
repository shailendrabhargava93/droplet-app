import React, { useEffect, useState, useRef } from 'react';
import { useNotifications } from '../hooks/useReminders';
import { useToast } from '../context/ToastContext';
import { isMobile, areNotificationsSupported } from '../utils/mobileNotifications';

interface MobileReminderProps {
  onReminderTriggered?: () => void;
}

const MobileFallbackReminder: React.FC<MobileReminderProps> = ({ onReminderTriggered }) => {
  const { sendNotification } = useNotifications();
  const toast = useToast();
  const [activeIntervals, setActiveIntervals] = useState<number[]>([]);
  const [reminderInterval, setReminderInterval] = useState<number | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const lastReminderTime = useRef<number>(0);
  
  // Listen for setup requests
  useEffect(() => {
    const handleSetupRequest = (event: Event) => {
      const customEvent = event as CustomEvent<{interval: number}>;
      setReminderInterval(customEvent.detail.interval);
      setIsEnabled(true);
      
      toast.showInfo(
        'Reminder Mode', 
        'Using app-based reminders because notification permissions are unavailable.'
      );
    };
    
    const handleClearRequest = () => {
      setIsEnabled(false);
      clearAllIntervals();
    };
    
    window.addEventListener('setupMobileFallbackReminder', handleSetupRequest);
    window.addEventListener('clearMobileFallbackReminder', handleClearRequest);
    
    return () => {
      window.removeEventListener('setupMobileFallbackReminder', handleSetupRequest);
      window.removeEventListener('clearMobileFallbackReminder', handleClearRequest);
    };
  }, [toast]);
  
  // Set up or clear intervals when settings change
  useEffect(() => {
    // Clear any existing intervals
    clearAllIntervals();
    
    // Set up new interval if enabled
    if (isEnabled && reminderInterval) {
      const intervalMs = reminderInterval * 60 * 1000;
      
      // Set initial timer
      const now = Date.now();
      const timeSinceLastReminder = lastReminderTime.current > 0 ? now - lastReminderTime.current : intervalMs;
      const initialDelay = Math.max(0, intervalMs - timeSinceLastReminder);
      
      // Set the first reminder
      const initialTimer = setTimeout(() => {
        triggerReminder();
        
        // Then set up recurring reminders
        const recurringTimer = setInterval(triggerReminder, intervalMs);
        setActiveIntervals(prev => [...prev, recurringTimer]);
      }, initialDelay);
      
      setActiveIntervals([initialTimer]);
    }
    
    return clearAllIntervals;
    
  }, [isEnabled, reminderInterval]);
  
  // Cleanup on unmount
  useEffect(() => {
    return clearAllIntervals;
  }, []);
  
  const clearAllIntervals = () => {
    activeIntervals.forEach(interval => clearTimeout(interval));
    setActiveIntervals([]);
  };
  
  const triggerReminder = () => {
    // Update last reminder time
    lastReminderTime.current = Date.now();
    
    // Send the notification
    sendNotification('Time to Drink Water! 💧', {
      body: "Don't forget to stay hydrated!",
      tag: 'water-reminder',
    });
    
    // Call the callback if provided
    if (onReminderTriggered) {
      onReminderTriggered();
    }
  };
  
  // This is a non-visual component
  return null;
};

const MobileReminderWrapper: React.FC<MobileReminderProps> = (props) => {
  // Only render for mobile browsers where notifications aren't supported
  if (isMobile() && !areNotificationsSupported()) {
    return <MobileFallbackReminder {...props} />;
  }
  
  return null;
};

export default MobileReminderWrapper;
