"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";
import { useAuth } from "@/components/auth-provider";

const WEEK = 7 * 24 * 60 * 60 * 1000;
// Bump when cached data shapes change, to drop caches written by older code.
const CACHE_VERSION = "2";

// The query cache is saved in IndexedDB so the stock can be consulted and
// searched without network (spec section 7). Writes need the network.
function createPersister() {
  return createAsyncStoragePersister({
    storage:
      typeof window === "undefined"
        ? undefined
        : {
            getItem: (key) => get<string>(key),
            setItem: (key, value: string) => set(key, value),
            removeItem: (key) => del(key),
          },
    key: "stockelec-query-cache",
    throttleTime: 1000,
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: WEEK,
            retry: 1,
            refetchOnWindowFocus: false,
            // Serve cached data first, even offline.
            networkMode: "offlineFirst",
          },
          // Fail fast offline instead of queueing changes that would be lost on reload.
          mutations: { networkMode: "always" },
        },
      }),
  );
  const [persister] = useState(createPersister);
  const auth = useAuth();

  useEffect(() => {
    if (auth.status !== "signed-out") return;
    client.clear();
    void persister.removeClient();
  }, [auth.status, client, persister]);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: WEEK,
        buster: CACHE_VERSION,
        dehydrateOptions: {
          // Map values (counters, signed photo URLs) do not survive JSON.
          shouldDehydrateQuery: (query) => query.state.status === "success" && !(query.state.data instanceof Map),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
