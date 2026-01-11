import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const notifyUrl = Deno.env.get("NOTIFY_WEBHOOK_URL") ?? "";
const notifySecret = Deno.env.get("NOTIFY_WEBHOOK_SECRET") ?? "";

type BookingDetails = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  start_at: string;
  services?: { name: string | null } | null;
  tenants?: { name: string | null; timezone: string | null } | null;
};

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

    if (!bookingId) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!notifyUrl || !notifySecret) {
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
      return new Response(JSON.stringify({ error: "customer_email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timezone = booking.tenants?.timezone ?? "America/Santiago";
    const notifyResponse = await fetch(notifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${notifySecret}`,
      },
      body: JSON.stringify({
        type: "confirmation",
        to: recipient,
        customer_name: booking.customer_name,
        service_name: booking.services?.name ?? null,
        tenant_name: booking.tenants?.name ?? null,
        start_at: booking.start_at,
        timezone,
      }),
    });

    if (!notifyResponse.ok) {
      const errorBody = await notifyResponse.text();
      return new Response(JSON.stringify({ error: `Notify error: ${errorBody}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
