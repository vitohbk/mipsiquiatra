"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useActiveTenant } from "@/lib/tenant/useActiveTenant";

export default function DashboardHeader({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const { activeTenantId } = useActiveTenant();
  const [tenantName, setTenantName] = useState<string>("Tenant");
  const [tenantLogoUrl, setTenantLogoUrl] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientQuery = searchParams.get("q") ?? "";

  useEffect(() => {
    const load = async () => {
      if (!activeTenantId) return;
      const { data } = await supabase
        .from("tenants")
        .select("name, branding")
        .eq("id", activeTenantId)
        .maybeSingle();
      const tenant = data as { name?: string | null; branding?: Record<string, unknown> | null } | null;
      if (tenant?.name) setTenantName(tenant.name);
      const logo = (tenant?.branding as { logo_url?: string } | null)?.logo_url ?? null;
      setTenantLogoUrl(logo);
    };

    load();
  }, [supabase, activeTenantId]);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--panel-border)] pb-4">
      <div className="flex items-center gap-3">
        {onMenuToggle ? (
          <button
            type="button"
            onClick={onMenuToggle}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--panel-border)] text-[var(--brand-copper)] transition hover:text-[var(--brand-teal)] md:hidden"
            aria-label="Abrir menú"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 6H21M3 12H21M3 18H21"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[var(--panel-border)] bg-white">
            {tenantLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenantLogoUrl} alt={`Logo ${tenantName}`} className="h-full w-full object-contain p-1" />
            ) : (
              <span className="text-xs font-semibold text-[var(--brand-copper)]">
                {tenantName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--brand-copper)]">Agenda</p>
            <h1 className="text-xl font-[var(--font-playfair)] text-[var(--brand-ink)]">{tenantName}</h1>
          </div>
        </div>
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
        <div className="hidden items-center gap-2 md:flex">
          {pathname === "/agenda/services" ? (
            <Link
              className="rounded-full bg-[var(--page-text)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-bg)]"
              href="/agenda/services?create=1"
            >
              Nuevo servicio
            </Link>
          ) : null}
          {pathname === "/agenda/citas" || pathname === "/agenda" ? (
            <Link
              className="rounded-full bg-[var(--page-text)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-bg)]"
              href="/agenda/citas?create=1"
            >
              Nueva cita
            </Link>
          ) : null}
          {pathname === "/agenda/patients" ? (
            <Link
              className="rounded-full bg-[var(--page-text)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-bg)]"
              href="/agenda/patients?create=1"
            >
              Nuevo paciente
            </Link>
          ) : null}
          {pathname === "/agenda/users" ? (
            <Link
              className="rounded-full bg-[var(--page-text)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-bg)]"
              href="/agenda/users?create=1"
            >
              Nuevo usuario
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
