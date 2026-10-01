import Link from "next/link";
import { ArrowRightLeft, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { MOVEMENT_LABELS, type Movement } from "@/lib/history";
import { formatDecimal } from "@/lib/units";

const ICONS = { add: Plus, remove: Minus, move: ArrowRightLeft } as const;

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

// Lines of the movements journal. `showItem` adds the item name (global journal).
export function MovementList({ movements, showItem = true }: { movements: Movement[]; showItem?: boolean }) {
  return (
    <ul className="divide-y divide-border">
      {movements.map((movement) => {
        const Icon = ICONS[movement.type];
        const delta = Number(movement.delta);
        const detail =
          movement.type === "move"
            ? `${movement.from?.name ?? "Sans emplacement"} → ${movement.to?.name ?? "Sans emplacement"}`
            : `${delta > 0 ? "+" : ""}${formatDecimal(delta)}${movement.item?.unit === "gram" ? " g" : movement.item?.unit === "meter" ? " m" : ""}`;
        return (
          <li key={movement.id} className="flex min-h-14 items-center gap-3 py-2">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                movement.type === "remove" ? "bg-alert-soft text-alert" : "bg-accent-soft text-accent-fg",
              )}
            >
              <Icon aria-label={MOVEMENT_LABELS[movement.type]} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              {showItem &&
                (movement.item ? (
                  <Link href={`/items?id=${movement.item_id}`} className="block truncate font-medium hover:underline">
                    {movement.item.name}
                  </Link>
                ) : (
                  <p className="truncate font-medium text-muted">Article supprimé</p>
                ))}
              <p className="truncate text-sm text-muted">
                {MOVEMENT_LABELS[movement.type]} · {detail}
              </p>
            </div>
            <time dateTime={movement.created_at} className="shrink-0 text-xs text-muted tabular-nums">
              {dateFormat.format(new Date(movement.created_at))}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
