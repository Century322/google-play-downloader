import { useState, useEffect, useCallback } from "react";
import { TrackedApp, AppDetails } from "../types";

const STORAGE_KEY = "gp_downloader_tracked_apps";

function loadTrackedApps(): TrackedApp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTrackedApps(apps: TrackedApp[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch {
    // QuotaExceededError or disabled storage: silently ignore
  }
}

export function useTrackedApps() {
  const [trackedApps, setTrackedApps] = useState<TrackedApp[]>(loadTrackedApps);

  useEffect(() => {
    saveTrackedApps(trackedApps);
  }, [trackedApps]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setTrackedApps(loadTrackedApps());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const trackApp = useCallback((details: AppDetails) => {
    setTrackedApps((prev) => {
      if (prev.some((a) => a.appId === details.appId)) return prev;
      const tracked: TrackedApp = {
        appId: details.appId,
        title: details.title,
        icon: details.icon,
        version: details.version,
        trackedAt: Date.now(),
        developer: details.developer,
      };
      return [tracked, ...prev];
    });
  }, []);

  const untrackApp = useCallback((appId: string) => {
    setTrackedApps((prev) => prev.filter((a) => a.appId !== appId));
  }, []);

  const isTracked = useCallback(
    (appId: string) => trackedApps.some((a) => a.appId === appId),
    [trackedApps]
  );

  const updateTrackedVersion = useCallback((appId: string, newVersion: string) => {
    setTrackedApps((prev) =>
      prev.map((a) => (a.appId === appId ? { ...a, version: newVersion } : a))
    );
  }, []);

  return { trackedApps, trackApp, untrackApp, isTracked, updateTrackedVersion };
}
