import React, { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useReminders';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import { useToast } from '../context/ToastContext';
import { areNotificationsSupported } from '../utils/mobileNotifications';
import { Calendar } from 'primereact/calendar';

interface FrequencyOption {
  label: string;
  value: number;
}

const ReminderSettings: React.FC = () => {
  const { requestPermission, scheduleReminder, swReady, pingServiceWorker } = useNotifications();
  const toast = useToast();
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("remindersEnabled");
    return saved ? JSON.parse(saved) : false;
  });
  const [selectedFrequency, setSelectedFrequency] = useState<number>(() => {
    const saved = localStorage.getItem("reminderFrequency");
    return saved ? Number(saved) : 30;
  });
  const [startTime, setStartTime] = useState<Date>(() => {
    const defaultStart = new Date();
    defaultStart.setHours(8, 0, 0, 0);
    const saved = localStorage.getItem("reminderStartTime");
    const savedTime = saved ? new Date(saved) : defaultStart;
    
    // Make sure start time is not in the past
    const now = new Date();
    if (savedTime.getHours() < now.getHours() || 
        (savedTime.getHours() === now.getHours() && savedTime.getMinutes() < now.getMinutes())) {
      // Set to current time + 5 minutes (rounded to next 5 min)
      const minutes = Math.ceil((now.getMinutes() + 5) / 5) * 5;
      now.setMinutes(minutes, 0, 0);
      return now;
    }
    
    return savedTime;
  });
  const [endTime, setEndTime] = useState<Date>(() => {
    const defaultEnd = new Date();
    defaultEnd.setHours(22, 0, 0, 0);
    const saved = localStorage.getItem("reminderEndTime");
    const savedTime = saved ? new Date(saved) : defaultEnd;
    
    // Make sure end time is not later than 10 PM
    const maxEnd = new Date();
    maxEnd.setHours(22, 0, 0, 0);
    
    if (savedTime.getHours() > 22 || (savedTime.getHours() === 22 && savedTime.getMinutes() > 0)) {
      return maxEnd;
    }
    
    return savedTime;
  });

  // Only allow these frequencies
  const frequencyOptions: FrequencyOption[] = [
    { label: "Every 2 minutes (test)", value: 2 },
    { label: "Every 30 minutes", value: 30 },
    { label: "Every 1 hour", value: 60 },
  ];

  // State to track which field is being edited
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editFrequency, setEditFrequency] = useState<boolean>(false);
  const [editStartTime, setEditStartTime] = useState<boolean>(false);
  const [editEndTime, setEditEndTime] = useState<boolean>(false);

  // Function to cancel all reminders
  const cancelAllReminders = () => {
    console.log("[Reminder Debug] Cancelling all reminders");
    // Tell service worker to stop all reminders
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "STOP_ALL_REMINDERS",
      });
    }
  };

  // Save preferences whenever they change
  useEffect(() => {
    localStorage.setItem("remindersEnabled", JSON.stringify(remindersEnabled));
    localStorage.setItem("reminderFrequency", String(selectedFrequency));
    localStorage.setItem("reminderStartTime", startTime.toISOString());
    localStorage.setItem("reminderEndTime", endTime.toISOString());
  }, [remindersEnabled, selectedFrequency, startTime, endTime]);
  
  // Track changes in reminder settings
  const [lastReminderState, setLastReminderState] = useState<boolean>(remindersEnabled);
  const [lastFrequency, setLastFrequency] = useState<number>(selectedFrequency);
  const [lastStartTime, setLastStartTime] = useState<string>(startTime.toISOString());
  const [lastEndTime, setLastEndTime] = useState<string>(endTime.toISOString());
  
  useEffect(() => {
    // Detect if any important setting changed
    const reminderStateChanged = lastReminderState !== remindersEnabled;
    const frequencyChanged = lastFrequency !== selectedFrequency && remindersEnabled;
    const startTimeChanged = lastStartTime !== startTime.toISOString() && remindersEnabled;
    const endTimeChanged = lastEndTime !== endTime.toISOString() && remindersEnabled;
    
    // Only process if settings have changed
    // This prevents unnecessary runs when just visiting the page
    if (!reminderStateChanged && !frequencyChanged && !startTimeChanged && !endTimeChanged) {
      return;
    }
    
    // Update our tracking variables
    setLastReminderState(remindersEnabled);
    setLastFrequency(selectedFrequency);
    setLastStartTime(startTime.toISOString());
    setLastEndTime(endTime.toISOString());
    
    // If we're just updating settings for an active reminder, restart it
    if ((frequencyChanged || startTimeChanged || endTimeChanged) && remindersEnabled) {
      console.log("[Reminder Debug] Settings changed, restarting reminders");
      // Cancel existing reminders first
      cancelAllReminders();
      
      // Short delay to ensure the cancelation completes
      setTimeout(() => {
        // Then reschedule with direct service worker message
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          const reminderId = `reminder-${Date.now()}`;
          console.log(`[Reminder Debug] Re-scheduling reminder ID ${reminderId} with frequency ${selectedFrequency}`);
          
          navigator.serviceWorker.controller.postMessage({
            type: "START_REMINDER",
            id: reminderId,
            minutes: selectedFrequency,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
          });
        }
      }, 300);
      
      // Don't show a notification in this case, it would be too noisy
      return;
    }
    
    if (remindersEnabled) {
      // Check if we can create notifications
      if (!("Notification" in window)) {
        toast.showError(
          "Notifications Not Supported",
          "Your browser does not support notifications"
        );
        return;
      }

      // Request permission if needed
      const requestAndSchedule = async () => {
        // Check current permission state before requesting
        let permissionGranted = false;
        
        if (Notification.permission === "granted") {
          permissionGranted = true;
        } else if (Notification.permission === "default") {
          // Request notification permission only if not yet decided
          const permission = await requestPermission();
          permissionGranted = permission === "granted";
        }
        
        if (permissionGranted) {
          // Check if service worker is available
          if (!swReady) {
            toast.showInfo(
              "Preparing Reminders",
              "Please wait a moment while we set things up..."
            );

            // Try to ping service worker
            pingServiceWorker();

            // Wait briefly and check again
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          
          // Set up the recurring reminder directly with service worker
          console.log(`[Reminder Debug] Scheduling reminder with frequency: ${selectedFrequency} minutes, start: ${startTime.toLocaleTimeString()}, end: ${endTime.toLocaleTimeString()}`);
          
          if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
            // Generate a unique ID for this reminder
            const reminderId = `reminder-${Date.now()}`;
            
            console.log(`[Reminder Debug] Sending START_REMINDER message to service worker with ID: ${reminderId}`);
            
            // Send message to service worker to start the reminder
            navigator.serviceWorker.controller.postMessage({
              type: "START_REMINDER",
              id: reminderId,
              minutes: selectedFrequency,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString()
            });
            
            toast.showSuccess(
              "Reminders Activated",
              `You'll receive reminders every ${selectedFrequency} minutes`
            );
          } else {
            console.error("[Reminder Debug] Service worker not available");
            toast.showError(
              "Reminder Setup Failed",
              "Service worker not available. Please refresh the page and try again."
            );
            setRemindersEnabled(false);
          }
        } else {
          toast.showWarn(
            "Notifications Blocked",
            "Please enable notifications in your browser settings to use reminders"
          );
          setRemindersEnabled(false);
        }
      };
      
      requestAndSchedule();
    } else {
      // Cancel all scheduled notifications
      cancelAllReminders();
    }
  }, [
    remindersEnabled, selectedFrequency, startTime, endTime,
    lastReminderState, lastFrequency, lastStartTime, lastEndTime,
    swReady, requestPermission, pingServiceWorker, scheduleReminder, toast
  ]);

  // Listen for messages from the service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      console.log("[Reminder Debug] Message from service worker:", data);

      // Handle specific messages
      if (data.type === "REMINDER_STARTED") {
        toast.showSuccess(
          "Reminder Active",
          `Hydration reminders set for every ${data.minutes} minute(s)`
        );
      } else if (data.type === "REMINDER_STOPPED") {
        toast.showInfo(
          "Reminder Stopped",
          "This hydration reminder has been deactivated"
        );
      } else if (data.type === "ALL_REMINDERS_STOPPED") {
        toast.showInfo(
          "All Reminders Stopped",
          "All hydration reminders have been deactivated"
        );
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [toast]);

  // Get device notification capability information
  const { isIOSDevice, isPWAMode } = useNotifications();
  const canUseNotifications = areNotificationsSupported();

  return (
    <div className="settings-section reminder-settings">
      <div className="settings-section-header">
        <i className="pi pi-bell settings-icon" style={{ color: "#00BCD4" }}></i>
        <h3>Reminder</h3>
      </div>

      {/* Device notification support information */}
      {isIOSDevice && !isPWAMode && (
        <div className="notification-support-info">
          <i className="pi pi-info-circle" style={{ marginRight: "8px", color: "#00BCD4" }}></i>
          <p>For the best experience with notifications on iOS, please install this app to your home screen.</p>
        </div>
      )}

      {!canUseNotifications && (
        <div className="notification-support-info">
          <i className="pi pi-info-circle" style={{ marginRight: "8px", color: "#ff9800" }}></i>
          <p>Your browser has limited notification support. The app will use in-app reminders when possible.</p>
        </div>
      )}
      
      <div className="reminder-section-spacer"></div>
      
      <div className="reminder-time-row main-toggle">
        <div className="reminder-time">
          <span>Auto reminder</span>
        </div>
        <InputSwitch
          checked={remindersEnabled}
          onChange={(e) => setRemindersEnabled(e.value as boolean)}
        />
      </div>

      <div className="reminder-settings-card">
        {!remindersEnabled ? (
          <p className="reminder-status-message">Turn on reminders to set up hydration notifications.</p>
        ) : editMode ? (
          <div className="reminder-summary">
            <div className="reminder-edit-row">
              <div className="reminder-controls-flex-container">
                <div className="reminder-edit-item">
                  <span className="reminder-summary-label">Frequency</span>
                  <Dropdown
                    value={selectedFrequency}
                    options={frequencyOptions}
                    onChange={(e) => setSelectedFrequency(e.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="reminder-edit-item">
                  <span className="reminder-summary-label">Start Time</span>
                  <Calendar
                    value={startTime}
                    onChange={(e) => {
                    const newTime = e.value as Date;
                    const now = new Date();
                    
                    if (newTime) {
                      // Validate that start time is not in the past
                      if (newTime.getHours() > now.getHours() || 
                          (newTime.getHours() === now.getHours() && newTime.getMinutes() >= now.getMinutes())) {
                        
                        // Also check if new start time would be after end time
                        if (endTime && (
                          newTime.getHours() > endTime.getHours() || 
                          (newTime.getHours() === endTime.getHours() && newTime.getMinutes() >= endTime.getMinutes())
                        )) {
                          // If so, move end time forward by at least 1 hour
                          const adjustedEnd = new Date(newTime);
                          adjustedEnd.setHours(adjustedEnd.getHours() + 1);
                          
                          if (adjustedEnd.getHours() > 22) {
                            adjustedEnd.setHours(22, 0, 0, 0);
                          }
                          
                          setEndTime(adjustedEnd);
                          toast.showWarn(
                            "Time Adjustment",
                            "End time has been adjusted to maintain at least a 1-hour interval."
                          );
                        }
                        
                        setStartTime(newTime);
                      } else {
                        // Set to current time + 5 minutes (rounded to next 5 min)
                        const adjusted = new Date();
                        const minutes = Math.ceil((now.getMinutes() + 5) / 5) * 5;
                        adjusted.setMinutes(minutes, 0, 0);
                        setStartTime(adjusted);
                        
                        // Show validation message
                        toast.showWarn(
                          "Time Adjustment",
                          "Start time must be in the future. Adjusted to the next 5 minutes."
                        );
                      }
                    }
                  }}
                  timeOnly
                  hourFormat="12"
                  className="w-full"
                  />
                </div>
                
                <div className="reminder-edit-item">
                  <span className="reminder-summary-label">End Time</span>
                  <Calendar
                    value={endTime}
                    onChange={(e) => {
                      const newTime = e.value as Date;
                      
                      if (newTime) {
                        // Validate end time is not later than 10 PM
                        const maxEnd = new Date();
                        maxEnd.setHours(22, 0, 0, 0);
                        
                        if (newTime.getHours() > 22 || 
                            (newTime.getHours() === 22 && newTime.getMinutes() > 0)) {
                          setEndTime(maxEnd);
                          
                          // Show validation message
                          toast.showWarn(
                            "Time Adjustment",
                            "End time cannot be later than 10:00 PM. Adjusted to 10:00 PM."
                          );
                          return;
                        }
                        
                        // Validate that end time is after start time
                        if (startTime && (
                      newTime.getHours() < startTime.getHours() || 
                      (newTime.getHours() === startTime.getHours() && newTime.getMinutes() <= startTime.getMinutes())
                    )) {
                      // Set end time to start time + 1 hour
                      const adjustedEnd = new Date(startTime);
                      adjustedEnd.setHours(adjustedEnd.getHours() + 1);
                      
                      if (adjustedEnd.getHours() > 22) {
                        adjustedEnd.setHours(22, 0, 0, 0);
                      }
                      
                      setEndTime(adjustedEnd);
                      
                      // Show validation message
                      toast.showWarn(
                        "Time Adjustment",
                        "End time must be after start time. Adjusted accordingly."
                      );
                    } else {
                      setEndTime(newTime);
                    }
                  }
                }}
                timeOnly
                hourFormat="12"
                className="w-full"
              />
            </div>
            
              </div>
              
              <div className="settings-action-buttons">
                <button 
                  className="p-button p-button-rounded p-button-text p-button-danger" 
                  onClick={() => setEditMode(false)}
                  aria-label="Cancel changes"
                >
                  <i className="pi pi-times"></i>
                </button>
                <button 
                  className="p-button p-button-rounded p-button-text p-button-success" 
                  onClick={() => {
                    setEditMode(false);
                    // Force the useEffect to recognize a change
                    setLastFrequency(0);
                    setLastStartTime("");
                    setLastEndTime("");
                  }}
                  aria-label="Save changes"
                >
                  <i className="pi pi-check"></i>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="reminder-summary">
            <div className="reminder-summary-item">
              {editFrequency ? (
                <div className="inline-edit-container">
                  <span className="reminder-summary-label">Frequency</span>
                  <div className="inline-edit-field">
                    <Dropdown
                      value={selectedFrequency}
                      options={frequencyOptions}
                      onChange={(e) => setSelectedFrequency(e.value)}
                      className="inline-dropdown"
                    />
                    <div className="inline-action-buttons">
                      <button 
                        className="p-button p-button-rounded p-button-text p-button-sm p-button-danger" 
                        onClick={() => setEditFrequency(false)}
                        aria-label="Cancel frequency changes"
                      >
                        <i className="pi pi-times"></i>
                      </button>
                      <button 
                        className="p-button p-button-rounded p-button-text p-button-sm p-button-success" 
                        onClick={() => {
                          setEditFrequency(false);
                          
                          // Notify about frequency change
                          toast.showSuccess(
                            "Frequency Updated", 
                            `Reminders will now occur every ${selectedFrequency} minutes`
                          );
                          
                          // Force the useEffect to update notifications
                          setLastFrequency(0);
                        }}
                        aria-label="Save frequency changes"
                      >
                        <i className="pi pi-check"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <span className="reminder-summary-label">Frequency</span>
                  <div className="reminder-value-with-edit">
                    <span className="reminder-summary-value">{selectedFrequency} minutes</span>
                    <button 
                      className="p-button p-button-rounded p-button-text p-button-sm" 
                      onClick={() => setEditFrequency(true)}
                      aria-label="Edit frequency"
                    >
                      <i className="pi pi-pencil"></i>
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <div className="reminder-summary-item">
              {editStartTime ? (
                <div className="inline-edit-container">
                  <span className="reminder-summary-label">Start Time</span>
                  <div className="inline-edit-field">
                    <Calendar
                      value={startTime}
                      onChange={(e) => {
                        const newTime = e.value as Date;
                        const now = new Date();
                        
                        if (newTime) {
                          // Validate that start time is not in the past
                          if (newTime.getHours() > now.getHours() || 
                              (newTime.getHours() === now.getHours() && newTime.getMinutes() >= now.getMinutes())) {
                            
                            // Also check if new start time would be after end time
                            if (endTime && (
                              newTime.getHours() > endTime.getHours() || 
                              (newTime.getHours() === endTime.getHours() && newTime.getMinutes() >= endTime.getMinutes())
                            )) {
                              // If so, move end time forward by at least 1 hour
                              const adjustedEnd = new Date(newTime);
                              adjustedEnd.setHours(adjustedEnd.getHours() + 1);
                              
                              if (adjustedEnd.getHours() > 22) {
                                adjustedEnd.setHours(22, 0, 0, 0);
                              }
                              
                              setEndTime(adjustedEnd);
                              toast.showWarn(
                                "Time Adjustment",
                                "End time has been adjusted to maintain at least a 1-hour interval."
                              );
                            }
                            
                            setStartTime(newTime);
                          } else {
                            // Set to current time + 5 minutes (rounded to next 5 min)
                            const adjusted = new Date();
                            const minutes = Math.ceil((now.getMinutes() + 5) / 5) * 5;
                            adjusted.setMinutes(minutes, 0, 0);
                            setStartTime(adjusted);
                            
                            // Show validation message
                            toast.showWarn(
                              "Time Adjustment",
                              "Start time must be in the future. Adjusted to the next 5 minutes."
                            );
                          }
                        }
                      }}
                      timeOnly
                      hourFormat="12"
                      className="inline-time-picker"
                    />
                    <div className="inline-action-buttons">
                      <button 
                        className="p-button p-button-rounded p-button-text p-button-sm p-button-danger" 
                        onClick={() => setEditStartTime(false)}
                        aria-label="Cancel start time changes"
                      >
                        <i className="pi pi-times"></i>
                      </button>
                      <button 
                        className="p-button p-button-rounded p-button-text p-button-sm p-button-success" 
                        onClick={() => {
                          setEditStartTime(false);
                          
                          // Notify about start time change
                          toast.showSuccess(
                            "Start Time Updated", 
                            `Reminders will now begin at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
                          );
                          
                          // Force the useEffect to update notifications
                          setLastStartTime("");
                        }}
                        aria-label="Save start time changes"
                      >
                        <i className="pi pi-check"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <span className="reminder-summary-label">Start Time</span>
                  <div className="reminder-value-with-edit">
                    <span className="reminder-summary-value">
                      {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                    <button 
                      className="p-button p-button-rounded p-button-text p-button-sm" 
                      onClick={() => setEditStartTime(true)}
                      aria-label="Edit start time"
                    >
                      <i className="pi pi-pencil"></i>
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <div className="reminder-summary-item">
              {editEndTime ? (
                <div className="inline-edit-container">
                  <span className="reminder-summary-label">End Time</span>
                  <div className="inline-edit-field">
                    <Calendar
                      value={endTime}
                      onChange={(e) => {
                        const newTime = e.value as Date;
                        
                        if (newTime) {
                          // Validate end time is not later than 10 PM
                          const maxEnd = new Date();
                          maxEnd.setHours(22, 0, 0, 0);
                          
                          if (newTime.getHours() > 22 || 
                              (newTime.getHours() === 22 && newTime.getMinutes() > 0)) {
                            setEndTime(maxEnd);
                            
                            // Show validation message
                            toast.showWarn(
                              "Time Adjustment",
                              "End time cannot be later than 10:00 PM. Adjusted to 10:00 PM."
                            );
                            return;
                          }
                          
                          // Validate that end time is after start time
                          if (startTime && (
                            newTime.getHours() < startTime.getHours() || 
                            (newTime.getHours() === startTime.getHours() && newTime.getMinutes() <= startTime.getMinutes())
                          )) {
                            // Set end time to start time + 1 hour
                            const adjustedEnd = new Date(startTime);
                            adjustedEnd.setHours(adjustedEnd.getHours() + 1);
                            
                            if (adjustedEnd.getHours() > 22) {
                              adjustedEnd.setHours(22, 0, 0, 0);
                            }
                            
                            setEndTime(adjustedEnd);
                            
                            // Show validation message
                            toast.showWarn(
                              "Time Adjustment",
                              "End time must be after start time. Adjusted accordingly."
                            );
                          } else {
                            setEndTime(newTime);
                          }
                        }
                      }}
                      timeOnly
                      hourFormat="12"
                      className="inline-time-picker"
                    />
                    <div className="inline-action-buttons">
                      <button 
                        className="p-button p-button-rounded p-button-text p-button-sm p-button-danger" 
                        onClick={() => setEditEndTime(false)}
                        aria-label="Cancel end time changes"
                      >
                        <i className="pi pi-times"></i>
                      </button>
                      <button 
                        className="p-button p-button-rounded p-button-text p-button-sm p-button-success" 
                        onClick={() => {
                          setEditEndTime(false);
                          
                          // Notify about end time change
                          toast.showSuccess(
                            "End Time Updated", 
                            `Reminders will now end at ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
                          );
                          
                          // Force the useEffect to update notifications
                          setLastEndTime("");
                        }}
                        aria-label="Save end time changes"
                      >
                        <i className="pi pi-check"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <span className="reminder-summary-label">End Time</span>
                  <div className="reminder-value-with-edit">
                    <span className="reminder-summary-value">
                      {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                    <button 
                      className="p-button p-button-rounded p-button-text p-button-sm" 
                      onClick={() => setEditEndTime(true)}
                      aria-label="Edit end time"
                    >
                      <i className="pi pi-pencil"></i>
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <div className="reminder-status-message">
              <i className="pi pi-info-circle" style={{ marginRight: "8px", color: "#00BCD4" }}></i>
              <p>
                You will receive water reminders every {selectedFrequency} minutes between{' '}
                {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} and{' '}
                {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReminderSettings;
