import React, { useState, useEffect } from 'react';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import '../styles/inAppNotification.css';

interface InAppNotificationProps {
  onAction?: () => void;
}

const InAppNotification: React.FC<InAppNotificationProps> = ({ onAction }) => {
  const [visible, setVisible] = useState(false);
  const [notificationData, setNotificationData] = useState<{title: string, body?: string} | null>(null);
  const toastRef = useRef<Toast>(null);

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent<{title: string, body?: string}>;
      setNotificationData(customEvent.detail);
      
      if (toastRef.current) {
        toastRef.current.show({ 
          severity: 'info', 
          summary: customEvent.detail.title, 
          detail: customEvent.detail.body,
          life: 10000,
          closable: true,
          className: 'hydration-notification-toast'
        });
      }
      
      // Also trigger a visual indicator for in-app notifications
      setVisible(true);
      setTimeout(() => setVisible(false), 5000);
    };

    window.addEventListener('showInAppNotification', handleNotification);
    
    return () => {
      window.removeEventListener('showInAppNotification', handleNotification);
    };
  }, []);

  const handleClick = () => {
    if (onAction) {
      onAction();
    }
    setVisible(false);
  };

  return (
    <>
      <Toast ref={toastRef} position="bottom-center" />
      
      {visible && notificationData && (
        <div className="in-app-notification-banner" onClick={handleClick}>
          <div className="notification-icon">💧</div>
          <div className="notification-content">
            <div className="notification-title">{notificationData.title}</div>
            {notificationData.body && (
              <div className="notification-body">{notificationData.body}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default InAppNotification;
