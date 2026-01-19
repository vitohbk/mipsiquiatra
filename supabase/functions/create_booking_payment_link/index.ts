import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";
const mpWebhookUrl = Deno.env.get("MERCADOPAGO_WEBHOOK_URL") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const mpSandbox = (Deno.env.get("MERCADOPAGO_SANDBOX") ?? "false").toLowerCase() === "true";

function parseReturnUrl(value: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
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
    const returnUrl = parseReturnUrl(payload.return_url?.toString() ?? null);

    if (!bookingId) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!mpAccessToken) {
      return new Response(JSON.stringify({ error: "Missing MERCADOPAGO_ACCESS_TOKEN" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createAdminClient();
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select(
        "id, tenant_id, customer_name, customer_email, start_at, end_at, status, payment_id, services(name, price_clp, payment_mode, deposit_amount_clp, currency)",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Booking is cancelled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.payment_id) {
      const { data: existingPayment } = await admin
        .from("payments")
        .select("id, status, raw_response")
        .eq("id", booking.payment_id)
        .maybeSingle();

      if (existingPayment?.status === "paid") {
        return new Response(JSON.stringify({ error: "Booking already paid" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const existingRedirect = existingPayment?.raw_response?.redirect_url ?? null;
      if (existingPayment?.id && existingRedirect) {
        return new Response(
          JSON.stringify({ payment_id: existingPayment.id, redirect_url: existingRedirect }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const service = booking.services as {
      name: string;
      price_clp: number;
      payment_mode: string | null;
      deposit_amount_clp: number | null;
      currency: string | null;
    } | null;

    if (!service) {
      return new Response(JSON.stringify({ error: "Service not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = service.payment_mode === "deposit"
      ? (service.deposit_amount_clp ?? service.price_clp)
      : service.price_clp;

    const paymentInsert = await admin.from("payments").insert({
      tenant_id: booking.tenant_id,
      provider: "mercadopago",
      idempotency_key: crypto.randomUUID(),
      amount_clp: amount,
      currency: service.currency ?? "CLP",
      status: "pending",
      raw_response: {
        booking_id: booking.id,
      },
    }).select("id").single();

    if (paymentInsert.error || !paymentInsert.data) {
      return new Response(JSON.stringify({ error: paymentInsert.error?.message ?? "Payment insert failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let bookingPaymentUpdated = false;
    if (!booking.payment_id) {
      const { error: bookingUpdateError } = await admin
        .from("bookings")
        .update({ payment_id: paymentInsert.data.id })
        .eq("id", booking.id);

      if (bookingUpdateError) {
        await admin.from("payments").delete().eq("id", paymentInsert.data.id);
        return new Response(JSON.stringify({ error: bookingUpdateError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      bookingPaymentUpdated = true;
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const apikeySuffix = anonKey ? `?apikey=${encodeURIComponent(anonKey)}` : "";
    const notificationUrl = mpWebhookUrl
      ? mpWebhookUrl
      : supabaseUrl
        ? `${supabaseUrl}/functions/v1/mercadopago_webhook${apikeySuffix}`
        : "";

    const preferencePayload = {
      items: [
        {
          title: service.name,
          quantity: 1,
          unit_price: amount,
          currency_id: service.currency ?? "CLP",
        },
      ],
      back_urls: returnUrl
        ? { success: returnUrl, failure: returnUrl, pending: returnUrl }
        : undefined,
      auto_return: returnUrl && returnUrl.startsWith("https://") ? "approved" : undefined,
      notification_url: notificationUrl || undefined,
      external_reference: paymentInsert.data.id,
      metadata: {
        payment_id: paymentInsert.data.id,
        booking_id: booking.id,
        tenant_id: booking.tenant_id,
      },
    };

    const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencePayload),
    });

    if (!preferenceResponse.ok) {
      const errorBody = await preferenceResponse.text();
      if (bookingPaymentUpdated) {
        await admin.from("bookings").update({ payment_id: null }).eq("id", booking.id);
      }
      await admin.from("payments").delete().eq("id", paymentInsert.data.id);
      return new Response(JSON.stringify({ error: `MercadoPago error: ${errorBody}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const preference = await preferenceResponse.json();
    const redirectUrl = mpSandbox ? preference.sandbox_init_point : preference.init_point;

    await admin
      .from("payments")
      .update({
        raw_response: {
          booking_id: booking.id,
          preference_id: preference.id ?? null,
          redirect_url: redirectUrl ?? null,
        },
      })
      .eq("id", paymentInsert.data.id);

    return new Response(JSON.stringify({ payment_id: paymentInsert.data.id, redirect_url: redirectUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
