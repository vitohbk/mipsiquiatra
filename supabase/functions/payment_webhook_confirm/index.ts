import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const webhookSecret = Deno.env.get("WEBPAY_WEBHOOK_SECRET") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

async function hmacSha256Hex(secret: string, payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const bytes = new Uint8Array(signature);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    if (!webhookSecret) {
      return new Response(JSON.stringify({ error: "Missing WEBPAY_WEBHOOK_SECRET" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-webhook-signature") ?? "";

    if (!signatureHeader) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedSignature = await hmacSha256Hex(webhookSecret, rawBody);
    if (!constantTimeEqual(signatureHeader, expectedSignature)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    const providerReference = payload.provider_reference?.toString();
    const idempotencyKey = payload.idempotency_key?.toString();
    const status = payload.status?.toString();

    if (!providerReference && !idempotencyKey) {
      return new Response(JSON.stringify({ error: "provider_reference or idempotency_key required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!status) {
      return new Response(JSON.stringify({ error: "status required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createAdminClient();
    let paymentQuery = admin
      .from("payments")
      .select("id, tenant_id, status, amount_clp, raw_response")
      .eq("provider", "webpay");

    if (providerReference) {
      paymentQuery = paymentQuery.eq("provider_reference", providerReference);
    } else {
      paymentQuery = paymentQuery.eq("idempotency_key", idempotencyKey);
    }

    const { data: payment, error: paymentError } = await paymentQuery.maybeSingle();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status === "paid") {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lockToken = payload.lock_token?.toString() ?? payment.raw_response?.lock_token;
    const amount = Number(payload.amount_clp ?? payment.amount_clp);

    if (Number.isNaN(amount)) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (amount !== payment.amount_clp) {
      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (status === "paid") {
      if (!lockToken) {
        return new Response(JSON.stringify({ error: "Missing lock_token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const lockResult = await admin
        .from("booking_locks")
        .select("id, tenant_id, service_id, professional_user_id, patient_id, customer_name, customer_email, start_at, end_at, status")
        .eq("lock_token", lockToken)
        .maybeSingle();

      if (lockResult.error || !lockResult.data) {
        return new Response(JSON.stringify({ error: "Lock not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (lockResult.data.status !== "active") {
        return new Response(JSON.stringify({ error: "Lock not active" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const bookingInsert = await admin.from("bookings").insert({
        tenant_id: lockResult.data.tenant_id,
        service_id: lockResult.data.service_id,
        professional_user_id: lockResult.data.professional_user_id,
        patient_id: lockResult.data.patient_id,
        customer_name: lockResult.data.customer_name,
        customer_email: lockResult.data.customer_email,
        start_at: lockResult.data.start_at,
        end_at: lockResult.data.end_at,
        status: "confirmed",
        payment_id: payment.id,
      }).select("id").single();

      if (bookingInsert.error) {
        return new Response(JSON.stringify({ error: bookingInsert.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin.from("booking_locks").update({ status: "converted" }).eq("id", lockResult.data.id);
      await admin.from("payments").update({
        status: "paid",
        paid_at: new Date().toISOString(),
        provider_reference: providerReference ?? payment.raw_response?.provider_reference ?? null,
        raw_response: payload,
      }).eq("id", payment.id);

      if (supabaseUrl && serviceRoleKey) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/booking_notify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
              apikey: serviceRoleKey,
            },
            body: JSON.stringify({
              booking_id: bookingInsert.data.id,
              customer_email: lockResult.data.customer_email,
              source: "public",
            }),
          });
        } catch {
          // Best-effort notification placeholder.
        }
      }

      return new Response(JSON.stringify({ status: "ok", booking_id: bookingInsert.data.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("payments").update({
      status: status === "failed" ? "failed" : "expired",
      provider_reference: providerReference ?? payment.raw_response?.provider_reference ?? null,
      raw_response: payload,
    }).eq("id", payment.id);

    if (lockToken) {
      await admin.from("booking_locks").update({ status: "expired" }).eq("lock_token", lockToken);
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
