// Enhanced service worker for mobile and desktop notifications
const CACHE_NAME = 'droplet-cache-v3';
const NOTIFICATION_TITLE = 'Time to Drink Water! 💧';
const NOTIFICATION_OPTIONS = {
  body: "Don't forget to stay hydrated!",
  icon: '/icon-192.png',
  badge: '/icon-192.png',
  tag: 'water-reminder',
  renotify: true,
  vibrate: [200, 100, 200],
  requireInteraction: true,
  actions: [
    {
      action: 'drink',
      title: '🥤 Log Water',
    },
    {
      action: 'dismiss',
      title: 'Dismiss',
    },
  ],
};

// Store for active reminders and their state
const activeReminders = new Map();
let activeTimer = null;
let lastNotificationTime = 0;
let currentInterval = 0;
let isEnabled = false;
let wakeLock = null;
let heartbeatInterval = null;

// Enhanced wake lock with periodic renewal and heartbeat
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      // Request the wake lock
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock is active');

      // Set up periodic wake lock renewal
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      heartbeatInterval = setInterval(async () => {
        try {
          if (wakeLock) {
            // Release existing wake lock
            await wakeLock.release();
          }
          // Request new wake lock
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('Wake Lock renewed');
          
          // Send heartbeat to all clients
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({ type: 'HEARTBEAT' });
          });
        } catch (err) {
          console.log(`Wake Lock renewal error: ${err.name}, ${err.message}`);
          // Try to reacquire after error
          setTimeout(requestWakeLock, 1000);
        }
      }, 50000); // Renew every 50 seconds
    } catch (err) {
      console.log(`Wake Lock error: ${err.name}, ${err.message}`);
      // Try alternative notification method
      registerPeriodicSync();
    }
  } else {
    // Fallback for devices without wake lock
    registerPeriodicSync();
  }
}

// Register periodic sync as backup
async function registerPeriodicSync() {
  if ('periodicSync' in self.registration) {
    try {
      await self.registration.periodicSync.register('water-reminder', {
        minInterval: Math.max(60 * 60, currentInterval * 60) // At least 1 hour or reminder interval
      });
      console.log('Periodic sync registered');
    } catch (err) {
      console.log('Periodic sync registration failed:', err);
    }
  }
}

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing new service worker...');
  // Force waiting service worker to become active
  self.skipWaiting();
});

