"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useActiveTenant } from "@/lib/tenant/useActiveTenant";

export default function DashboardHeader() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const { activeTenantId } = useActiveTenant();
  const [tenantName, setTenantName] = useState<string>("Tenant");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientQuery = searchParams.get("q") ?? "";

  useEffect(() => {
    const load = async () => {
      if (!activeTenantId) return;
      const { data } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", activeTenantId)
        .maybeSingle();
      const tenant = data as { name?: string | null } | null;
      if (tenant?.name) setTenantName(tenant.name);
    };

    load();
  }, [supabase, activeTenantId]);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--panel-border)] pb-4">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--brand-copper)]">Agenda</p>
        <h1 className="text-xl font-[var(--font-playfair)] text-[var(--brand-ink)]">{tenantName}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {pathname === "/agenda/patients" && (
          <label className="text-sm text-[var(--brand-ink)]">
            Buscar paciente
            <input
              className="ml-2 w-64 rounded-2xl border border-[var(--panel-border)] bg-white px-3 py-2 text-sm text-[var(--brand-ink)]"
              value={patientQuery}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                const value = event.target.value;
                if (value) {
                  next.set("q", value);
                } else {
                  next.delete("q");
                }
                router.replace(`/agenda/patients?${next.toString()}`);
              }}
              placeholder="Nombre, RUT, email"
            />
          </label>
        )}
        {(pathname === "/agenda/services") && (
          <Link
            className="rounded-full bg-[var(--page-text)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-bg)]"
            href="/agenda/services?create=1"
          >
            Nuevo servicio
          </Link>
        )}
        {(pathname === "/agenda/citas" || pathname === "/agenda") && (
          <Link
            className="rounded-full bg-[var(--page-text)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-bg)]"
            href="/agenda/citas?create=1"
          >
            Nueva cita
          </Link>
        )}
        {pathname === "/agenda/patients" && (
          <Link
            className="rounded-full bg-[var(--page-text)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-bg)]"
            href="/agenda/patients?create=1"
          >
            Nuevo paciente
          </Link>
        )}
        {pathname === "/agenda/users" && (
          <Link
            className="rounded-full bg-[var(--page-text)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-bg)]"
            href="/agenda/users?create=1"
          >
            Nuevo usuario
          </Link>
        )}
      </div>
    </header>
  );
}
