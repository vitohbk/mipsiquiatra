import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { assertString } from "../_shared/validation.ts";

async function hashToken(token: string) {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    assertString(payload.token, "token");
    assertString(payload.action, "action");

    const action = payload.action.toString();
    if (!["cancel", "reschedule"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createAdminClient();
    const tokenHash = await hashToken(payload.token.toString());
    const { data: tokenRow, error: tokenError } = await admin
      .from("booking_action_tokens")
      .select("id, booking_id, action, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({ error: "Token not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tokenRow.action !== action) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tokenRow.used_at) {
      return new Response(JSON.stringify({ error: "Token already used" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Token expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, tenant_id, service_id, professional_user_id, customer_name, customer_email, start_at, end_at, status, services(name, duration_minutes)")
      .eq("id", tokenRow.booking_id)
      .maybeSingle();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: bookingError?.message ?? "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pageData } = await admin
      .from("public_booking_pages")
      .select("slug")
      .eq("service_id", booking.service_id)
      .maybeSingle();

    let slug = pageData?.slug ?? null;
    if (!slug) {
      const { data: linkData } = await admin
        .from("public_booking_links")
        .select("slug")
        .eq("service_id", booking.service_id)
        .eq("tenant_id", booking.tenant_id)
        .eq("is_active", true)
        .maybeSingle();
      slug = linkData?.slug ?? null;
    }

    return new Response(JSON.stringify({
      booking: {
        id: booking.id,
        start_at: booking.start_at,
        end_at: booking.end_at,
        status: booking.status,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
      },
      service: {
        id: booking.service_id,
        name: booking.services?.name ?? null,
        duration_minutes: booking.services?.duration_minutes ?? 0,
      },
      slug,
      token_id: tokenRow.id,
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
