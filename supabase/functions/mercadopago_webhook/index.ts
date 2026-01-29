import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

type MpPayment = {
  id: number;
  status: string;
  status_detail?: string;
  transaction_amount: number;
  currency_id: string;
  external_reference?: string | null;
  metadata?: {
    payment_id?: string;
    lock_token?: string;
    booking_id?: string;
  };
};

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  if (!mpAccessToken) {
    return new Response(JSON.stringify({ error: "Missing MERCADOPAGO_ACCESS_TOKEN" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const type = payload.type ?? payload.topic ?? "";
    const dataId = payload.data?.id ?? payload.id ?? null;

    if (!dataId || (type && type !== "payment")) {
      return new Response(JSON.stringify({ status: "ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
      },
    });

    if (!paymentResponse.ok) {
      const errorBody = await paymentResponse.text();
      return new Response(JSON.stringify({ error: `MercadoPago fetch error: ${errorBody}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpPayment = (await paymentResponse.json()) as MpPayment;
    const admin = createAdminClient();

    const paymentId = mpPayment.metadata?.payment_id ?? mpPayment.external_reference ?? null;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "Missing payment reference" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select("id, tenant_id, status, amount_clp, raw_response")
      .eq("id", paymentId)
      .maybeSingle();

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

    const amount = Number(mpPayment.transaction_amount);
    if (Number.isNaN(amount) || amount !== payment.amount_clp) {
      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lockToken = mpPayment.metadata?.lock_token ?? payment.raw_response?.lock_token ?? null;
    const bookingId = mpPayment.metadata?.booking_id ?? payment.raw_response?.booking_id ?? null;

    if (mpPayment.status === "approved") {
      if (bookingId) {
        const { error: bookingUpdateError } = await admin
          .from("bookings")
          .update({ payment_id: payment.id })
          .eq("id", bookingId);

        if (bookingUpdateError) {
          return new Response(JSON.stringify({ error: bookingUpdateError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await admin.from("payments").update({
          status: "paid",
          paid_at: new Date().toISOString(),
          provider_reference: String(mpPayment.id),
          raw_response: mpPayment,
        }).eq("id", payment.id);

        return new Response(JSON.stringify({ status: "ok", booking_id: bookingId }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
        console.log("mercadopago_webhook: lock not active, attempting recovery", {
          lockStatus: lockResult.data.status,
          lockId: lockResult.data.id,
          lockToken,
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
          // Best-effort notification placeholder.
        }
      }

      return new Response(JSON.stringify({ status: "ok", booking_id: bookingInsert.data.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (["rejected", "cancelled", "refunded", "charged_back"].includes(mpPayment.status)) {
      await admin.from("payments").update({
        status: "failed",
        provider_reference: String(mpPayment.id),
        raw_response: mpPayment,
      }).eq("id", payment.id);

      if (lockToken) {
        await admin.from("booking_locks").update({ status: "expired" }).eq("lock_token", lockToken);
      }
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
