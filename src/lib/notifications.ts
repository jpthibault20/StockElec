"use client";

// Optional low-stock notification (spec 4.6). Local notification shown by the
// app when a change makes an item cross its threshold; no push server.

const STORAGE_KEY = "stockelec-low-stock-notifications";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationsEnabled(): boolean {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

// Asks for permission when turning on. Returns the resulting state.
export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (enabled && Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Private mode: the setting simply does not persist.
  }
  return enabled;
}

export async function notifyLowStock(itemName: string, itemId: string): Promise<void> {
  if (!notificationsEnabled()) return;
  const title = "Stock faible";
  const options: NotificationOptions = {
    body: `${itemName} est passé sous son seuil d'alerte.`,
    icon: "/pwa-icon/192",
    tag: `low-stock-${itemId}`,
  };
  // Installed PWAs (Android, iOS) only allow notifications through the service worker.
  const registration = await navigator.serviceWorker?.getRegistration();
  if (registration) await registration.showNotification(title, options);
  else new Notification(title, options);
}
