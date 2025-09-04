import React, { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useReminders';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import { useToast } from '../context/ToastContext';
import { areNotificationsSupported } from '../utils/mobileNotifications';
import NotificationSetupModal from './NotificationSetupModal';
import '../styles/notificationSetup.css';
import '../styles/reminderSettings.css';

interface FrequencyOption {
  label: string;
  value: number;
}

const ReminderSettings: React.FC = () => {
  const { scheduleReminder, swReady, requestPermission } = useNotifications();
  const toast = useToast();
  if (!toast) throw new Error('Toast context not found');

  // Reminder state
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("remindersEnabled");
    return saved ? JSON.parse(saved) : false;
  });

  // Frequency state and options
  const [selectedFrequency, setSelectedFrequency] = useState<number>(() => {
    const saved = localStorage.getItem("reminderFrequency");
    return saved ? Number(saved) : 30;
  });

  const frequencyOptions: FrequencyOption[] = [
    { label: "15 minutes", value: 15 },
    { label: "30 minutes", value: 30 },
    { label: "45 minutes", value: 45 },
    { label: "1 hour", value: 60 },
    { label: "2 hours", value: 120 }
  ];

  // Modal state
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean>(() => {
    return localStorage.getItem("notificationSetupComplete") === "true";
  });

  // Times from local storage (read-only after setup)
  const [startTime, setStartTime] = useState<Date>(() => {
    const saved = localStorage.getItem("reminderStartTime");
    return saved ? new Date(saved) : new Date();
  });

  const [endTime, setEndTime] = useState<Date>(() => {
    const saved = localStorage.getItem("reminderEndTime");
    return saved ? new Date(saved) : new Date();
  });


  // Schedule notifications when enabled
  useEffect(() => {
    if (remindersEnabled && hasCompletedSetup) {
      // Get next notification time based on current time and selected hours
      const now = new Date();
      const currentTimeAsMinutes = now.getHours() * 60 + now.getMinutes();
      const startTimeAsMinutes = startTime.getHours() * 60 + startTime.getMinutes();
      const endTimeAsMinutes = endTime.getHours() * 60 + endTime.getMinutes();

      // Store user's selected times for display
      localStorage.setItem("reminderStartTime", startTime.toISOString());
      localStorage.setItem("reminderEndTime", endTime.toISOString());
      
      // If current time is past end time, schedule for tomorrow
      if (currentTimeAsMinutes >= endTimeAsMinutes) {
        scheduleReminder(selectedFrequency);
        return;
      }

      // If current time is before start time, schedule will begin at start time
      if (currentTimeAsMinutes < startTimeAsMinutes) {
        scheduleReminder(selectedFrequency);
        return;
      }

      // If within active hours, start from next interval
      scheduleReminder(selectedFrequency);
    }
  }, [remindersEnabled, hasCompletedSetup, selectedFrequency]);

  // Handle enabling/disabling reminders
  const handleReminderToggle = async (enabled: boolean) => {
    if (enabled && !hasCompletedSetup) {
      const permission = await requestPermission();
      if (permission === 'granted') {
        setShowSetupModal(true);
      } else {
        toast.showError(
          'Permission Denied',
          'Please enable notifications in your browser settings to use reminders.'
        );
      }
      return;
    }

    setRemindersEnabled(enabled);
    localStorage.setItem("remindersEnabled", JSON.stringify(enabled));

    if (enabled) {
      // Store the selected times
      localStorage.setItem("reminderStartTime", startTime.toISOString());
      localStorage.setItem("reminderEndTime", endTime.toISOString());
      
      // Schedule notifications
      scheduleReminder(selectedFrequency);

      const now = new Date();
      const currentTimeAsMinutes = now.getHours() * 60 + now.getMinutes();
      const endTimeAsMinutes = endTime.getHours() * 60 + endTime.getMinutes();

      // If current time is past end time, notify user about tomorrow's schedule
      if (currentTimeAsMinutes >= endTimeAsMinutes) {
        toast.showInfo(
          'Schedule Set',
          'Notifications will begin tomorrow at your selected time.'
        );
      }
    }
  };

  // Handle frequency changes
  const handleFrequencyChange = (value: number) => {
    setSelectedFrequency(value);
    localStorage.setItem("reminderFrequency", value.toString());
    
    if (remindersEnabled) {
      // Service worker will read start/end times from localStorage
      scheduleReminder(value);
      toast.showSuccess('Frequency Updated', 'Your reminder frequency has been updated.');
    }
  };

  // Handle modal close
  const handleSetupComplete = (newStartTime: Date, newEndTime: Date) => {
    // Save setup state and times exactly as selected by user
    localStorage.setItem("notificationSetupComplete", "true");
    localStorage.setItem("reminderStartTime", newStartTime.toISOString());
    localStorage.setItem("reminderEndTime", newEndTime.toISOString());
    
    // Update UI with user's selected times
    setStartTime(newStartTime);
    setEndTime(newEndTime);
    setHasCompletedSetup(true);
    setShowSetupModal(false);
    setRemindersEnabled(true);
    localStorage.setItem("remindersEnabled", "true");
    
    // Schedule notifications
    scheduleReminder(selectedFrequency);

    // Check if notifications will start tomorrow
    const now = new Date();
    const currentTimeAsMinutes = now.getHours() * 60 + now.getMinutes();
    const endTimeAsMinutes = newEndTime.getHours() * 60 + newEndTime.getMinutes();

    if (currentTimeAsMinutes >= endTimeAsMinutes) {
      toast.showInfo(
        'Schedule Set',
        'Notifications will begin tomorrow at your selected time.'
      );
    }
  };

  // Check if notifications are supported
  const notificationsSupported = areNotificationsSupported();

  return (
    <div className="settings-section reminder-settings">
      <NotificationSetupModal 
        visible={showSetupModal}
        onHide={() => setShowSetupModal(false)}
        onSetup={handleSetupComplete}
      />
      
      <div className="settings-card">
        <div className="settings-section-header">
          <i className="pi pi-bell"></i>
          <h3>Reminders</h3>
        </div>
        
        {notificationsSupported && (
          <div className="enable-reminder">
            <label>Enable Reminders</label>
            <InputSwitch
              checked={remindersEnabled}
              onChange={(e) => handleReminderToggle(e.value)}
              disabled={!swReady}
            />
          </div>
        )}

        {!notificationsSupported && (
          <p className="notification-warning">
            Notifications are not supported in your browser.
          </p>
        )}

        {notificationsSupported && hasCompletedSetup && remindersEnabled && (
          <>
            <div className="settings-row">
              <label>Frequency</label>
              <Dropdown
                value={selectedFrequency}
                options={frequencyOptions}
                onChange={(e) => handleFrequencyChange(e.value)}
                className="frequency-dropdown"
              />
            </div>

            <div className="settings-row">
              <label>Active Hours</label>
              <div className="time-display">
                <span>
                  {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </>
        )}

        {notificationsSupported && hasCompletedSetup && !remindersEnabled && (
          <p className="reminder-status">
            Enable reminders to get notifications throughout the day.
          </p>
        )}

        {notificationsSupported && !hasCompletedSetup && (
          <p className="reminder-status">
            Enable reminders to set up your notification schedule.
          </p>
        )}
      </div>
    </div>
  );
};

export default ReminderSettings;
