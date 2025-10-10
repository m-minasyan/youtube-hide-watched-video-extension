export const NotificationType = {
  ERROR: 'error',
  WARNING: 'warning',
  SUCCESS: 'success',
  INFO: 'info'
};

// Storage for active notifications
const activeNotifications = new Map();

export function showNotification(message, type = NotificationType.INFO, duration = 3000) {
  const container = getOrCreateNotificationContainer();
  const notification = createNotificationElement(message, type);

  container.appendChild(notification);

  const id = Date.now() + Math.random();
  activeNotifications.set(id, notification);

  // Animate in
  requestAnimationFrame(() => {
    notification.classList.add('visible');
  });

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => {
      dismissNotification(id, notification);
    }, duration);
  }

  return id;
}

function getOrCreateNotificationContainer() {
  let container = document.getElementById('yt-hwv-notifications');
  if (!container) {
    container = document.createElement('div');
    container.id = 'yt-hwv-notifications';
    container.className = 'yt-hwv-notification-container';
    document.body.appendChild(container);
  }
  return container;
}

function createNotificationElement(message, type) {
  const notification = document.createElement('div');
  notification.className = `yt-hwv-notification ${type}`;

  const icon = getIconForType(type);

  // Create elements safely without innerHTML to prevent XSS
  const iconDiv = document.createElement('div');
  iconDiv.className = 'notification-icon';
  iconDiv.textContent = icon;

  const messageDiv = document.createElement('div');
  messageDiv.className = 'notification-message';
  messageDiv.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'notification-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '×';

  notification.appendChild(iconDiv);
  notification.appendChild(messageDiv);
  notification.appendChild(closeBtn);

  closeBtn.addEventListener('click', () => {
    dismissNotification(null, notification);
  });

  return notification;
}

function getIconForType(type) {
  const icons = {
    error: '⚠',
    warning: '⚠',
    success: '✓',
    info: 'ℹ'
  };
  return icons[type] || icons.info;
}

function dismissNotification(id, notification) {
  notification.classList.remove('visible');
  setTimeout(() => {
    notification.remove();
    if (id) {
      activeNotifications.delete(id);
    }
  }, 300);
}

export function clearAllNotifications() {
  activeNotifications.forEach((notification) => {
    dismissNotification(null, notification);
  });
  activeNotifications.clear();
}
