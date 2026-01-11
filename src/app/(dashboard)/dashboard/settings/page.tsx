"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useActiveTenant } from "@/lib/tenant/useActiveTenant";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  branding: Record<string, unknown> | null;
};

const slugPattern = /^[a-z0-9-]+$/;

export default function SettingsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const { activeTenantId } = useActiveTenant();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [brandColor, setBrandColor] = useState("#0f172a");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!activeTenantId) return;
      const { data, error: loadError } = await supabase
        .from("tenants")
        .select("id, name, slug, branding")
        .eq("id", activeTenantId)
        .maybeSingle();

      if (loadError) {
        setError(loadError.message);
        return;
      }

      if (data) {
        const tenantData = data as Tenant;
        setTenant(tenantData);
        setName(tenantData.name);
        setSlug(tenantData.slug);
        const color = (tenantData.branding as { brand_color?: string } | null)?.brand_color;
        if (color) setBrandColor(color);
      }
    };

    load();
  }, [supabase, activeTenantId]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!activeTenantId) {
      setError("Selecciona un tenant primero.");
      return;
    }

    if (!slugPattern.test(slug)) {
      setError("Slug invalido. Usa minusculas, numeros y guiones.");
      return;
    }

    const { error: updateError } = await (supabase
      .from("tenants") as any)
      .update({
        name,
        slug,
        branding: { ...(tenant?.branding ?? {}), brand_color: brandColor },
      })
      .eq("id", activeTenantId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setNotice("Actualizado.");
  };

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-[var(--panel-muted)]">Branding, slug y preferencias.</p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}

      <form
        className="space-y-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6"
        onSubmit={handleSave}
      >
        <label className="block text-sm">
          Nombre del tenant
          <input
            className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Slug
          <input
            className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
            value={slug}
            onChange={(event) => setSlug(event.target.value.trim())}
            required
          />
        </label>
        <label className="block text-sm">
          Color principal
          <input
            className="mt-2 h-12 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
            type="color"
            value={brandColor}
            onChange={(event) => setBrandColor(event.target.value)}
          />
        </label>
        <button
          className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
          type="submit"
        >
          Guardar cambios
        </button>
      </form>
    </section>
  );
}
