import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { assertString } from "../_shared/validation.ts";

const allowedRoles = ["admin", "professional", "staff"] as const;

type Role = typeof allowedRoles[number];

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    assertString(payload.tenant_id, "tenant_id");
    assertString(payload.full_name, "full_name");
    assertString(payload.email, "email");
    assertString(payload.role, "role");
    if (payload.specialty !== undefined && payload.specialty !== null) {
      assertString(payload.specialty, "specialty");
    }

    if (!allowedRoles.includes(payload.role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createAdminClient();

    let userId: string | null = null;
    const { data: userLookup, error: lookupError } = await admin.auth.admin.getUserByEmail(payload.email);
    if (lookupError) {
      return new Response(JSON.stringify({ error: lookupError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userLookup?.user) {
      userId = userLookup.user.id;
    } else {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(payload.email, {
        data: { full_name: payload.full_name },
      });
      if (error || !data.user) {
        return new Response(JSON.stringify({ error: error?.message ?? "Invite failed. Revisa SMTP." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = data.user.id;
    }

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        user_id: userId,
        email: payload.email,
        full_name: payload.full_name,
        specialty: payload.specialty ? payload.specialty.trim() : null,
      },
      { onConflict: "user_id" },
    );

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: membershipError } = await admin.from("memberships").upsert(
      {
        tenant_id: payload.tenant_id,
        user_id: userId,
        role: payload.role as Role,
      },
      { onConflict: "tenant_id,user_id" },
    );

    if (membershipError) {
      return new Response(JSON.stringify({ error: membershipError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "ok", user_id: userId }), {
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
