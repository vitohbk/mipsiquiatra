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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
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
        const logo = (tenantData.branding as { logo_url?: string } | null)?.logo_url;
        if (logo) setLogoUrl(logo);
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

    let nextLogoUrl = logoUrl;
    if (logoFile) {
      const extension = logoFile.name.split(".").pop() ?? "png";
      const filePath = `tenant-${activeTenantId}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("tenant-avatars")
        .upload(filePath, logoFile, {
          upsert: true,
          contentType: logoFile.type || "image/png",
        });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("tenant-avatars").getPublicUrl(filePath);
      nextLogoUrl = publicUrlData?.publicUrl ?? null;
      setLogoUrl(nextLogoUrl);
    }

    const { error: updateError } = await (supabase
      .from("tenants") as any)
      .update({
        name,
        slug,
        branding: { ...(tenant?.branding ?? {}), logo_url: nextLogoUrl },
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
        <h1 className="text-xl font-semibold md:text-2xl">Settings</h1>
        <p className="text-sm text-[var(--panel-muted)]">Branding, slug y preferencias.</p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}

      <form
        className="space-y-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6"
        onSubmit={handleSave}
      >
        <div>
          <p className="text-sm">Logo (avatar del tenant)</p>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[var(--panel-border)] bg-white">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo del tenant" className="h-full w-full object-contain p-1" />
              ) : null}
            </div>
            <label className="text-sm">
              <input
                type="file"
                accept="image/*"
                className="block text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setLogoFile(file);
                }}
              />
              <span className="mt-1 block text-xs text-[var(--panel-muted)]">
                JPG o PNG. Se guarda en Supabase Storage.
              </span>
            </label>
          </div>
        </div>
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
