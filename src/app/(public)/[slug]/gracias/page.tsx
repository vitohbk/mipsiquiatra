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
    status === "failed"
      ? "No pudimos completar el pago"
      : "Tu reserva está confirmada";

  const message =
    status === "failed"
      ? "Sabemos que esto puede ser frustrante. Si quieres, respira un momento y vuelve a intentarlo cuando te sea cómodo."
      : status === "pending"
        ? "Gracias por dar este paso. Tu horario quedó reservado; en breve recibirás la confirmación por correo."
        : "Gracias por dar este paso en tu bienestar. Tu hora quedó reservada y en unos minutos recibirás un correo con todos los detalles.";

  const helper =
    status === "failed"
      ? "Si necesitas ayuda o prefieres reprogramar, responde a nuestro correo y con gusto te acompañamos."
      : "Si necesitas reprogramar o tienes preguntas, responde al correo de confirmación y te ayudamos.";

  const closing =
    status === "failed"
      ? "Estamos aquí para ayudarte cuando lo necesites."
      : "Gracias por confiar en nosotros para acompañarte en este proceso.";

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-16 text-[var(--page-text)]">
      <div className="mx-auto w-full max-w-xl space-y-6 rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--panel-muted)]">Reserva</p>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="text-sm text-[var(--panel-muted)]">{message}</p>
        </div>
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-soft)] p-4 text-sm text-[var(--panel-muted)]">
          {helper} Si el correo no llega en unos minutos, revisa spam.
        </div>
        <p className="text-sm text-[var(--panel-muted)]">{closing}</p>
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
