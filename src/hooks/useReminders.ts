import { useState, useEffect, useCallback } from 'react';

interface Reminder {
  id: string;
  interval: number; // interval in minutes
  enabled: boolean;
  lastTriggered?: number; // timestamp of last notification
}

export const useReminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const savedReminders = localStorage.getItem('reminders');
    return savedReminders
      ? JSON.parse(savedReminders)
      : [{ id: '1', interval: 30, enabled: true, lastTriggered: 0 }];
  });

  useEffect(() => {
    localStorage.setItem('reminders', JSON.stringify(reminders));
  }, [reminders]);

  const addReminder = (interval: number) => {
    // Only allow one reminder at a time - replace the existing one
    const newReminder = {
      id: Date.now().toString(),
      interval,
      enabled: true,
      lastTriggered: Date.now(),
    };

    // Replace the existing reminder(s) with the new one
    setReminders([newReminder]);
  };

  const scheduleNotification = useCallback((interval: number, enabled: boolean) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: enabled ? 'START_REMINDER' : 'STOP_ALL_REMINDERS',
        id: 'reminder-1',
        minutes: interval
      });
    }
  }, []);

  const toggleReminder = (id: string) => {
    setReminders((prev) => {
      const updatedReminders = prev.map((reminder) =>
        reminder.id === id
          ? {
              ...reminder,
              enabled: !reminder.enabled,
              lastTriggered: reminder.enabled ? undefined : Date.now(),
            }
          : reminder
      );
      
      // Get the reminder that was toggled
      const toggledReminder = updatedReminders.find(r => r.id === id);
      if (toggledReminder) {
        // Schedule or clear notification based on new enabled state
        scheduleNotification(toggledReminder.interval, toggledReminder.enabled);
      }
      
      return updatedReminders;
    });
  };

  const updateReminderInterval = (id: string, interval: number) => {
    setReminders(prev => {
      const currentReminder = prev.find(r => r.id === id);
      const wasEnabled = currentReminder?.enabled ?? false;
      
      // First stop any existing reminders
      if (wasEnabled) {
        scheduleNotification(0, false);
      }
      
      const updatedReminder = {
        id: id,
        interval,
        enabled: wasEnabled,
        lastTriggered: undefined // Reset the last triggered time
      };
      
      // If it was enabled, schedule with new interval
      if (wasEnabled) {
        scheduleNotification(interval, true);
      }
      
      return [updatedReminder];
    });
  };

  const removeReminder = (_id: string) => {
    // Stop any notifications first
    scheduleNotification(0, false);
    // Clear all reminders
    setReminders([]);
  };

  const updateLastTriggered = (id: string) => {
    setReminders((prev) =>
      prev.map((reminder) =>
        reminder.id === id
          ? { ...reminder, lastTriggered: Date.now() }
          : reminder
      )
    );
  };

  return {
    reminders,
    addReminder,
    toggleReminder,
    updateReminderInterval,
    removeReminder,
    updateLastTriggered,
  };
};

// For handling notifications
export const useNotifications = () => {
  const [permissionState, setPermissionState] =
    useState<NotificationPermission>(
      'Notification' in window ? Notification.permission : 'denied'
    );
  const [swReady, setSwReady] = useState(false);

  // Initialize and check service worker and notification permission
  useEffect(() => {
    // Function to initialize everything
    const initialize = async () => {
      // Check for notification permission
      if ('Notification' in window) {
        setPermissionState(Notification.permission);
      }

      // Check and register service worker
      if ('serviceWorker' in navigator) {
        try {
          // Register our simplified service worker
          const registration = await navigator.serviceWorker.register(
            '/simple-service-worker.js'
          );
          console.log('Service worker registered:', registration);

          // If it's active and controlling, mark as ready
          if (navigator.serviceWorker.controller) {
            console.log('Service worker is already controlling');
            setSwReady(true);
            pingServiceWorker(); // Verify it's responsive
          }

          // Listen for the controllerchange event
          const handleControllerChange = () => {
            console.log('Service worker controller changed');
            if (navigator.serviceWorker.controller) {
              setSwReady(true);
              pingServiceWorker();
            }
          };

          navigator.serviceWorker.addEventListener(
            'controllerchange',
            handleControllerChange
          );

          // Cleanup listener
          return () => {
            navigator.serviceWorker.removeEventListener(
              'controllerchange',
              handleControllerChange
            );
          };
        } catch (error) {
          console.error('Error registering service worker:', error);
        }
      }
    };

    initialize();
  }, []);

  // Listen for messages from the service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      console.log('Message received from service worker:', data);

      if (data.type === 'PONG') {
        console.log('Service worker is responsive');
        setSwReady(true);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Function to ping the service worker to check if it's responsive
  const pingServiceWorker = useCallback(() => {
    if (navigator.serviceWorker.controller) {
      console.log('Pinging service worker...');
      navigator.serviceWorker.controller.postMessage({
        type: 'PING',
        timestamp: Date.now(),
      });
    }
  }, []);

  // Request notification permission
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.error('Notifications not supported');
      return 'denied' as NotificationPermission;
    }

    try {
      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);
      setPermissionState(permission);
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied' as NotificationPermission;
    }
  };

  // Send a direct notification (not using service worker)
  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.warn('Cannot send notification: permission not granted');
      return null;
    }

    try {
      console.log('Sending direct notification:', title);
      const notification = new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        requireInteraction: true,
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  };

  // Schedule a reminder using the service worker
  const scheduleReminder = (interval: number) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.warn('Cannot schedule reminder: notifications not granted');
      return false;
    }

    if (!swReady || !navigator.serviceWorker.controller) {
      console.error('Service worker not ready. Cannot schedule reminders.');
      return false;
    }

    try {
      console.log(
        `Scheduling reminder every ${interval} minutes using service worker`
      );

      const reminderId = `reminder-${Date.now()}`;

      // Send message to service worker to start the reminder
      navigator.serviceWorker.controller.postMessage({
        type: 'START_REMINDER',
        id: reminderId,
        minutes: interval,
      });

      // Don't show a notification here - the service worker will handle this
      // and send back confirmation messages

      return true;
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      return false;
    }
  };

  return {
    permissionState,
    swReady,
    requestPermission,
    sendNotification,
    scheduleReminder,
    pingServiceWorker,
  };
};
