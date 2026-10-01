"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bell, ChevronRight, Download, FileUp, History, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCategories } from "@/lib/categories";
import { exportStockCsv } from "@/lib/import-export";
import { useLocations } from "@/lib/locations";
import { notificationsEnabled, notificationsSupported, setNotificationsEnabled } from "@/lib/notifications";
import { getSupabase } from "@/lib/supabase/client";

const rowClass = "flex min-h-14 items-center gap-3 rounded-control px-2 hover:bg-surface-muted";

// Secondary screens, data tools and account.
export default function MorePage() {
  const auth = useAuth();
  const categories = useCategories();
  const { tree } = useLocations();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supported = useSyncExternalStore(
    () => () => undefined,
    notificationsSupported,
    () => false,
  );
  const [notifyOn, setNotifyOn] = useState(() => (typeof window === "undefined" ? false : notificationsEnabled()));

  async function onExport() {
    setExporting(true);
    setMessage(null);
    try {
      const count = await exportStockCsv(categories.labelFor, tree);
      setMessage(`${count} article(s) exporté(s).`);
    } catch {
      setMessage("Export impossible. Vérifie la connexion.");
    } finally {
      setExporting(false);
    }
  }

  async function toggleNotifications() {
    const result = await setNotificationsEnabled(!notifyOn);
    setNotifyOn(result);
    if (!notifyOn && !result) setMessage("Notifications refusées par le navigateur.");
  }

  return (
    <>
      <PageHeader title="Plus" />
      <div className="flex flex-col gap-4">
        <Card className="p-2">
          <Link href="/history" className={rowClass}>
            <History aria-hidden size={20} className="text-accent-fg" />
            <span className="flex-1 font-medium">Historique des mouvements</span>
            <ChevronRight aria-hidden size={20} className="text-muted" />
          </Link>
          <button type="button" onClick={onExport} disabled={exporting} className={`${rowClass} w-full text-left`}>
            <Download aria-hidden size={20} className="text-accent-fg" />
            <span className="flex-1 font-medium">{exporting ? "Export en cours…" : "Exporter le stock (CSV)"}</span>
          </button>
          <Link href="/import" className={rowClass}>
            <FileUp aria-hidden size={20} className="text-accent-fg" />
            <span className="flex-1 font-medium">Importer un CSV</span>
            <ChevronRight aria-hidden size={20} className="text-muted" />
          </Link>
          {supported && (
            <label className={`${rowClass} cursor-pointer`}>
              <Bell aria-hidden size={20} className="text-accent-fg" />
              <span className="flex-1 font-medium">
                Notification de stock faible
                <span className="block text-sm font-normal text-muted">Quand un article passe sous son seuil</span>
              </span>
              <input
                type="checkbox"
                checked={notifyOn}
                onChange={toggleNotifications}
                className="size-6 accent-[var(--primary)]"
              />
            </label>
          )}
        </Card>

        {message && <p role="status" className="rounded-control bg-surface-muted px-3 py-2 text-sm font-medium">{message}</p>}

        <Card className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-muted">Connecté en tant que</p>
            <p className="font-medium break-all">{auth.session?.user.email}</p>
          </div>
          <Button variant="danger" icon={<LogOut aria-hidden size={20} />} onClick={() => setConfirmSignOut(true)}>
            Se déconnecter
          </Button>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmSignOut}
        title="Se déconnecter ?"
        description="Il faudra saisir à nouveau l'email et le mot de passe. Les données gardées pour le hors ligne sont effacées."
        confirmLabel="Se déconnecter"
        tone="danger"
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => {
          setConfirmSignOut(false);
          void getSupabase().auth.signOut();
        }}
      />
    </>
  );
}
