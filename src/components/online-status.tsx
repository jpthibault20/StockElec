"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

// Banner shown while offline: the cached stock stays readable and searchable.
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <p role="status" className="flex items-center justify-center gap-2 bg-accent px-4 pt-[calc(0.375rem+env(safe-area-inset-top))] pb-1.5 text-sm font-medium text-on-accent">
      <WifiOff aria-hidden size={16} />
      Hors ligne — consultation seule
    </p>
  );
}
