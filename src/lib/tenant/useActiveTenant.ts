"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

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

  useEffect(() => {
    const supabase = supabaseBrowser();

    const reconcile = async (userId: string | undefined) => {
      if (!userId) {
        updateActiveTenantId(null);
        return;
      }

      const { data } = await supabase.from("memberships").select("tenant_id");
      const tenantIds = ((data as { tenant_id: string }[] | null) ?? []).map((m) => m.tenant_id);

      setActiveTenantId((current) => {
        const stillValid = current && tenantIds.includes(current);
        const next = stillValid ? current : (tenantIds[0] ?? null);
        if (next !== current) {
          if (next) {
            window.localStorage.setItem(STORAGE_KEY, next);
          } else {
            window.localStorage.removeItem(STORAGE_KEY);
          }
        }
        return next;
      });
    };

    supabase.auth.getSession().then(({ data }) => reconcile(data.session?.user?.id));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      reconcile(session?.user?.id);
    });

    return () => subscription.subscription.unsubscribe();
  }, [updateActiveTenantId]);

  return { activeTenantId, setActiveTenantId: updateActiveTenantId };
}
