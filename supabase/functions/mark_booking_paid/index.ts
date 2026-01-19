import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { assertString } from "../_shared/validation.ts";

const allowedRoles = ["owner", "admin", "staff"] as const;

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    assertString(payload.booking_id, "booking_id");
    const requestedStatus = payload.status?.toString() ?? "paid";
    if (!["paid", "unpaid"].includes(requestedStatus)) {
      return new Response(JSON.stringify({ error: "Invalid status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const tokenFromBody = typeof payload.auth_token === "string" ? payload.auth_token : null;
    const token = tokenFromBody ?? tokenFromHeader;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const userId = authData?.user?.id ?? null;

    if (authError || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, tenant_id, status, payment_id, services(price_clp, payment_mode, deposit_amount_clp, currency)")
      .eq("id", payload.booking_id)
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

    const { data: membership, error: membershipError } = await admin
      .from("memberships")
      .select("role, secondary_role")
      .eq("tenant_id", booking.tenant_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      return new Response(JSON.stringify({ error: membershipError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const role = membership?.role ?? null;
    const secondaryRole = membership?.secondary_role ?? null;
    const canManage =
      (role && allowedRoles.includes(role as (typeof allowedRoles)[number])) ||
      (secondaryRole && allowedRoles.includes(secondaryRole as (typeof allowedRoles)[number]));

    if (!canManage) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.payment_id) {
      const updatePayload = requestedStatus === "paid"
        ? { status: "paid", paid_at: new Date().toISOString() }
        : { status: "pending", paid_at: null };
      const { data: payment, error: updateError } = await admin
        .from("payments")
        .update(updatePayload)
        .eq("id", booking.payment_id)
        .select("id, status")
        .maybeSingle();

      if (updateError || !payment) {
        return new Response(JSON.stringify({ error: updateError?.message ?? "Payment update failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ payment_id: payment.id, status: payment.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (requestedStatus === "unpaid") {
      return new Response(JSON.stringify({ error: "No payment to unmark" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = booking.services as {
      price_clp?: number | null;
      payment_mode?: string | null;
      deposit_amount_clp?: number | null;
      currency?: string | null;
    } | null;

    if (!service) {
      return new Response(JSON.stringify({ error: "Service not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = service.payment_mode === "deposit"
      ? (service.deposit_amount_clp ?? service.price_clp ?? 0)
      : (service.price_clp ?? 0);

    if (!amount) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentInsert = await admin
      .from("payments")
      .insert({
        tenant_id: booking.tenant_id,
        provider: "mercadopago",
        idempotency_key: crypto.randomUUID(),
        amount_clp: amount,
        currency: service.currency ?? "CLP",
        status: "paid",
        paid_at: new Date().toISOString(),
        raw_response: { manual: true, booking_id: booking.id },
      })
      .select("id, status")
      .single();

    if (paymentInsert.error || !paymentInsert.data) {
      return new Response(JSON.stringify({ error: paymentInsert.error?.message ?? "Payment insert failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: bookingUpdateError } = await admin
      .from("bookings")
      .update({ payment_id: paymentInsert.data.id })
      .eq("id", booking.id);

    if (bookingUpdateError) {
      return new Response(JSON.stringify({ error: bookingUpdateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ payment_id: paymentInsert.data.id, status: paymentInsert.data.status }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
