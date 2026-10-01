import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { locationPath } from "@/lib/location-url";
import type { Location } from "@/lib/locations";

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

// Link to a location screen, with its kind and content counts.
export function LocationRow({
  location,
  childCount,
  itemCount,
}: {
  location: Location;
  childCount: number;
  itemCount: number;
}) {
  const counts = [
    childCount > 0 && plural(childCount, "sous-emplacement", "sous-emplacements"),
    plural(itemCount, "article", "articles"),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={locationPath(location.id)}
      className="flex min-h-16 items-center gap-3 rounded-control px-2 transition-colors duration-150 hover:bg-surface-muted"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-fg">
        <MapPin aria-hidden size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{location.name}</span>
        <span className="block truncate text-sm text-muted">
          {[location.kind, counts].filter(Boolean).join(" — ")}
        </span>
      </span>
      <ChevronRight aria-hidden size={20} className="shrink-0 text-muted" />
    </Link>
  );
}
