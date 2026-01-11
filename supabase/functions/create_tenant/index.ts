import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";
import { assertSlug, assertString } from "../_shared/validation.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const userClient = createUserClient(authHeader);
    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    assertString(payload.name, "name");
    assertString(payload.slug, "slug");
    assertSlug(payload.slug);

    const admin = createAdminClient();
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({
        name: payload.name,
        slug: payload.slug,
        branding: payload.branding ?? {},
      })
      .select("id, slug")
      .single();

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ error: tenantError?.message ?? "Tenant create failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const membershipInsert = await admin.from("memberships").insert({
      tenant_id: tenant.id,
      user_id: userData.user.id,
      role: "owner",
    });

    if (membershipInsert.error) {
      await admin.from("tenants").delete().eq("id", tenant.id);
      return new Response(JSON.stringify({ error: membershipInsert.error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        user_id: userData.user.id,
        email: userData.user.email,
        full_name: userData.user.user_metadata?.full_name ?? null,
        active_tenant_id: tenant.id,
      },
      { onConflict: "user_id" },
    );

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ tenant_id: tenant.id, slug: tenant.slug }), {
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
