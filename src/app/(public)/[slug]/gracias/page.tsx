"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

function resolveStatus(searchParams: URLSearchParams) {
  const status = searchParams.get("status") || searchParams.get("collection_status");
  if (!status) return "processing";
  if (status === "approved" || status === "paid") return "approved";
  if (status === "pending" || status === "in_process") return "pending";
  return "failed";
}

export default function BookingThanksPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const status = resolveStatus(searchParams);

  const title =
    status === "approved"
      ? "Pago recibido"
      : status === "pending"
        ? "Pago en proceso"
        : status === "failed"
          ? "Pago rechazado"
          : "Procesando reserva";

  const message =
    status === "approved"
      ? "Tu reserva está confirmada. Recibirás un correo de confirmación."
      : status === "pending"
        ? "Estamos esperando la confirmación del pago. Te avisaremos por correo."
        : status === "failed"
          ? "No pudimos procesar el pago. Puedes intentar nuevamente."
          : "Estamos confirmando tu reserva. Te avisaremos por correo.";

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-16 text-[var(--page-text)]">
      <div className="mx-auto w-full max-w-xl space-y-6 rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--panel-muted)]">Reserva</p>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="text-sm text-[var(--panel-muted)]">{message}</p>
        </div>
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-soft)] p-4 text-sm text-[var(--panel-muted)]">
          Si el correo no llega en unos minutos, revisa spam o contáctanos.
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
            href={`/${params.slug}`}
          >
            Volver a la reserva
          </Link>
          {status === "failed" ? (
            <Link
              className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm"
              href={`/${params.slug}`}
            >
              Intentar de nuevo
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
