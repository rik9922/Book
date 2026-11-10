"use client";

import { useEffect } from "react";
import { flushOfflineQueue } from "@/lib/api";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal in unsupported private browsing modes
      });
    }

    const handleOnline = () => {
      flushOfflineQueue().catch(() => {
        // Retry on next connectivity event
      });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return null;
}
