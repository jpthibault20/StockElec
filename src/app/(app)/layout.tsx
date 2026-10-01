"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

// Client-side guard for every authenticated screen. Data access is protected
// by RLS in Supabase; this guard only handles navigation.
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.status === "signed-out") router.replace("/login");
  }, [auth.status, router]);

  if (auth.status !== "signed-in") return null;
  return <>{children}</>;
}
