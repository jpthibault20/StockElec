import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatQuantity } from "@/lib/format";
import type { Equivalent } from "@/lib/search/equivalents";

// In-stock replacements for an out-of-stock reference, with what differs.
export function EquivalentsList({
  equivalents,
  locationLabel,
}: {
  equivalents: Equivalent[];
  locationLabel: (locationId: string | null) => string | null;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {equivalents.map(({ entry, differences }) => {
        const where = locationLabel(entry.item.location_id);
        return (
          <li key={entry.item.id}>
            <Card className="flex flex-col gap-2 py-3">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/items?id=${entry.item.id}`} className="min-w-0 font-medium hover:underline">
                  {entry.item.name}
                  {where && <span className="block truncate text-sm font-normal text-muted">{where}</span>}
                </Link>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatQuantity(entry.item)}</span>
              </div>
              {differences.length === 0 ? (
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <CircleCheck aria-hidden size={16} className="text-accent-fg" />
                  Mêmes caractéristiques
                </p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {differences.map((difference) => (
                    <li key={difference.text} className="flex items-start gap-1.5">
                      {difference.warning ? (
                        <CircleAlert aria-label="À vérifier" size={16} className="mt-0.5 shrink-0 text-alert" />
                      ) : (
                        <CircleCheck aria-label="Compatible" size={16} className="mt-0.5 shrink-0 text-accent-fg" />
                      )}
                      <span>{difference.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
