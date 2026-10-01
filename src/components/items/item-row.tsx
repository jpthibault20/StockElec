import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatQuantity } from "@/lib/format";
import type { ItemSummary } from "@/lib/items";

// Compact item line: name, reference details, quantity, optional actions.
export function ItemRow({
  item,
  subtitle,
  actions,
  linked = false,
}: {
  item: ItemSummary;
  subtitle?: string;
  actions?: ReactNode;
  // Makes the name a link to the item screen.
  linked?: boolean;
}) {
  const details = [item.mpn, item.package].filter(Boolean).join(" · ");
  return (
    <div className="flex min-h-14 items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        {linked ? (
          <Link href={`/items?id=${item.id}`} className="block truncate font-medium hover:underline">
            {item.name}
          </Link>
        ) : (
          <p className="truncate font-medium">{item.name}</p>
        )}
        {(details || subtitle) && (
          <p className="truncate text-sm text-muted">{[details, subtitle].filter(Boolean).join(" — ")}</p>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums",
          item.quantity_mode === "exact" && Number(item.quantity) <= 0 ? "bg-alert-soft text-alert" : "bg-surface-muted",
        )}
      >
        {formatQuantity(item)}
      </span>
      {actions}
    </div>
  );
}
