import React from 'react';
import { NotificationState } from '../types/ViewerToolbarTypes';

interface NotificationToastProps {
  notification: NotificationState | null;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification }) => {
  if (!notification) return null;

  return (
    <div className={`notification-toast ${notification.type}`}>
      <span className="notification-message">{notification.message}</span>
    </div>
  );
};