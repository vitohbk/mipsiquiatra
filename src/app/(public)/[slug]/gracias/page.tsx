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
    <main className="min-h-screen bg-[var(--brand-bg)] px-6 py-16 font-[var(--font-source-sans)] text-[var(--brand-body)]">
      <div className="mx-auto w-full max-w-xl space-y-6 rounded-3xl border border-[var(--brand-border)] bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[var(--brand-copper)]">Reserva</p>
          <h1 className="text-xl font-[var(--font-playfair)] text-[var(--brand-ink)]">{title}</h1>
          <p className="text-sm text-[var(--brand-body)]">{message}</p>
        </div>
        <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-paper)] p-4 text-base text-[var(--brand-body)]">
          {helper} Si el correo no llega en unos minutos, revisa spam.
        </div>
        <p className="text-base text-[var(--brand-body)]">{closing}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-full bg-[var(--brand-teal)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black"
            href={`/${params.slug}`}
          >
            Volver a la reserva
          </Link>
          {status === "failed" ? (
            <Link
              className="rounded-full border border-[var(--brand-border)] px-6 py-3 text-sm uppercase tracking-[0.2em] text-[var(--brand-copper)]"
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
