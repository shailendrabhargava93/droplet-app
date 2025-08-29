// Format date for display
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

// Format amount in ml or L
export const formatAmount = (amount: number): string => {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}L`;
  }
  return `${amount}ml`;
};

// Get water icon based on progress
export const getWaterLevelIcon = (progress: number): string => {
  if (progress <= 20) return 'water-level-1';
  if (progress <= 40) return 'water-level-2';
  if (progress <= 60) return 'water-level-3';
  if (progress <= 80) return 'water-level-4';
  return 'water-level-5';
};

// Group intakes by date
export const groupIntakesByDate = (intakes: any[]): Record<string, any[]> => {
  return intakes.reduce((grouped, intake) => {
    const date = new Date(intake.timestamp);
    const dateStr = `${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}`;

    if (!grouped[dateStr]) {
      grouped[dateStr] = [];
    }

    grouped[dateStr].push(intake);
    return grouped;
  }, {});
};

// Register service worker for PWA
export const registerServiceWorker =
  async (): Promise<ServiceWorkerRegistration | null> => {
    if ('serviceWorker' in navigator) {
      try {
        // First, unregister any existing service workers to ensure clean state
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
          console.log('Unregistered existing service worker');
        }

        // Register the service worker with more options
        const registration = await navigator.serviceWorker.register(
          '/service-worker.js',
          {
            scope: '/',
            updateViaCache: 'none', // Never use cache for updates
          }
        );

        console.log(
          'Service worker registered successfully with scope:',
          registration.scope
        );

        // Force the service worker to activate immediately
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Function to check controller and send reminders
        const setupServiceWorker = async () => {
          // Wait for the service worker to be ready
          await navigator.serviceWorker.ready;
          console.log('Service worker is active and ready');

          // Wait a bit to ensure it's fully activated
          setTimeout(() => {
            // Load any existing reminders from localStorage
            const remindersData = localStorage.getItem('reminders');
            if (!remindersData) return;

            try {
              const reminders = JSON.parse(remindersData);
              const remindersEnabled = JSON.parse(
                localStorage.getItem('remindersEnabled') || 'false'
              );

              // If we have an active service worker, reminders, and they're enabled, send them
              if (
                navigator.serviceWorker.controller &&
                reminders.length > 0 &&
                remindersEnabled
              ) {
                console.log(
                  'Sending existing reminders to service worker:',
                  reminders
                );

                // Filter to only enabled reminders
                const enabledReminders = reminders.filter(
                  (r: any) => r.enabled
                );

                navigator.serviceWorker.controller.postMessage({
                  type: 'SCHEDULE_REMINDERS',
                  reminders: enabledReminders,
                });

                console.log('Reminders sent to service worker');
              }
            } catch (e) {
              console.error('Error parsing reminders data:', e);
            }
          }, 1000);
        };

        // If we already have a controller, set up immediately
        if (navigator.serviceWorker.controller) {
          await setupServiceWorker();
        } else {
          // Otherwise, wait for the controllerchange event
          navigator.serviceWorker.addEventListener(
            'controllerchange',
            setupServiceWorker,
            { once: true }
          );
        }

        return registration;
      } catch (error) {
        console.error('Service worker registration failed:', error);
        return null;
      }
    }
    return null;
  };
