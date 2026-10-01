"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

// Screens with their own sticky save button, where the FAB would overlap it.
const HIDDEN_ON = ["/add", "/items/edit"];

// Floating add button, always visible on mobile, above the bottom bar.
export function AddFab() {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;
  return (
    <Link
      href="/add"
      aria-label="Ajouter une pièce"
      title="Ajouter une pièce"
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex size-16 items-center justify-center rounded-full bg-primary-solid text-on-primary shadow-lg shadow-black/30 ring-4 ring-bg transition-transform duration-150 active:scale-90 lg:hidden"
    >
      <Plus aria-hidden size={30} strokeWidth={2.4} />
    </Link>
  );
}
