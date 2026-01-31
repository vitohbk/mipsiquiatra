import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";
const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

type MpPayment = {
  id: number;
  status: string;
  transaction_amount: number;
  currency_id: string;
  external_reference?: string | null;
  metadata?: {
    payment_id?: string;
    lock_token?: string;
    booking_id?: string;
  };
};

type SearchResponse = {
  results?: MpPayment[];
};

async function fetchMpPaymentByExternalReference(externalReference: string) {
  const searchUrl = new URL("https://api.mercadopago.com/v1/payments/search");
  searchUrl.searchParams.set("external_reference", externalReference);
  searchUrl.searchParams.set("sort", "date_created");
  searchUrl.searchParams.set("criteria", "desc");
  searchUrl.searchParams.set("limit", "1");

  const response = await fetch(searchUrl.toString(), {
    headers: {
      Authorization: `Bearer ${mpAccessToken}`,
    },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`MercadoPago search error: ${errorBody}`);
  }

  const data = (await response.json()) as SearchResponse;
  return data.results?.[0] ?? null;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  if (!serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing SERVICE_ROLE_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (bearerToken !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!mpAccessToken) {
    return new Response(JSON.stringify({ error: "Missing MERCADOPAGO_ACCESS_TOKEN" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const limit = Math.min(Number(payload.limit ?? 20), 200);
    const since = payload.since?.toString() ?? null;

    const admin = createAdminClient();
    let paymentQuery = admin
      .from("payments")
      .select("id, status, amount_clp, raw_response, created_at")
      .eq("provider", "mercadopago")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (since) {
      paymentQuery = paymentQuery.gte("created_at", since);
    }

    const { data: payments, error: paymentError } = await paymentQuery;
    if (paymentError) {
      return new Response(JSON.stringify({ error: paymentError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let checked = 0;
    let confirmed = 0;
    let skipped = 0;
    let failed = 0;

    for (const payment of payments ?? []) {
      checked += 1;
      const mpPayment = await fetchMpPaymentByExternalReference(payment.id).catch((error) => {
        console.log("reconcile_mp: search failed", { paymentId: payment.id, error: error.message });
        failed += 1;
        return null;
      });
      if (!mpPayment) {
        skipped += 1;
        continue;
      }

      if (mpPayment.status !== "approved") {
        skipped += 1;
        continue;
      }

      const amount = Number(mpPayment.transaction_amount);
      if (Number.isNaN(amount) || amount !== payment.amount_clp) {
        console.log("reconcile_mp: amount mismatch", { paymentId: payment.id, amount, expected: payment.amount_clp });
        failed += 1;
        continue;
      }

      const lockToken = mpPayment.metadata?.lock_token ?? payment.raw_response?.lock_token ?? null;
      const bookingId = mpPayment.metadata?.booking_id ?? payment.raw_response?.booking_id ?? null;

      if (bookingId) {
        await admin.from("bookings").update({ payment_id: payment.id }).eq("id", bookingId);
        await admin.from("payments").update({
          status: "paid",
          paid_at: new Date().toISOString(),
          provider_reference: String(mpPayment.id),
          raw_response: mpPayment,
        }).eq("id", payment.id);
        confirmed += 1;
        continue;
      }

      if (!lockToken) {
        console.log("reconcile_mp: missing lock token", { paymentId: payment.id });
        failed += 1;
        continue;
      }

      const lockResult = await admin
        .from("booking_locks")
        .select("id, tenant_id, service_id, professional_user_id, patient_id, customer_name, customer_email, start_at, end_at")
        .eq("lock_token", lockToken)
        .maybeSingle();

      if (lockResult.error || !lockResult.data) {
        console.log("reconcile_mp: lock not found", { paymentId: payment.id, lockToken });
        failed += 1;
        continue;
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
        console.log("reconcile_mp: booking insert failed", { paymentId: payment.id, error: bookingInsert.error.message });
        failed += 1;
        continue;
      }

      await admin.from("booking_locks").update({ status: "converted" }).eq("id", lockResult.data.id);
      await admin.from("payments").update({
        status: "paid",
        paid_at: new Date().toISOString(),
        provider_reference: String(mpPayment.id),
        raw_response: mpPayment,
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
          // Best-effort notification.
        }
      }

      confirmed += 1;
    }

    return new Response(JSON.stringify({ checked, confirmed, skipped, failed }), {
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
