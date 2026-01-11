import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { assertString } from "../_shared/validation.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const slug = payload.slug?.toString();
    const query = payload.query?.toString();

    if (!slug) {
      return new Response(JSON.stringify({ error: "slug required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    assertString(query, "query");

    const admin = createAdminClient();
    const { data: bookingLink, error: bookingLinkError } = await admin
      .from("public_booking_links")
      .select("tenant_id")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (bookingLinkError || !bookingLink) {
      return new Response(JSON.stringify({ error: "Booking link not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = query.trim().toLowerCase();

    const { data: patients, error: patientError } = await admin
      .from("patients")
      .select(
        "id, first_name, last_name, rut, birth_date, email, phone, address_line, comuna, region, health_insurance",
      )
      .eq("tenant_id", bookingLink.tenant_id)
      .or(
        `rut.ilike.%${normalized}%,email.ilike.%${normalized}%,first_name.ilike.%${normalized}%,last_name.ilike.%${normalized}%`,
      )
      .limit(8);

    if (patientError) {
      return new Response(JSON.stringify({ error: patientError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ patients: patients ?? [] }), {
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
