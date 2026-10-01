import { env } from "@/lib/env";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// In-app path of a location screen. A query parameter (not a dynamic segment)
// keeps /locations a single static page that the service worker can cache.
export function locationPath(id: string): string {
  return `/locations?id=${id}`;
}

// Absolute URL encoded in a location QR code, so the phone's own camera app
// also opens the right screen.
export function locationQrUrl(id: string): string {
  const base = env.appUrl ?? window.location.origin;
  return `${base.replace(/\/$/, "")}${locationPath(id)}`;
}

// Extracts a location id from scanned QR text, or null if it is not one of
// our location labels. The host is ignored so labels survive a domain change.
export function parseLocationQr(text: string): string | null {
  try {
    const url = new URL(text);
    if (url.pathname.replace(/\/$/, "") !== "/locations") return null;
    const id = url.searchParams.get("id");
    return id && UUID.test(id) ? id : null;
  } catch {
    return null;
  }
}
