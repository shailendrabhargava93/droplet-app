import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { useToast } from '../context/ToastContext';

interface NotificationSetupModalProps {
  visible: boolean;
  onHide: () => void;
  onSetup: (startTime: Date, endTime: Date) => void;
}

const NotificationSetupModal: React.FC<NotificationSetupModalProps> = ({ 
  visible, 
  onHide,
  onSetup
}) => {
  const toast = useToast();
  const [startTime, setStartTime] = useState<Date>(() => {
    const defaultStart = new Date();
    defaultStart.setHours(8, 0, 0, 0);
    return defaultStart;
  });
  
  const [endTime, setEndTime] = useState<Date>(() => {
    const defaultEnd = new Date();
    defaultEnd.setHours(22, 0, 0, 0);
    return defaultEnd;
  });

  // Handler for time changes that preserves the date part
  const handleTimeChange = (value: Date | null, isStartTime: boolean) => {
    if (!value) return;
    
    const newTime = new Date();
    newTime.setHours(value.getHours(), value.getMinutes(), 0, 0);
    
    if (isStartTime) {
      setStartTime(newTime);
    } else {
      setEndTime(newTime);
    }
  };

  const handleSave = () => {
    // Create new Date objects for user's selected times
    const selectedStartTime = new Date();
    selectedStartTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

    const selectedEndTime = new Date();
    selectedEndTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

    // Validate end time is after start time
    if (selectedEndTime <= selectedStartTime) {
      toast.showError(
        'Invalid Time Range',
        'End time must be later than start time.'
      );
      return;
    }

    // Ensure at least 1 hour between start and end
    const hoursDiff = (selectedEndTime.getTime() - selectedStartTime.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < 1) {
      toast.showError(
        'Invalid Time Range',
        'There must be at least 1 hour between start and end time.'
      );
      return;
    }

    // Check if we need to schedule for tomorrow
    const now = new Date();
    const currentTimeAsMinutes = now.getHours() * 60 + now.getMinutes();
    const endTimeAsMinutes = selectedEndTime.getHours() * 60 + selectedEndTime.getMinutes();

    // If current time is past the end time, schedule for tomorrow
    if (currentTimeAsMinutes >= endTimeAsMinutes) {
      selectedStartTime.setDate(selectedStartTime.getDate() + 1);
      selectedEndTime.setDate(selectedEndTime.getDate() + 1);
      toast.showInfo(
        'Schedule Set',
        'Notifications will begin tomorrow at your selected time.'
      );
    }

    // Pass the exact times selected by user
    onSetup(selectedStartTime, selectedEndTime);
  };

  return (
    <Dialog
      header="Enable Notifications"
      visible={visible}
      onHide={onHide}
      modal
      className="notification-setup-modal"
      footer={
        <div className="dialog-footer">
          <Button 
            label="Cancel" 
            icon="pi pi-times" 
            onClick={onHide} 
            className="p-button-text" 
          />
          <Button 
            label="Enable" 
            icon="pi pi-check" 
            onClick={handleSave} 
            autoFocus 
          />
        </div>
      }
    >
      <div className="notification-setup-content">
        <p className="setup-description">
          Set your preferred notification schedule. You'll receive hydration reminders during these hours.
        </p>
        
        <div className="time-settings">
          <div className="time-setting-item">
            <label>Start Time</label>
            <Calendar
              value={startTime}
              onChange={(e) => handleTimeChange(e.value as Date, true)}
              timeOnly
              hourFormat="12"
              showTime
              stepMinute={5}
            />
          </div>
          
          <div className="time-setting-item">
            <label>End Time</label>
            <Calendar
              value={endTime}
              onChange={(e) => handleTimeChange(e.value as Date, false)}
              timeOnly
              hourFormat="12"
              showTime
              stepMinute={5}
            />
          </div>
        </div>

        <p className="setup-note">
          Note: Once set, notification times cannot be changed. You'll be able to adjust the frequency later in settings.
        </p>
      </div>
    </Dialog>
  );
};

export default NotificationSetupModal;
