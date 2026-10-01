"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AddFab } from "@/components/layout/add-fab";
import { OfflineBanner } from "@/components/online-status";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SearchEntry } from "@/components/layout/search-entry";
import { Sidebar } from "@/components/layout/sidebar";

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

// Layout of every signed-in screen: sidebar on desktop, bottom bar + floating
// add button on mobile, global search entry at the top.
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Desktop keyboard shortcuts: "/" opens search, "n" opens quick add.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (event.key === "/") {
        event.preventDefault();
        router.push("/search");
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        router.push("/add");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        {pathname !== "/search" && (
          <header className="sticky top-0 z-20 border-b border-chrome-raised bg-chrome pt-[env(safe-area-inset-top)] text-chrome-fg">
            <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2 lg:px-8">
              <Link href="/" aria-label="Accueil" className="text-xl font-bold tracking-tight lg:hidden">
                s<span className="text-chrome-active">E</span>
              </Link>
              <SearchEntry />
            </div>
          </header>
        )}
        <main
          key={pathname}
          className="mx-auto w-full max-w-5xl flex-1 animate-enter px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-8 lg:pb-8"
        >
          {children}
        </main>
      </div>
      <AddFab />
      <BottomNav />
    </div>
  );
}
