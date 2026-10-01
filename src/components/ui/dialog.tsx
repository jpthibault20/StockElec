"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

// Modal built on the native <dialog> element (focus trap, Escape to close and
// backdrop come from the browser). Bottom sheet on mobile, centred on desktop.
export function Dialog({ open, title, onClose, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop targets the dialog element itself.
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "mx-auto mt-auto mb-0 max-h-[90dvh] w-full max-w-lg rounded-t-card bg-surface p-0 text-fg open:animate-sheet",
        "sm:m-auto sm:w-[calc(100%-2rem)] sm:rounded-card",
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-muted py-2 pr-2 pl-5">
            <h2 className="text-lg font-semibold">{title}</h2>
            <IconButton label="Fermer" onClick={onClose}>
              <X aria-hidden size={22} />
            </IconButton>
          </div>
          <div className="overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            {children}
          </div>
        </div>
      )}
    </dialog>
  );
}
