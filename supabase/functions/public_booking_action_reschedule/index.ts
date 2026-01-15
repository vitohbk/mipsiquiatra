import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { assertString } from "../_shared/validation.ts";

const notifyUrl = Deno.env.get("NOTIFY_WEBHOOK_URL") ?? "";
const notifySecret = Deno.env.get("NOTIFY_WEBHOOK_SECRET") ?? "";

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
    assertString(payload.start_at, "start_at");

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

    if (tokenRow.action !== "reschedule") {
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
      .select("id, tenant_id, service_id, professional_user_id, status, start_at, end_at, services(duration_minutes)")
      .eq("id", tokenRow.booking_id)
      .maybeSingle();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: bookingError?.message ?? "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["confirmed", "pending"].includes(booking.status)) {
      return new Response(JSON.stringify({ error: "Booking not reschedulable" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const durationMinutes = booking.services?.duration_minutes ?? 0;
    const startAt = new Date(payload.start_at.toString());
    if (Number.isNaN(startAt.getTime()) || durationMinutes <= 0) {
      return new Response(JSON.stringify({ error: "Invalid start_at" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const endAt = new Date(startAt.getTime() + durationMinutes * 60000);

    const { data: overlap } = await admin
      .from("bookings")
      .select("id")
      .eq("professional_user_id", booking.professional_user_id)
      .eq("status", "confirmed")
      .neq("id", booking.id)
      .lt("start_at", endAt.toISOString())
      .gt("end_at", startAt.toISOString())
      .limit(1);

    if (overlap && overlap.length > 0) {
      return new Response(JSON.stringify({ error: "Slot no disponible" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await admin
      .from("bookings")
      .update({
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: "confirmed",
      })
      .eq("id", booking.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("booking_action_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    if (notifyUrl && notifySecret) {
      const { data: bookingDetails } = await admin
        .from("bookings")
        .select("customer_name, customer_email, services(name), tenants(name, timezone)")
        .eq("id", booking.id)
        .maybeSingle();
      const recipient = bookingDetails?.customer_email;
      if (recipient) {
        const timezone = bookingDetails?.tenants?.timezone ?? "America/Santiago";
        try {
          await fetch(notifyUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${notifySecret}`,
            },
            body: JSON.stringify({
              type: "rescheduled",
              source: "public",
              to: recipient,
              customer_name: bookingDetails?.customer_name ?? null,
              service_name: bookingDetails?.services?.name ?? null,
              tenant_name: bookingDetails?.tenants?.name ?? null,
              start_at: startAt.toISOString(),
              timezone,
            }),
          });
        } catch (_error) {
          // Best-effort notification.
        }
      }
    }

    return new Response(JSON.stringify({ status: "ok", start_at: startAt.toISOString() }), {
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
