import Link from "next/link";
import { Search } from "lucide-react";

// Global search entry, shown on every screen. Opens the search screen,
// where the real input lives.
export function SearchEntry() {
  return (
    <Link
      href="/search"
      className="flex min-h-touch flex-1 items-center gap-2 rounded-full border border-transparent bg-chrome-raised px-4 text-chrome-muted transition-colors duration-150 hover:border-chrome-active"
    >
      <Search aria-hidden size={20} />
      <span className="flex-1 truncate">Rechercher une pièce…</span>
      <kbd className="hidden rounded border border-chrome-muted/40 px-1.5 text-xs lg:inline">/</kbd>
    </Link>
  );
}
