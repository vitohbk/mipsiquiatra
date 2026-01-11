"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { callEdgeFunction } from "@/lib/api/edge";

type LookupResponse = {
  booking: {
    id: string;
    start_at: string;
    status: string;
    customer_name: string | null;
  };
  service: { name: string | null };
};

export default function CancelBookingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<LookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await callEdgeFunction<LookupResponse>(
          "public_booking_action_lookup",
          { token, action: "cancel" },
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

  const handleCancel = async () => {
    setError(null);
    try {
      await callEdgeFunction("public_booking_action_cancel", { token }, { disableAuth: true });
      setDone(true);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "No se pudo cancelar la reserva.");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--brand-bg)] px-6 py-16 font-[var(--font-source-sans)] text-[var(--brand-body)]">
      <div className="mx-auto w-full max-w-xl space-y-6 rounded-3xl border border-[var(--brand-border)] bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--brand-copper)]">Reserva</p>
          <h1 className="text-2xl font-[var(--font-playfair)] text-[var(--brand-ink)]">Cancelar cita</h1>
        </div>
        {loading ? <p className="text-sm text-[var(--brand-body)]">Cargando...</p> : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {data && !done ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-paper)] p-4 text-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--brand-muted)]">Servicio</p>
              <p className="mt-2 text-base font-semibold text-[var(--brand-ink)]">
                {data.service.name ?? "Atención"}
              </p>
              <p className="mt-2 text-sm text-[var(--brand-body)]">
                {new Date(data.booking.start_at).toLocaleString("es-CL", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <button
              className="w-full rounded-full bg-[var(--brand-teal)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black"
              type="button"
              onClick={handleCancel}
            >
              Confirmar cancelación
            </button>
          </div>
        ) : null}
        {done ? (
          <p className="text-sm text-[var(--brand-body)]">
            Tu reserva fue cancelada. Si quieres reprogramar, revisa el correo de confirmación para usar el link.
          </p>
        ) : null}
      </div>
    </main>
  );
}
