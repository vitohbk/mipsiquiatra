"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { callEdgeFunction } from "@/lib/api/edge";

type LookupResponse = {
  booking: {
    id: string;
    start_at: string;
    status: string;
    customer_name: string | null;
  };
  service: { name: string | null; duration_minutes: number };
  slug: string | null;
};

type Slot = { start_at: string; end_at: string };

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function addMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

const weekdayLabels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

export default function RescheduleBookingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<LookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [monthCursor, setMonthCursor] = useState<Date>(new Date());
  const [monthAvailability, setMonthAvailability] = useState<Record<string, number>>({});
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await callEdgeFunction<LookupResponse>(
          "public_booking_action_lookup",
          { token, action: "reschedule" },
          { disableAuth: true },
        );
        setData(result);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la reserva.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!data?.slug) return;
      try {
        setError(null);
        const availability = await callEdgeFunction<{ slots: Slot[] }>(
          "public_availability",
          { slug: data.slug, start_date: formatDate(selectedDate), end_date: formatDate(selectedDate) },
          { disableAuth: true },
        );
        setSlots(availability.slots);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar horarios.");
      }
    };
    loadSlots();
  }, [data?.slug, selectedDate]);

  useEffect(() => {
    const loadMonth = async () => {
      if (!data?.slug) return;
      const start = startOfMonth(monthCursor);
      const end = endOfMonth(monthCursor);
      const startDate = formatDate(start);
      const endDate = formatDate(end);
      try {
        const availability = await callEdgeFunction<{ slots: Slot[] }>(
          "public_availability",
          { slug: data.slug, start_date: startDate, end_date: endDate },
          { disableAuth: true },
        );
        const counts: Record<string, number> = {};
        availability.slots.forEach((slot) => {
          const day = slot.start_at.slice(0, 10);
          counts[day] = (counts[day] ?? 0) + 1;
        });
        setMonthAvailability(counts);
      } catch {
        setMonthAvailability({});
      }
    };
    loadMonth();
  }, [data?.slug, monthCursor]);

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setError(null);
    try {
      await callEdgeFunction(
        "public_booking_action_reschedule",
        { token, start_at: selectedSlot.start_at },
        { disableAuth: true },
      );
      setDone(true);
    } catch (rescheduleError) {
      setError(rescheduleError instanceof Error ? rescheduleError.message : "No se pudo reprogramar.");
    }
  };

  const monthStart = useMemo(() => startOfMonth(monthCursor), [monthCursor]);
  const monthEnd = useMemo(() => endOfMonth(monthCursor), [monthCursor]);
  const firstWeekday = monthStart.getUTCDay();
  const monthDays = monthEnd.getUTCDate();

  return (
    <main className="min-h-screen bg-[var(--brand-bg)] px-6 py-16 font-[var(--font-source-sans)] text-[var(--brand-body)]">
      <div className="mx-auto w-full max-w-5xl space-y-6 rounded-3xl border border-[var(--brand-border)] bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--brand-copper)]">Reserva</p>
          <h1 className="text-2xl font-[var(--font-playfair)] text-[var(--brand-ink)]">Reprogramar cita</h1>
          {data?.service?.name ? (
            <p className="text-sm text-[var(--brand-body)]">{data.service.name}</p>
          ) : null}
        </div>
        {loading ? <p className="text-sm text-[var(--brand-body)]">Cargando...</p> : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {data?.slug && !done ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-[var(--font-playfair)] text-[var(--brand-ink)]">
                  {monthCursor.toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-[var(--brand-border)] px-3 py-1 text-xs text-[var(--brand-copper)]"
                    type="button"
                    onClick={() => setMonthCursor(addMonths(monthCursor, -1))}
                  >
                    ←
                  </button>
                  <button
                    className="rounded-full border border-[var(--brand-border)] px-3 py-1 text-xs text-[var(--brand-copper)]"
                    type="button"
                    onClick={() => setMonthCursor(addMonths(monthCursor, 1))}
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-xs text-[var(--brand-muted)]">
                {weekdayLabels.map((label) => (
                  <div key={label}>{label}</div>
                ))}
                {Array.from({ length: firstWeekday }).map((_, idx) => (
                  <div key={`empty-${idx}`} />
                ))}
                {Array.from({ length: monthDays }).map((_, idx) => {
                  const day = idx + 1;
                  const date = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth(), day));
                  const isSelected = formatDate(date) === formatDate(selectedDate);
                  const dayKey = formatDate(date);
                  const hasSlots = (monthAvailability[dayKey] ?? 0) > 0;
                  return (
                    <button
                      key={`day-${day}`}
                      type="button"
                      className={`rounded-full border px-2 py-2 text-sm transition ${
                        isSelected
                          ? "border-[var(--brand-teal)] bg-[var(--brand-teal)] text-black"
                          : hasSlots
                            ? "border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-ink)] hover:bg-[var(--brand-border)]"
                            : "border-[var(--brand-border)] text-[var(--brand-muted)] hover:bg-[var(--brand-paper)]"
                      }`}
                      onClick={() => setSelectedDate(date)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3 rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-paper)] p-4">
              <h3 className="text-sm font-semibold text-[var(--brand-ink)]">Horarios disponibles</h3>
              {slots.length === 0 ? (
                <p className="text-sm text-[var(--brand-muted)]">Sin horarios disponibles.</p>
              ) : (
                <div className="grid gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.start_at}
                      type="button"
                      className={`rounded-full border px-4 py-2 text-left text-sm ${
                        selectedSlot?.start_at === slot.start_at
                          ? "border-[var(--brand-teal)] bg-[var(--brand-teal)] text-black"
                          : "border-[var(--brand-border)] bg-white text-[var(--brand-ink)] hover:bg-[var(--brand-soft)]"
                      }`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {new Date(slot.start_at).toLocaleTimeString("es-CL", { timeStyle: "short" })}
                    </button>
                  ))}
                </div>
              )}
              <button
                className="mt-4 w-full rounded-full bg-[var(--brand-teal)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black disabled:opacity-60"
                type="button"
                disabled={!selectedSlot}
                onClick={handleConfirm}
              >
                Confirmar reprogramación
              </button>
            </div>
          </div>
        ) : null}
        {done ? (
          <p className="text-sm text-[var(--brand-body)]">
            Tu cita fue reprogramada. Recibirás la confirmación por correo.
          </p>
        ) : null}
      </div>
    </main>
  );
}
