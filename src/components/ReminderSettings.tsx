import React, { useState, useEffect } from 'react';
import { useNotifications, useReminders } from '../hooks/useReminders';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import { useToast } from '../context/ToastContext';
import { areNotificationsSupported } from '../utils/mobileNotifications';

interface FrequencyOption {
  label: string;
  value: number;
}

const ReminderSettings: React.FC = () => {
  const { requestPermission, scheduleReminder, swReady, pingServiceWorker } =
    useNotifications();
  const { reminders, addReminder, removeReminder } = useReminders();
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('remindersEnabled');
    return saved ? JSON.parse(saved) : false;
  });
  const [selectedFrequency, setSelectedFrequency] = useState<number>(() => {
    // Initialize from reminders if available
    const savedReminders = localStorage.getItem('reminders');
    if (savedReminders) {
      const parsedReminders = JSON.parse(savedReminders);
      if (parsedReminders.length > 0) {
        return parsedReminders[0].interval;
      }
    }
    return 30; // Default value
  });
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState<boolean>(false);
  const toast = useToast();

  const frequencyOptions: FrequencyOption[] = [
    { label: 'Every 1 minute (for testing)', value: 1 },
    { label: 'Every 15 minutes', value: 15 },
    { label: 'Every 30 minutes', value: 30 },
    { label: 'Every 45 minutes', value: 45 },
    { label: 'Every hour', value: 60 },
    { label: 'Every 2 hours', value: 120 },
    { label: 'Every 3 hours', value: 180 },
  ];

  useEffect(() => {
    localStorage.setItem('remindersEnabled', JSON.stringify(remindersEnabled));

    // We don't need to schedule reminders here since it's handled in handleToggleReminders
    // This was causing duplicate toasts/notifications
  }, [remindersEnabled]);

  // Listen for messages from the service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      console.log('Message from service worker in ReminderSettings:', data);

      // Handle specific messages
      if (data.type === 'REMINDER_STARTED') {
        toast.showSuccess(
          'Reminder Active',
          `Hydration reminders set for every ${data.minutes} minute(s)`
        );
      } else if (data.type === 'REMINDER_STOPPED') {
        toast.showInfo(
          'Reminder Stopped',
          'This hydration reminder has been deactivated'
        );
      } else if (data.type === 'ALL_REMINDERS_STOPPED') {
        toast.showInfo(
          'All Reminders Stopped',
          'All hydration reminders have been deactivated'
        );
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [toast]);

  // Request permission if not already granted when enabling reminders
  const handleToggleReminders = async (value: boolean) => {
    if (value) {
      // Check if we can create notifications
      if (!('Notification' in window)) {
        toast.showError(
          'Notifications Not Supported',
          'Your browser does not support notifications'
        );
        return;
      }

      // Check if service worker is available
      if (!swReady) {
        toast.showInfo(
          'Preparing Reminders',
          'Please wait a moment while we set things up...'
        );

        // Try to ping service worker
        pingServiceWorker();

        // Wait briefly and check again
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Last resort - reload the page
        if (!navigator.serviceWorker.controller) {
          toast.showInfo(
            'Activating Reminder System',
            'Reloading page to activate reminders...'
          );
          setTimeout(() => window.location.reload(), 2000);
          return;
        }
      }

      // Check current permission state before requesting
      let permissionGranted = false;
      
      // Only ask for permission if it's not already granted or denied
      if (Notification.permission === 'granted') {
        permissionGranted = true;
      } else if (Notification.permission === 'default') {
        // Request notification permission only if not yet decided
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }

      if (permissionGranted) {
        setRemindersEnabled(true);

        // Only process reminders if we weren't already enabled
        // This prevents duplicate messages when the toggle is clicked multiple times

        // Add or update reminder with selected frequency
        // First remove any existing reminders (to ensure we only have one)
        if (reminders.length > 0) {
          removeReminder('any'); // The id doesn't matter as we're clearing all
        }

        // Add the new reminder to local state
        addReminder(selectedFrequency);

        // Schedule with service worker - don't show toast here as the service worker will send a message back
        const scheduled = scheduleReminder(selectedFrequency);

        if (!scheduled) {
          // Only show toast for failures
          toast.showWarn(
            'Reminder Setup Issue',
            'There was an issue setting up your reminder. Try reloading the page.'
          );
        }
        // Success toast will come from the service worker message
      } else {
        toast.showWarn(
          'Notifications Blocked',
          'Please enable notifications in your browser settings to use reminders'
        );
        setRemindersEnabled(false);
      }
    } else {
      // Disable all reminders
      setRemindersEnabled(false);

      // Tell service worker to stop all reminders
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'STOP_ALL_REMINDERS',
        });
        // Don't show toast here, the service worker will send a message back that will trigger the toast
      }
    }
  };

  // Get device notification capability information
  const { isIOSDevice, isPWAMode } = useNotifications();
  const canUseNotifications = areNotificationsSupported();

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <i
          className="pi pi-bell settings-icon"
          style={{ color: '#00BCD4' }}
        ></i>
        <h3>Reminder</h3>
      </div>
      
      {/* Device notification support information */}
      {isIOSDevice && !isPWAMode && (
        <div className="notification-support-info">
          <i className="pi pi-info-circle" style={{ marginRight: '8px', color: '#00BCD4' }}></i>
          <p>For the best experience with notifications on iOS, please install this app to your home screen.</p>
        </div>
      )}
      
      {!canUseNotifications && (
        <div className="notification-support-info">
          <i className="pi pi-info-circle" style={{ marginRight: '8px', color: '#ff9800' }}></i>
          <p>Your browser has limited notification support. The app will use in-app reminders when possible.</p>
        </div>
      )}

      <div className="setting-row">
        <div className="setting-label">
          <span>Enable Reminder</span>
        </div>
        <div className="setting-control">
          <InputSwitch
            checked={remindersEnabled}
            onChange={(e) => handleToggleReminders(e.value as boolean)}
          />
        </div>
      </div>

      {remindersEnabled && (
        <>
          <div className="reminder-times">
            {reminders.length > 0 ? (
              <div className="reminder-item">
                <div className="reminder-time">
                  <i className="pi pi-clock" style={{ marginRight: '8px' }}></i>
                  Every {reminders[0].interval} minutes
                </div>
                <button 
                  className="p-button p-button-text p-button-sm" 
                  onClick={() => setShowFrequencyDropdown(true)}
                >
                  <i className="pi pi-pencil" style={{ marginRight: '4px' }}></i>
                  Change
                </button>
              </div>
            ) : (
              <div className="reminder-item">
                <div className="reminder-time">
                  <i className="pi pi-clock" style={{ marginRight: '8px' }}></i>
                  Every {selectedFrequency} minutes
                </div>
                <button 
                  className="p-button p-button-text p-button-sm" 
                  onClick={() => setShowFrequencyDropdown(true)}
                >
                  <i className="pi pi-pencil" style={{ marginRight: '4px' }}></i>
                  Change
                </button>
              </div>
            )}
          </div>

          {showFrequencyDropdown && (
            <div className="frequency-selection">
              <p className="mb-2">Select new reminder frequency:</p>
              <Dropdown
                value={selectedFrequency}
                options={frequencyOptions}
                onChange={(e) => {
                  const interval = e.value;
                  setSelectedFrequency(interval);
                  
                  if (Notification.permission === 'granted') {
                    // Update the reminder
                    addReminder(interval);

                    // Check if service worker is ready
                    if (swReady && navigator.serviceWorker.controller) {
                      // Schedule with service worker
                      navigator.serviceWorker.controller.postMessage({
                        type: 'START_REMINDER',
                        id: `reminder-${Date.now()}`,
                        minutes: interval,
                      });

                      // Hide dropdown after successful update
                      setShowFrequencyDropdown(false);
                      
                      // Don't show toast here - the service worker will send a message that will trigger the toast
                    } else {
                      toast.showWarn(
                        'Service Worker Not Ready',
                        'Please try reloading the page to enable reminders'
                      );
                    }
                  } else {
                    toast.showWarn(
                      'Notification Permission Required',
                      'Please allow notifications to set reminders'
                    );
                  }
                }}
                placeholder="Select reminder frequency"
                className="w-full mb-2"
              />
              <div className="frequency-actions">
                <button 
                  className="p-button p-button-outlined p-button-sm" 
                  onClick={() => setShowFrequencyDropdown(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <p className="reminder-help-text">
            You'll receive notifications to help you stay hydrated.
          </p>
        </>
      )}
    </div>
  );
};

export default ReminderSettings;
