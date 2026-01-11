import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { assertISODate, assertString } from "../_shared/validation.ts";

const LOCK_MINUTES = Number(Deno.env.get("BOOKING_LOCK_MINUTES") ?? "10");
const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";
const mpWebhookUrl = Deno.env.get("MERCADOPAGO_WEBHOOK_URL") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const mpSandbox = (Deno.env.get("MERCADOPAGO_SANDBOX") ?? "false").toLowerCase() === "true";

function toDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid datetime");
  }
  return date;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const slug = payload.slug?.toString();
    const publicToken = payload.public_token?.toString();

    if (!slug && !publicToken) {
      return new Response(JSON.stringify({ error: "slug or public_token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    assertString(payload.customer_name, "customer_name");
    assertString(payload.customer_email, "customer_email");
    assertString(payload.idempotency_key, "idempotency_key");
    assertISODate(payload.start_at, "start_at");
    const patient = payload.patient ?? null;
    if (!patient) {
      return new Response(JSON.stringify({ error: "patient required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    assertString(patient.first_name, "patient.first_name");
    assertString(patient.last_name, "patient.last_name");
    assertString(patient.rut, "patient.rut");
    assertString(patient.birth_date, "patient.birth_date");
    assertString(patient.email, "patient.email");
    assertString(patient.phone, "patient.phone");
    assertString(patient.address_line, "patient.address_line");
    assertString(patient.comuna, "patient.comuna");
    assertString(patient.region, "patient.region");
    assertString(patient.health_insurance, "patient.health_insurance");

    const admin = createAdminClient();

    const bookingLinkQuery = admin
      .from("public_booking_links")
      .select(
        "id, tenant_id, slug, service_id, professional_user_id, services(id, name, duration_minutes, price_clp, payment_mode, deposit_amount_clp, currency, is_active, requires_payment, max_advance_hours)",
      )
      .eq("is_active", true);

    if (slug) {
      bookingLinkQuery.eq("slug", slug);
    } else {
      bookingLinkQuery.eq("public_token", publicToken);
    }

    const { data: bookingLink, error: bookingLinkError } = await bookingLinkQuery.maybeSingle();

    if (bookingLinkError || !bookingLink) {
      return new Response(JSON.stringify({ error: "Booking link not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = bookingLink.services as {
      id: string;
      name: string;
      duration_minutes: number;
      price_clp: number;
      payment_mode: string;
      deposit_amount_clp: number | null;
      currency: string;
      is_active: boolean;
      requires_payment?: boolean;
      max_advance_hours?: number;
    } | null;

    if (!service || !service.is_active) {
      return new Response(JSON.stringify({ error: "Service not available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startAt = toDate(payload.start_at);
    const endAt = payload.end_at ? toDate(payload.end_at) : new Date(startAt.getTime() + service.duration_minutes * 60000);
    const expectedEndAt = new Date(startAt.getTime() + service.duration_minutes * 60000);

    if (endAt.getTime() !== expectedEndAt.getTime()) {
      return new Response(JSON.stringify({ error: "End time must match service duration" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const minAdvanceHours = service.max_advance_hours ?? 72;
    const minAdvanceDate = new Date(Date.now() + minAdvanceHours * 60 * 60 * 1000);
    if (startAt < minAdvanceDate) {
      return new Response(JSON.stringify({ error: "Date is too soon for this service" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingPayment = await admin
      .from("payments")
      .select("id, status, raw_response")
      .eq("tenant_id", bookingLink.tenant_id)
      .eq("idempotency_key", payload.idempotency_key)
      .maybeSingle();

    if (existingPayment.data) {
      return new Response(JSON.stringify({
        payment_id: existingPayment.data.id,
        status: existingPayment.data.status,
        redirect_url: existingPayment.data.raw_response?.redirect_url ?? null,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nowIso = new Date().toISOString();
    await admin
      .from("booking_locks")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expires_at", nowIso);

    const overlapBookings = await admin
      .from("bookings")
      .select("id")
      .eq("professional_user_id", bookingLink.professional_user_id)
      .eq("status", "confirmed")
      .lt("start_at", endAt.toISOString())
      .gt("end_at", startAt.toISOString())
      .limit(1);

    if (overlapBookings.data && overlapBookings.data.length > 0) {
      return new Response(JSON.stringify({ error: "Slot already booked" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const overlapLocks = await admin
      .from("booking_locks")
      .select("id")
      .eq("professional_user_id", bookingLink.professional_user_id)
      .eq("status", "active")
      .gt("expires_at", nowIso)
      .lt("start_at", endAt.toISOString())
      .gt("end_at", startAt.toISOString())
      .limit(1);

    if (overlapLocks.data && overlapLocks.data.length > 0) {
      return new Response(JSON.stringify({ error: "Slot temporarily held" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requiresPayment = service.requires_payment !== false;

    const { data: patientUpsert, error: patientError } = await admin.from("patients").upsert(
      {
        tenant_id: bookingLink.tenant_id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        rut: patient.rut,
        birth_date: patient.birth_date,
        email: patient.email,
        phone: patient.phone,
        address_line: patient.address_line,
        comuna: patient.comuna,
        region: patient.region,
        health_insurance: patient.health_insurance,
      },
      { onConflict: "tenant_id,rut" },
    ).select("id").single();

    if (patientError || !patientUpsert) {
      return new Response(JSON.stringify({ error: patientError?.message ?? "Patient upsert failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!requiresPayment) {
      const bookingInsert = await admin.from("bookings").insert({
        tenant_id: bookingLink.tenant_id,
        service_id: bookingLink.service_id,
        professional_user_id: bookingLink.professional_user_id,
        patient_id: patientUpsert.id,
        customer_name: payload.customer_name,
        customer_email: payload.customer_email,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: "confirmed",
      }).select("id").single();

      if (bookingInsert.error) {
        return new Response(JSON.stringify({ error: bookingInsert.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        booking_id: bookingInsert.data.id,
        status: "confirmed",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = service.payment_mode === "deposit"
      ? (service.deposit_amount_clp ?? service.price_clp)
      : service.price_clp;

    const lockToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + LOCK_MINUTES * 60000);

    let lockInsert = await admin.from("booking_locks").insert({
      tenant_id: bookingLink.tenant_id,
      service_id: bookingLink.service_id,
      professional_user_id: bookingLink.professional_user_id,
      patient_id: patientUpsert.id,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      lock_token: lockToken,
      status: "active",
    }).select("id").single();

    if (lockInsert.error?.message?.includes("booking_locks_no_overlap")) {
      await admin
        .from("booking_locks")
        .delete()
        .eq("professional_user_id", bookingLink.professional_user_id)
        .lt("expires_at", nowIso)
        .lt("start_at", endAt.toISOString())
        .gt("end_at", startAt.toISOString());

      lockInsert = await admin.from("booking_locks").insert({
        tenant_id: bookingLink.tenant_id,
        service_id: bookingLink.service_id,
        professional_user_id: bookingLink.professional_user_id,
        patient_id: patientUpsert.id,
        customer_name: payload.customer_name,
        customer_email: payload.customer_email,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        lock_token: lockToken,
        status: "active",
      }).select("id").single();
    }

    if (lockInsert.error) {
      return new Response(JSON.stringify({ error: lockInsert.error.message }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!mpAccessToken) {
      return new Response(JSON.stringify({ error: "Missing MERCADOPAGO_ACCESS_TOKEN" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const returnUrlRaw = payload.return_url?.toString().trim() ?? "";
    let returnUrl: string | null = null;
    if (returnUrlRaw) {
      try {
        const parsed = new URL(returnUrlRaw);
        if (parsed.protocol === "https:" || parsed.protocol === "http:") {
          returnUrl = parsed.toString();
        }
      } catch (_error) {
        returnUrl = null;
      }
    }

    const paymentInsert = await admin.from("payments").insert({
      tenant_id: bookingLink.tenant_id,
      provider: "mercadopago",
      idempotency_key: payload.idempotency_key,
      amount_clp: amount,
      currency: service.currency ?? "CLP",
      status: "pending",
      raw_response: {
        lock_token: lockToken,
      },
    }).select("id").single();

    if (paymentInsert.error) {
      await admin.from("booking_locks").delete().eq("id", lockInsert.data.id);
      return new Response(JSON.stringify({ error: paymentInsert.error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        lock_token: lockToken,
        tenant_id: bookingLink.tenant_id,
      },
    };

    const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": payload.idempotency_key,
      },
      body: JSON.stringify(preferencePayload),
    });

    if (!preferenceResponse.ok) {
      const errorBody = await preferenceResponse.text();
      await admin.from("booking_locks").delete().eq("id", lockInsert.data.id);
      await admin.from("payments").delete().eq("id", paymentInsert.data.id);
      return new Response(JSON.stringify({ error: `MercadoPago error: ${errorBody}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const preference = await preferenceResponse.json();
    const redirectUrl = mpSandbox ? preference.sandbox_init_point : preference.init_point;

    await admin.from("payments").update({
      provider_reference: preference.id ?? null,
      raw_response: {
        lock_token: lockToken,
        preference_id: preference.id ?? null,
        init_point: preference.init_point ?? null,
        sandbox_init_point: preference.sandbox_init_point ?? null,
      },
    }).eq("id", paymentInsert.data.id);

    return new Response(JSON.stringify({
      payment_id: paymentInsert.data.id,
      redirect_url: redirectUrl ?? null,
      lock_token: lockToken,
      expires_at: expiresAt.toISOString(),
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
