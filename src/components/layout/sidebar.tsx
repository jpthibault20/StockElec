"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { ButtonLink } from "@/components/ui/button";
import { NAV_ITEMS, isActive } from "@/components/layout/nav-items";

// Desktop navigation. Hidden on mobile (bottom bar instead).
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-chrome-raised bg-chrome p-4 text-chrome-fg lg:flex">
      <Link href="/" className="px-2 text-xl font-bold tracking-tight">
        stock<span className="text-chrome-active">Elec</span>
      </Link>
      <ButtonLink href="/add" icon={<Plus aria-hidden size={20} />}>
        Ajouter
        <kbd className="ml-auto rounded border border-current/40 px-1.5 text-xs font-normal opacity-80">
          N
        </kbd>
      </ButtonLink>
      <nav aria-label="Navigation principale">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-touch items-center gap-3 rounded-control px-3 font-medium transition-colors duration-150",
                    active ? "bg-chrome-raised text-chrome-active" : "text-chrome-fg/85 hover:bg-chrome-raised hover:text-chrome-fg",
                  )}
                >
                  <Icon aria-hidden size={20} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
