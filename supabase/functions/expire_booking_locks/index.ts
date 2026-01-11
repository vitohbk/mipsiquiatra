import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const lockMinutes = Number(Deno.env.get("BOOKING_LOCK_MINUTES") ?? "10");
    const paymentExpireBefore = new Date(Date.now() - lockMinutes * 60000).toISOString();

    const { data, error } = await admin
      .from("booking_locks")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expires_at", now)
      .select("id");

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: paymentData, error: paymentError } = await admin
      .from("payments")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("created_at", paymentExpireBefore)
      .select("id");

    if (paymentError) {
      return new Response(JSON.stringify({ error: paymentError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ expired: data?.length ?? 0, payments_expired: paymentData?.length ?? 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
