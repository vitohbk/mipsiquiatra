import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";
import { assertString } from "../_shared/validation.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    assertString(payload.tenant_id, "tenant_id");

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createUserClient(authHeader);
    const { data: membership, error: membershipError } = await userClient
      .from("memberships")
      .select("id")
      .eq("tenant_id", payload.tenant_id)
      .maybeSingle();

    if (membershipError) {
      return new Response(JSON.stringify({ error: membershipError.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createAdminClient();
    const { data: members, error: membersError } = await admin
      .from("memberships")
      .select("id, tenant_id, user_id, role, secondary_role")
      .eq("tenant_id", payload.tenant_id);

    if (membersError) {
      return new Response(JSON.stringify({ error: membersError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = (members ?? []).map((member) => member.user_id);
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("user_id, email, full_name, specialty")
      .in("user_id", userIds);

    if (profilesError) {
      return new Response(JSON.stringify({ error: profilesError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
    const enriched = (members ?? []).map((member) => ({
      ...member,
      profiles: profileMap.get(member.user_id) ?? null,
    }));

    return new Response(JSON.stringify({ members: enriched }), {
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
