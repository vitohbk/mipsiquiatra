import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { assertString } from "../_shared/validation.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const slug = payload.slug?.toString();
    const publicToken = payload.public_token?.toString();

    if (!slug && !publicToken) {
      return new Response(JSON.stringify({ error: "slug or public_token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createAdminClient();

    const loadProfessionalName = async (userId?: string | null) => {
      if (!userId) return null;
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", userId)
        .maybeSingle();
      return profile?.full_name ?? profile?.email ?? null;
    };

    if (slug) {
      assertString(slug, "slug");
      const { data, error } = await admin
        .from("public_booking_pages")
        .select(
          "slug, service_id, service_name, description, max_advance_hours, modality, duration_minutes, price_clp, payment_mode, deposit_amount_clp, currency, tenant_name, branding, professional_user_id, requires_payment",
        )
        .eq("slug", slug)
        .maybeSingle();

      if (!error && data) {
        const professionalName = await loadProfessionalName(data.professional_user_id);
        return new Response(JSON.stringify({
          slug: data.slug,
          tenant: { name: data.tenant_name, branding: data.branding },
          service: {
            id: data.service_id,
            name: data.service_name,
            description: data.description,
            max_advance_hours: data.max_advance_hours ?? 72,
            modality: data.modality ?? "zoom",
            duration_minutes: data.duration_minutes,
            price_clp: data.price_clp,
            payment_mode: data.payment_mode,
            deposit_amount_clp: data.deposit_amount_clp,
            currency: data.currency,
            requires_payment: data.requires_payment ?? true,
            professional_name: professionalName,
          },
          professional_user_id: data.professional_user_id,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: linkData, error: linkError } = await admin
        .from("public_booking_links")
        .select(
          "slug, tenants(name, branding, timezone), services(id, name, description, max_advance_hours, modality, duration_minutes, price_clp, payment_mode, deposit_amount_clp, currency, requires_payment), professional_user_id",
        )
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (linkError || !linkData) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const professionalName = await loadProfessionalName(linkData.professional_user_id);
      return new Response(JSON.stringify({
        slug: linkData.slug,
        tenant: linkData.tenants,
        service: {
          ...linkData.services,
          professional_name: professionalName,
        },
        professional_user_id: linkData.professional_user_id,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    assertString(publicToken, "public_token");

    const { data, error } = await admin
      .from("public_booking_links")
      .select(
        "slug, tenants(name, branding, timezone), services(id, name, description, duration_minutes, price_clp, payment_mode, deposit_amount_clp, currency), professional_user_id",
      )
      .eq("public_token", publicToken)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const professionalName = await loadProfessionalName(data.professional_user_id);
    return new Response(JSON.stringify({
      slug: data.slug,
      tenant: data.tenants,
      service: {
        ...data.services,
        professional_name: professionalName,
      },
      professional_user_id: data.professional_user_id,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
