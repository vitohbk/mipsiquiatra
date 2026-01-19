import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { assertString } from "../_shared/validation.ts";

const MAX_RANGE_DAYS = 31;

function parseDate(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must be YYYY-MM-DD`);
  }
  return value;
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return (asUtc - date.getTime()) / 60000;
}

function toUtcFromLocal(dateStr: string, timeStr: string, timeZone: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offsetMinutes = getTimeZoneOffset(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60000);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

function isSameDay(a: string, b: string) {
  return a === b;
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

    assertString(payload.start_date, "start_date");
    assertString(payload.end_date, "end_date");

    const startDate = parseDate(payload.start_date, "start_date");
    const endDate = parseDate(payload.end_date, "end_date");

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);

    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (diffDays > MAX_RANGE_DAYS) {
      return new Response(JSON.stringify({ error: `range exceeds ${MAX_RANGE_DAYS} days` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createAdminClient();

    const bookingLinkQuery = admin
      .from("public_booking_links")
      .select(
        "tenant_id, service_id, professional_user_id, services(id, duration_minutes, is_active, max_advance_hours), tenants(timezone)",
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
      duration_minutes: number;
      is_active: boolean;
      max_advance_hours?: number;
    } | null;
    const tenant = bookingLink.tenants as { timezone: string } | null;

    if (!service || !service.is_active) {
      return new Response(JSON.stringify({ error: "Service not available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timezone = tenant?.timezone ?? "America/Santiago";
    const minAdvanceHours = service?.max_advance_hours ?? 72;
    const minAdvanceDate = new Date(Date.now() + minAdvanceHours * 60 * 60 * 1000);

    const rulesResult = await admin
      .from("availability_rules")
      .select("weekday, start_time, end_time, timezone, is_active")
      .eq("tenant_id", bookingLink.tenant_id)
      .eq("professional_user_id", bookingLink.professional_user_id)
      .eq("service_id", bookingLink.service_id)
      .eq("is_active", true);

    if (rulesResult.error) throw new Error(rulesResult.error.message);
    let rules = rulesResult.data ?? [];
    if (rules.length === 0) {
      const fallbackRules = await admin
        .from("availability_rules")
        .select("weekday, start_time, end_time, timezone, is_active")
        .eq("tenant_id", bookingLink.tenant_id)
        .eq("professional_user_id", bookingLink.professional_user_id)
        .is("service_id", null)
        .eq("is_active", true);
      if (fallbackRules.error) throw new Error(fallbackRules.error.message);
      rules = fallbackRules.data ?? [];
    }

    const exceptionsResult = await admin
      .from("availability_exceptions")
      .select("date, start_time, end_time, is_available")
      .eq("tenant_id", bookingLink.tenant_id)
      .eq("professional_user_id", bookingLink.professional_user_id)
      .eq("service_id", bookingLink.service_id)
      .gte("date", startDate)
      .lte("date", endDate);

    if (exceptionsResult.error) throw new Error(exceptionsResult.error.message);
    let exceptions = exceptionsResult.data ?? [];
    if (exceptions.length === 0) {
      const fallbackExceptions = await admin
        .from("availability_exceptions")
        .select("date, start_time, end_time, is_available")
        .eq("tenant_id", bookingLink.tenant_id)
        .eq("professional_user_id", bookingLink.professional_user_id)
        .is("service_id", null)
        .gte("date", startDate)
        .lte("date", endDate);
      if (fallbackExceptions.error) throw new Error(fallbackExceptions.error.message);
      exceptions = fallbackExceptions.data ?? [];
    }

    const [bookingsResult, locksResult] = await Promise.all([
      admin
        .from("bookings")
        .select("start_at, end_at")
        .eq("tenant_id", bookingLink.tenant_id)
        .eq("professional_user_id", bookingLink.professional_user_id)
        .eq("status", "confirmed")
        .lt("start_at", new Date(`${endDate}T23:59:59Z`).toISOString())
        .gt("end_at", start.toISOString()),
      admin
        .from("booking_locks")
        .select("start_at, end_at, expires_at")
        .eq("tenant_id", bookingLink.tenant_id)
        .eq("professional_user_id", bookingLink.professional_user_id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .lt("start_at", new Date(`${endDate}T23:59:59Z`).toISOString())
        .gt("end_at", start.toISOString()),
    ]);

    if (bookingsResult.error) throw new Error(bookingsResult.error.message);
    if (locksResult.error) throw new Error(locksResult.error.message);

    const bookings = bookingsResult.data ?? [];
    const locks = locksResult.data ?? [];

    const exceptionBlocks = exceptions.filter((ex) => !ex.is_available);
    const exceptionAdds = exceptions.filter((ex) => ex.is_available);

    const slots: { start_at: string; end_at: string }[] = [];

    for (let i = 0; i < diffDays; i += 1) {
      const day = new Date(start.getTime() + i * 86400000);
      const dayStr = day.toISOString().slice(0, 10);

      const weekday = day.getUTCDay();
      const dayRules = rules.filter((rule) => rule.weekday === weekday);

      for (const rule of dayRules) {
        const ruleTz = rule.timezone ?? timezone;
        let cursor = toUtcFromLocal(dayStr, rule.start_time, ruleTz);
        const endUtc = toUtcFromLocal(dayStr, rule.end_time, ruleTz);

        while (cursor < endUtc) {
          const slotStart = cursor;
          const slotEnd = addMinutes(slotStart, service.duration_minutes);
          if (slotEnd > endUtc) break;

          if (slotStart >= minAdvanceDate) {
            slots.push({ start_at: slotStart.toISOString(), end_at: slotEnd.toISOString() });
          }
          cursor = slotEnd;
        }
      }

      for (const ex of exceptionAdds.filter((item) => isSameDay(item.date, dayStr))) {
        if (!ex.start_time || !ex.end_time) continue;
        let cursor = toUtcFromLocal(dayStr, ex.start_time, timezone);
        const endUtc = toUtcFromLocal(dayStr, ex.end_time, timezone);

        while (cursor < endUtc) {
          const slotStart = cursor;
          const slotEnd = addMinutes(slotStart, service.duration_minutes);
          if (slotEnd > endUtc) break;

          if (slotStart >= minAdvanceDate) {
            slots.push({ start_at: slotStart.toISOString(), end_at: slotEnd.toISOString() });
          }
          cursor = slotEnd;
        }
      }
    }

    const blocked = (startAt: string, endAt: string) => {
      const s = new Date(startAt).getTime();
      const e = new Date(endAt).getTime();

      for (const ex of exceptionBlocks) {
        if (ex.date && ex.start_time && ex.end_time) {
          const blockStart = toUtcFromLocal(ex.date, ex.start_time, timezone).getTime();
          const blockEnd = toUtcFromLocal(ex.date, ex.end_time, timezone).getTime();
          if (s < blockEnd && e > blockStart) return true;
        } else if (ex.date) {
          if (isSameDay(ex.date, startAt.slice(0, 10))) return true;
        }
      }

      for (const booking of bookings) {
        const bStart = new Date(booking.start_at).getTime();
        const bEnd = new Date(booking.end_at).getTime();
        if (s < bEnd && e > bStart) return true;
      }

      for (const lock of locks) {
        const lStart = new Date(lock.start_at).getTime();
        const lEnd = new Date(lock.end_at).getTime();
        if (s < lEnd && e > lStart) return true;
      }

      return false;
    };

    const unique = new Map<string, { start_at: string; end_at: string }>();
    for (const slot of slots) {
      const key = `${slot.start_at}-${slot.end_at}`;
      if (!blocked(slot.start_at, slot.end_at)) {
        unique.set(key, slot);
      }
    }

    const ordered = Array.from(unique.values()).sort((a, b) =>
      new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );

    return new Response(JSON.stringify({ slots: ordered }), {
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
