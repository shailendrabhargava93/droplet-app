// Simple service worker for reminder functionality
const CACHE_NAME = 'droplet-cache-v2';

// Active reminders store - mapping of ids to timers
const activeReminders = new Map();

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing new service worker...');
  // Force waiting service worker to become active
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Service worker activated');

  // Take control of all pages immediately
  event.waitUntil(self.clients.claim());

  // Notify all clients that the service worker is active
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'SW_ACTIVATED' });
    });
  });
});

// Handle messages from client
self.addEventListener('message', (event) => {
  const message = event.data;
  console.log('[ServiceWorker] Received message:', message.type);

  switch (message.type) {
    case 'PING':
      // Respond to ping to confirm service worker is running
      if (event.source) {
        event.source.postMessage({
          type: 'PONG',
          timestamp: Date.now(),
        });
      }
      break;

    case 'START_REMINDER':
      startReminder(message.id, message.minutes, event.source);
      break;

    case 'STOP_REMINDER':
      stopReminder(message.id, event.source);
      break;

    case 'STOP_ALL_REMINDERS':
      stopAllReminders(event.source);
      break;
  }
});

// Start a new reminder with the given interval
function startReminder(id, minutes, client) {
  // Stop all existing reminders first to ensure only one is active
  stopAllReminders();

  console.log(
    `[ServiceWorker] Starting reminder ${id} every ${minutes} minute(s)`
  );

  // Convert minutes to milliseconds, but use at least 10 seconds
  const interval = Math.max(minutes * 60 * 1000, 10000);

  // Create the timer
  const timerId = setInterval(() => {
    showNotification(id, minutes);
  }, interval);

  // Store it
  activeReminders.set(id, timerId);

  // Send confirmation
  if (client) {
    client.postMessage({
      type: 'REMINDER_STARTED',
      id: id,
      minutes: minutes,
    });
  }

  // Also send a test notification immediately
  setTimeout(() => {
    showTestNotification(minutes);
  }, 1000);
}

// Stop a specific reminder
function stopReminder(id, client) {
  if (activeReminders.has(id)) {
    clearInterval(activeReminders.get(id));
    activeReminders.delete(id);
    console.log(`[ServiceWorker] Stopped reminder ${id}`);

    if (client) {
      client.postMessage({
        type: 'REMINDER_STOPPED',
        id: id,
      });
    }
  }
}

// Stop all reminders
function stopAllReminders(client) {
  console.log(`[ServiceWorker] Stopping all ${activeReminders.size} reminders`);

  activeReminders.forEach((timerId, id) => {
    clearInterval(timerId);
  });

  activeReminders.clear();

  // Only send message if client is provided (when called directly, not from startReminder)
  if (client) {
    client.postMessage({
      type: 'ALL_REMINDERS_STOPPED',
    });
  }
}

// Show a hydration reminder notification
async function showNotification(id, minutes) {
  const messages = [
    `It's been ${minutes} minutes - time to drink some water!`,
    `Water break! ${minutes} minutes have passed.`,
    `Stay hydrated! Time for water.`,
    `Quick break - drink some water now!`,
    `Don't forget to hydrate!`,
  ];

  const title = '💧 Hydration Time!';
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  try {
    // Use a consistent tag for regular reminders to prevent multiple notifications
    // when the frequency is changed
    await self.registration.showNotification(title, {
      body: randomMessage,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'hydration-reminder', // Fixed tag to prevent duplicates
      renotify: true, // This will make the notification reappear even with the same tag
      requireInteraction: true,
      vibrate: [100, 50, 100], // Vibration pattern
      data: {
        timestamp: Date.now(),
        id: id,
        minutes: minutes,
        url: self.location.origin,
      },
    });
    console.log('[ServiceWorker] Notification sent');
  } catch (error) {
    console.error('[ServiceWorker] Error showing notification:', error);
  }
}

// Show a test notification immediately
async function showTestNotification(minutes) {
  const title = '💧 Reminder Test';
  const body = `Hydration reminders will appear every ${minutes} minute(s)`;

  try {
    await self.registration.showNotification(title, {
      body: body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'hydration-test-notification', // Consistent tag for test notifications
      requireInteraction: false,
      vibrate: [100, 50, 100],
    });
    console.log('[ServiceWorker] Test notification sent');
  } catch (error) {
    console.error('[ServiceWorker] Error showing test notification:', error);
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  notification.close();

  // Try to focus an existing window or open a new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

console.log('[ServiceWorker] Simple service worker loaded and ready');
