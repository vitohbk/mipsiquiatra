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
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--panel-muted)]">Tenant</p>
        <h1 className="text-2xl font-semibold">{tenantName}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {pathname === "/dashboard/patients" && (
          <label className="text-sm">
            Buscar paciente
            <input
              className="ml-2 w-64 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
              value={patientQuery}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                const value = event.target.value;
                if (value) {
                  next.set("q", value);
                } else {
                  next.delete("q");
                }
                router.replace(`/dashboard/patients?${next.toString()}`);
              }}
              placeholder="Nombre, RUT, email"
            />
          </label>
        )}
        {(pathname === "/dashboard/services") && (
          <Link
            className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
            href="/dashboard/services?create=1"
          >
            Nuevo servicio
          </Link>
        )}
        {(pathname === "/dashboard/bookings" || pathname === "/dashboard") && (
          <Link
            className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
            href="/dashboard/bookings?create=1"
          >
            Nueva reserva
          </Link>
        )}
        {pathname === "/dashboard/patients" && (
          <Link
            className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
            href="/dashboard/patients?create=1"
          >
            Nuevo paciente
          </Link>
        )}
        {pathname === "/dashboard/users" && (
          <Link
            className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
            href="/dashboard/users?create=1"
          >
            Nuevo usuario
          </Link>
        )}
      </div>
    </header>
  );
}
