"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { callEdgeFunction } from "@/lib/api/edge";
import { useActiveTenant } from "@/lib/tenant/useActiveTenant";

type BookingRow = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  start_at: string;
  status: string;
  payment_id: string | null;
  services?: {
    name: string;
    price_clp: number;
    payment_mode: string | null;
    deposit_amount_clp: number | null;
    currency: string | null;
  } | null;
  payments?: { status: string | null }[] | { status: string | null } | null;
};

type PaymentLinkResponse = {
  payment_id: string;
  redirect_url: string | null;
};

function formatBookingLabel(booking: BookingRow) {
  const dateLabel = new Date(booking.start_at).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const serviceName = booking.services?.name ?? "Servicio";
  const customer = booking.customer_name ?? booking.customer_email ?? "Paciente";
  return `${customer} · ${serviceName} · ${dateLabel}`;
}

function resolveAmount(booking: BookingRow) {
  const service = booking.services;
  if (!service) return null;
  return service.payment_mode === "deposit"
    ? (service.deposit_amount_clp ?? service.price_clp)
    : service.price_clp;
}

export default function PaymentLinksPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const { activeTenantId } = useActiveTenant();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<Record<string, PaymentLinkResponse>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!activeTenantId) return;
      setError(null);
      const { data, error: loadError } = await supabase
        .from("bookings")
        .select(
          "id, customer_name, customer_email, start_at, status, payment_id, services(name, price_clp, payment_mode, deposit_amount_clp, currency), payments(status)",
        )
        .eq("tenant_id", activeTenantId)
        .eq("status", "confirmed")
        .order("start_at", { ascending: true });

      if (loadError) {
        setError(loadError.message);
        return;
      }

      setBookings(data ?? []);
    };

    load();
  }, [activeTenantId, supabase]);

  const unpaidBookings = bookings.filter((booking) => {
    if (Array.isArray(booking.payments)) {
      return booking.payments[0]?.status !== "paid";
    }
    return booking.payments?.status !== "paid";
  });
  const normalizedQuery = searchTerm.trim().toLowerCase();
  const hasSearch = normalizedQuery.length >= 3;
  const filteredBookings = hasSearch
    ? unpaidBookings.filter((booking) =>
        formatBookingLabel(booking).toLowerCase().includes(normalizedQuery),
      )
    : [];
  const selectedBookings = filteredBookings.filter((booking) => selectedBookingIds.includes(booking.id));
  const totalAmount = selectedBookings.reduce((sum, booking) => sum + (resolveAmount(booking) ?? 0), 0);

  const handleGenerateLink = async () => {
    if (selectedBookingIds.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const results = await Promise.all(
        selectedBookingIds.map(async (bookingId) => ({
          bookingId,
          result: await callEdgeFunction<PaymentLinkResponse>("create_booking_payment_link", {
            booking_id: bookingId,
          }),
        })),
      );
      setPaymentLinks((current) => {
        const next = { ...current };
        results.forEach(({ bookingId, result }) => {
          next[bookingId] = result;
        });
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold md:text-2xl">Links de pago</h1>
        <p className="text-sm text-[var(--panel-muted)]">
          Genera un link de pago asociado a una cita existente.
        </p>
      </header>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="rounded-2xl border border-[var(--panel-border)] bg-white/90 p-4 shadow-sm">
        <label className="text-sm uppercase tracking-[0.2em] text-[var(--panel-muted)]">
          Buscar cita no pagada
        </label>
        <input
          className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-base"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Nombre, email, servicio o fecha"
        />

        <div className="mt-4 space-y-2 text-sm text-[var(--panel-muted)]">
          {!hasSearch ? (
            <p>Escribe al menos 3 letras para buscar citas pendientes de pago.</p>
          ) : filteredBookings.length === 0 ? (
            <p>No hay citas pendientes de pago.</p>
          ) : (
            filteredBookings.map((booking) => {
              const amount = resolveAmount(booking);
              const isChecked = selectedBookingIds.includes(booking.id);
              return (
                <label
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedBookingIds((current) =>
                          current.includes(booking.id)
                            ? current.filter((id) => id !== booking.id)
                            : [...current, booking.id],
                        );
                      }}
                    />
                    <div>
                      <p className="text-sm text-[var(--panel-ink)]">{formatBookingLabel(booking)}</p>
                      <p className="text-xs text-[var(--panel-muted)]">
                        {(Array.isArray(booking.payments)
                          ? booking.payments[0]?.status
                          : booking.payments?.status) ?? "sin pago"} ·{" "}
                        {amount !== null ? `$${amount.toLocaleString("es-CL")}` : "-"}
                      </p>
                    </div>
                  </div>
                  {paymentLinks[booking.id]?.redirect_url ? (
                    <a
                      href={paymentLinks[booking.id]?.redirect_url ?? undefined}
                      className="text-xs text-[var(--brand-teal)] underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir link
                    </a>
                  ) : null}
                </label>
              );
            })
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-full bg-[var(--brand-teal)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:translate-y-0.5 disabled:opacity-60"
            onClick={handleGenerateLink}
            disabled={selectedBookingIds.length === 0 || loading}
          >
            {loading ? "Generando..." : "Generar link de pago"}
          </button>
          {selectedBookingIds.length > 0 ? (
            <p className="text-xs text-[var(--panel-muted)]">
              Total seleccionado: ${totalAmount.toLocaleString("es-CL")}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
