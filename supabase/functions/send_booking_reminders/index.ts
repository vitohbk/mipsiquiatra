import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const notifyUrl = Deno.env.get("NOTIFY_WEBHOOK_URL") ?? "";
const notifySecret = Deno.env.get("NOTIFY_WEBHOOK_SECRET") ?? "";
const reminderHours = Number(Deno.env.get("BOOKING_REMINDER_HOURS") ?? "24");

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  if (!notifyUrl || !notifySecret) {
    return new Response(JSON.stringify({ error: "Missing notification configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const now = new Date();
    const start = new Date(now.getTime() + reminderHours * 3600000);
    const end = new Date(start.getTime() + 60 * 60000);

    const admin = createAdminClient();
    const { data: bookings, error } = await admin
      .from("bookings")
      .select("id, customer_name, customer_email, start_at, tenants(name, timezone), services(name)")
      .eq("status", "confirmed")
      .is("reminder_sent_at", null)
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString());

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    for (const booking of bookings ?? []) {
      const recipient = booking.customer_email;
      if (!recipient) continue;

      const timezone = booking.tenants?.timezone ?? "America/Santiago";

      const notifyResponse = await fetch(notifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${notifySecret}`,
        },
        body: JSON.stringify({
          type: "reminder",
          to: recipient,
          customer_name: booking.customer_name ?? null,
          service_name: booking.services?.name ?? null,
          tenant_name: booking.tenants?.name ?? null,
          start_at: booking.start_at,
          timezone,
        }),
      });

      if (notifyResponse.ok) {
        sent += 1;
        await admin
          .from("bookings")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", booking.id);
      }
    }

    return new Response(JSON.stringify({ status: "ok", sent }), {
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
