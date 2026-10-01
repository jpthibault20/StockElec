"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Plus, Printer, ScanLine } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LocationFormDialog } from "@/components/locations/location-form-dialog";
import { LocationRow } from "@/components/locations/location-row";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useItemCountsByLocation } from "@/lib/items";
import { useLocations } from "@/lib/locations";

// Top level of the location tree.
export function LocationRoot() {
  const { tree, isPending, isError } = useLocations();
  const counts = useItemCountsByLocation();
  const [creating, setCreating] = useState(false);
  const roots = tree.childrenOf.get(null) ?? [];

  return (
    <>
      <PageHeader
        title="Emplacements"
        actions={
          <>
            <Link href="/scan" aria-label="Scanner un QR" title="Scanner un QR" className={buttonClasses({ variant: "ghost" })}>
              <ScanLine aria-hidden size={20} />
            </Link>
            {roots.length > 0 && (
              <Link href="/locations/labels" title="Imprimer les étiquettes" className={buttonClasses({ variant: "ghost" })}>
                <Printer aria-hidden size={20} />
                <span className="hidden sm:inline">Étiquettes</span>
              </Link>
            )}
          </>
        }
      />

      {isError && (
        <p role="alert" className="mb-4 text-alert">
          Chargement impossible. Vérifie la connexion.
        </p>
      )}

      {!isPending && roots.length === 0 ? (
        <EmptyState icon={<MapPin aria-hidden size={40} />} title="Aucun emplacement">
          Crée ta première pièce ou ton premier meuble, puis ajoute-y des tiroirs, boîtes ou cartons.
        </EmptyState>
      ) : (
        <Card className="p-2">
          <ul className="divide-y divide-border">
            {roots.map((location) => (
              <li key={location.id}>
                <LocationRow
                  location={location}
                  childCount={tree.childrenOf.get(location.id)?.length ?? 0}
                  itemCount={counts.data?.get(location.id) ?? 0}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Button size="lg" icon={<Plus aria-hidden size={22} />} onClick={() => setCreating(true)} className="mt-4 w-full sm:w-auto">
        Nouvel emplacement
      </Button>

      <LocationFormDialog open={creating} onClose={() => setCreating(false)} parentId={null} />
    </>
  );
}