// Function to schedule the next notification with redundancy
const scheduleNextNotification = () => {
  if (!isEnabled || currentInterval <= 0) return;

  // Clear any existing timer
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }

  const now = Date.now();
  const timeSinceLastNotification = now - lastNotificationTime;
  const nextNotificationDelay = Math.max(
    0,
    (currentInterval * 60 * 1000) - timeSinceLastNotification
  );

  // Schedule next notification with multiple approaches
  activeTimer = setTimeout(async () => {
    try {
      // First try: Standard notification
      await self.registration.showNotification(NOTIFICATION_TITLE, NOTIFICATION_OPTIONS);
      lastNotificationTime = Date.now();
      
      // Store notification time in IndexedDB for recovery
      await storeNotificationTime(lastNotificationTime);
      
      // Schedule next notification
      scheduleNextNotification();
      
      // Also schedule a backup notification using Background Tasks API if available
      if ('scheduling' in self.registration) {
        const backupTime = new Date(Date.now() + (currentInterval * 60 * 1000));
        try {
          await self.registration.scheduling.scheduleTask({
            taskName: 'water-reminder-backup',
            deadline: backupTime,
            backoffStep: 5 * 60 * 1000 // 5 minutes
          });
        } catch (err) {
          console.log('Backup scheduling failed:', err);
        }
      }
    } catch (error) {
      console.error('Error showing notification:', error);
      // Retry after 1 minute if notification fails
      setTimeout(() => {
        showNotification(NOTIFICATION_TITLE, {
          ...NOTIFICATION_OPTIONS,
          requireInteraction: true
        });
      }, 60000);
    }
  }, nextNotificationDelay);

  // Set up a backup timer using a Web Worker for redundancy
  const workerCode = `
    setTimeout(() => {
      self.postMessage('showNotification');
    }, ${nextNotificationDelay + 1000});
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerURL = URL.createObjectURL(blob);
  const backupWorker = new Worker(workerURL);
  
  backupWorker.onmessage = async () => {
    const timeSinceLastNotification = Date.now() - lastNotificationTime;
    if (timeSinceLastNotification >= currentInterval * 60 * 1000) {
      try {
        await self.registration.showNotification(NOTIFICATION_TITLE, NOTIFICATION_OPTIONS);
      } catch (err) {
        console.log('Backup notification failed:', err);
      }
    }
    backupWorker.terminate();
    URL.revokeObjectURL(workerURL);
  };
};

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating service worker...');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      requestWakeLock(),
      // Notify all clients that the service worker is active
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED' });
        });
      }),
    ])
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  notification.close();

  if (event.action === 'open') {
    // Open/focus the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].focus();
        } else {
          self.clients.openWindow('/');
        }
      })
    );
  }
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
      // When starting a new reminder, calculate when the next notification should be
      const now = Date.now();
      startReminder(message.id, message.minutes, event.source, message.startTime, message.endTime);
      break;

    case 'STOP_REMINDER':
      stopReminder(message.id, event.source);
      break;

    case 'STOP_ALL_REMINDERS':
      isEnabled = false;
      stopAllReminders(event.source);
      // Reset the last notification time when stopping all reminders
      lastNotificationTime = 0;
      break;

    case 'GET_STATUS':
      // Respond with current reminder status
      event.source?.postMessage({
        type: 'REMINDER_STATUS',
        isActive: isEnabled && activeReminders.size > 0,
        lastNotification: lastNotificationTime,
        nextNotification: lastNotificationTime > 0 ? 
          lastNotificationTime + (currentInterval * 60 * 1000) : 0
      });
      break;
  }
});

// Start a new reminder with the given interval
async function showNotification(id, minutes) {
  try {
    // Try to use standard Notification API first
    await self.registration.showNotification(NOTIFICATION_TITLE, {
      ...NOTIFICATION_OPTIONS,
      timestamp: Date.now(),
      data: { id, minutes },
    });
  } catch (error) {
    console.error('Error showing notification:', error);
    // Fallback for mobile browsers that don't support rich notifications
    await self.registration.showNotification(NOTIFICATION_TITLE, {
      body: NOTIFICATION_OPTIONS.body,
      icon: NOTIFICATION_OPTIONS.icon,
    });
  }
}

// Handle periodic sync events as a backup for notifications
self.addEventListener('periodicsync', async (event) => {
  if (event.tag === 'water-reminder' && isEnabled) {
    const now = Date.now();
    const timeSinceLastNotification = now - lastNotificationTime;
    
    // Only show notification if enough time has passed
    if (timeSinceLastNotification >= currentInterval * 60 * 1000) {
      try {
        await self.registration.showNotification(NOTIFICATION_TITLE, NOTIFICATION_OPTIONS);
        lastNotificationTime = now;
        await storeNotificationTime(lastNotificationTime);
      } catch (err) {
        console.log('Periodic sync notification failed:', err);
      }
    }
  }
});

// Store last notification time in IndexedDB
async function storeNotificationTime(timestamp) {
  const db = await openDB();
  const tx = db.transaction('notifications', 'readwrite');
  const store = tx.objectStore('notifications');
  await store.put(timestamp, 'lastNotification');
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('water-reminders', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications');
      }
    };
  });
}

function startReminder(id, minutes, client, startTimeStr, endTimeStr) {
  // Stop any existing reminders
  stopAllReminders();

  console.log(`[ServiceWorker] Starting reminder ${id} every ${minutes} minutes`);
  console.log(`[ServiceWorker Debug] Start time: ${startTimeStr}, End time: ${endTimeStr}`);

  // Store current interval
  currentInterval = minutes;
  isEnabled = true;

  // Parse start and end times if provided
  let startTime = startTimeStr ? new Date(startTimeStr) : null;
  let endTime = endTimeStr ? new Date(endTimeStr) : null;
  
  console.log(`[ServiceWorker Debug] Parsed start time: ${startTime?.toLocaleTimeString()}`);
  console.log(`[ServiceWorker Debug] Parsed end time: ${endTime?.toLocaleTimeString()}`);
  
  // Function to check if current time is within reminder hours
  const isWithinReminderHours = () => {
    if (!startTime || !endTime) {
      console.log('[ServiceWorker Debug] No start/end time restrictions');
      return true;
    }
    
    const now = new Date();
    
    // Extract only time component (ignore date part)
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    const startHour = startTime.getHours();
    const startMinutes = startTime.getMinutes();
    
    const endHour = endTime.getHours();
    const endMinutes = endTime.getMinutes();
    
    // Convert to minutes for easier comparison
    const currentTimeInMinutes = currentHour * 60 + currentMinutes;
    const startTimeInMinutes = startHour * 60 + startMinutes;
    const endTimeInMinutes = endHour * 60 + endMinutes;
    
    const isWithin = currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
    
    console.log(`[ServiceWorker Debug] Current time: ${now.toLocaleTimeString()}`);
    console.log(`[ServiceWorker Debug] Is within hours? ${isWithin} (${startTimeInMinutes}-${endTimeInMinutes}, current: ${currentTimeInMinutes})`);
    
    return isWithin;
  };
  
  // Calculate when the next notification should be shown
  const now = Date.now();
  const nextNotificationTime = lastNotificationTime > 0 ?
    lastNotificationTime + (minutes * 60 * 1000) :
    now + (minutes * 60 * 1000);

  // Create timeout for next notification
  const scheduleNextReminderCheck = () => {
    if (activeTimer) {
      clearTimeout(activeTimer);
    }
    
    console.log(`[ServiceWorker Debug] Scheduling next reminder check in ${minutes} minutes`);
    
    activeTimer = setTimeout(async () => {
      // Only show notification if enabled and within reminder hours
      if (isEnabled && isWithinReminderHours()) {
        console.log(`[ServiceWorker Debug] Showing notification at ${new Date().toLocaleTimeString()}`);
        await showNotification(id, minutes);
        lastNotificationTime = Date.now();
      } else {
        console.log("[ServiceWorker Debug] Skipping notification - outside reminder hours or disabled");
        console.log(`[ServiceWorker Debug] isEnabled: ${isEnabled}`);
        
        // Log whether we're within reminder hours
        isWithinReminderHours();
      }
      
      // Always schedule the next check, even if we skipped this one
      console.log("[ServiceWorker Debug] Re-scheduling next check");
      scheduleNextReminderCheck();
    }, minutes * 60 * 1000);
    
    // Store the timer
    activeReminders.set(id + '_timer', activeTimer);
    
    // Send a debug status message to clients
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'REMINDER_DEBUG_STATUS',
          isEnabled: isEnabled,
          nextCheck: new Date(Date.now() + minutes * 60 * 1000).toLocaleTimeString(),
          interval: minutes,
          withinHours: isWithinReminderHours()
        });
      });
    });
  };
  
  // If within reminder hours, show initial test notification
  if (isWithinReminderHours()) {
    // Show a test notification immediately
    showTestNotification(minutes);
  } else {
    console.log("[ServiceWorker Debug] Not showing test notification - outside reminder hours");
    
    // If we're outside the hours, schedule a one-time check for when we enter the hours
    if (startTime) {
      const now = new Date();
      const startHour = startTime.getHours();
      const startMinutes = startTime.getMinutes();
      
      const targetTime = new Date();
      targetTime.setHours(startHour, startMinutes, 0, 0);
      
      // If start time is earlier today, schedule for tomorrow
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      const msUntilStart = targetTime.getTime() - now.getTime();
      console.log(`[ServiceWorker Debug] Scheduling special check for when reminder hours begin at ${targetTime.toLocaleString()}, ${msUntilStart}ms from now`);
      
      setTimeout(() => {
        // Re-check if we're still supposed to be showing reminders
        if (isEnabled && isWithinReminderHours()) {
          console.log(`[ServiceWorker Debug] Special start time reached, showing notification`);
          showNotification(id, minutes);
          lastNotificationTime = Date.now();
        }
        
        // Schedule the regular checks
        scheduleNextReminderCheck();
      }, msUntilStart);
    }
  }

  // Start the reminder loop for regular checks
  scheduleNextReminderCheck();

  // Send confirmation to client with next notification time
  client?.postMessage({
    type: 'REMINDER_STARTED',
    id: id,
    minutes: minutes,
    nextNotification: nextNotificationTime,
    startTime: startTimeStr,
    endTime: endTimeStr
  });
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
    // Clear both timeout and interval timers
    clearTimeout(timerId);
    clearInterval(timerId);
  });

  activeReminders.clear();
  currentInterval = 0;
  lastNotificationTime = 0;

  // Only send message if client is provided (when called directly, not from startReminder)
  if (client) {
    client.postMessage({
      type: 'ALL_REMINDERS_STOPPED',
      timestamp: Date.now()
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
    console.log('[ServiceWorker Debug] Sending test notification');
    
    // Use different options for test notification
    const testOptions = {
      body: body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'hydration-test-notification', // Consistent tag for test notifications
      requireInteraction: false,
      vibrate: [100, 50, 100],
      timestamp: Date.now(),
      data: { isTest: true }
    };
    
    await self.registration.showNotification(title, testOptions);
    console.log('[ServiceWorker Debug] Test notification sent successfully');
    
    // Mark the time of the test notification
    lastNotificationTime = Date.now();
  } catch (error) {
    console.error('[ServiceWorker Debug] Error showing test notification:', error);
    console.error(error);
    
    // Try a simplified version as fallback
    try {
      await self.registration.showNotification('Water Reminder', { body: 'Test notification' });
    } catch (fallbackError) {
      console.error('[ServiceWorker Debug] Even fallback notification failed:', fallbackError);
    }
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
