"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LocationDetail } from "@/components/locations/location-detail";
import { LocationRoot } from "@/components/locations/location-root";

// One static page for the whole tree: /locations lists the roots,
// /locations?id=<uuid> shows one location (the URL encoded in QR labels).
export default function LocationsPage() {
  return (
    <Suspense>
      <LocationsScreen />
    </Suspense>
  );
}

function LocationsScreen() {
  const id = useSearchParams().get("id");
  return id ? <LocationDetail key={id} id={id} /> : <LocationRoot />;
}
