"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "activeTenantId";

export function useActiveTenant() {
  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  const updateActiveTenantId = useCallback((tenantId: string | null) => {
    if (tenantId) {
      window.localStorage.setItem(STORAGE_KEY, tenantId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setActiveTenantId(tenantId);
  }, []);

  return { activeTenantId, setActiveTenantId: updateActiveTenantId };
}
