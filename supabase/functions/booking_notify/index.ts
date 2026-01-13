import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const notifyUrl = Deno.env.get("NOTIFY_WEBHOOK_URL") ?? "";
const notifySecret = Deno.env.get("NOTIFY_WEBHOOK_SECRET") ?? "";
const publicSiteUrl = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.mipsiquiatra.cl").replace(/\/$/, "");

type BookingDetails = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  start_at: string;
  services?: { name: string | null } | null;
  tenants?: { name: string | null; timezone: string | null } | null;
};

async function hashToken(token: string) {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createActionToken(admin: ReturnType<typeof createAdminClient>, bookingId: string, action: "cancel" | "reschedule") {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const token = `${crypto.randomUUID()}-${Array.from(randomBytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString();

  const { error } = await admin.from("booking_action_tokens").insert({
    booking_id: bookingId,
    action,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
  if (error) {
    throw new Error(error.message);
  }

  return token;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const bookingId = payload.booking_id?.toString();
    const customerEmail = payload.customer_email?.toString();
    const type = (payload.type ?? "confirmation") as "confirmation" | "cancelled" | "rescheduled";

    if (!bookingId) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!notifyUrl || !notifySecret) {
      console.log("booking_notify: missing notify config", {
        hasNotifyUrl: Boolean(notifyUrl),
        hasNotifySecret: Boolean(notifySecret),
      });
      return new Response(JSON.stringify({ status: "skipped" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createAdminClient();
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, customer_name, customer_email, start_at, services(name), tenants(name, timezone)")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: bookingError?.message ?? "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipient = customerEmail || booking.customer_email;
    if (!recipient) {
      console.log("booking_notify: missing recipient", {
        bookingId: booking.id,
      });
      return new Response(JSON.stringify({ error: "customer_email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timezone = booking.tenants?.timezone ?? "America/Santiago";
    const shouldIncludeActions = type === "confirmation";
    const cancelToken = shouldIncludeActions
      ? await createActionToken(admin, booking.id, "cancel")
      : null;
    const rescheduleToken = shouldIncludeActions
      ? await createActionToken(admin, booking.id, "reschedule")
      : null;
    const notifyResponse = await fetch(notifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${notifySecret}`,
      },
      body: JSON.stringify({
        type,
        to: recipient,
        customer_name: booking.customer_name,
        service_name: booking.services?.name ?? null,
        tenant_name: booking.tenants?.name ?? null,
        start_at: booking.start_at,
        timezone,
        cancel_url: cancelToken ? `${publicSiteUrl}/booking/${cancelToken}/cancelar` : null,
        reschedule_url: rescheduleToken ? `${publicSiteUrl}/booking/${rescheduleToken}/reprogramar` : null,
      }),
    });

    if (!notifyResponse.ok) {
      const errorBody = await notifyResponse.text();
      console.log("booking_notify: webhook error", {
        status: notifyResponse.status,
        body: errorBody,
        recipient,
        bookingId: booking.id,
      });
      return new Response(JSON.stringify({ error: `Notify error: ${errorBody}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("booking_notify: sent", {
      recipient,
      bookingId: booking.id,
      type: payload.type ?? "confirmation",
    });
    return new Response(JSON.stringify({ status: "ok" }), {
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
