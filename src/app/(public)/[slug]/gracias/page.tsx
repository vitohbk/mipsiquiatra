"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const heroImage = "/assets/hero.webp";

function BookingThanksContent() {
  const searchParams = useSearchParams();
  const collectionStatus = searchParams.get("collection_status");
  const status = searchParams.get("status");

  // MercadoPago sends collection_status: approved | pending | rejected | null
  const paymentStatus = collectionStatus ?? status ?? "approved";
  const isApproved = paymentStatus === "approved";
  const isPending = paymentStatus === "pending";
  // rejected, cancelled, null, or anything else = failed

  useEffect(() => {
    if (isApproved && typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "conversion", {
        send_to: "AW-746407741/2iZACOnP-MAcEL2O9eMC",
        currency: "CLP",
        value: 85000,
      });
      window.gtag("event", "purchase", {
        currency: "CLP",
        value: 85000,
        landing_url: sessionStorage.getItem("landing_url") ?? undefined,
      });
    }
  }, [isApproved]);

  if (isApproved) {
    return (
      <div className="mx-auto max-w-3xl text-center text-white">
        <p className="text-lg uppercase tracking-[0.35em] text-white/80">Reserva</p>
        <h1 className="mt-6 font-[var(--font-playfair)] text-4xl leading-[1.1] md:text-6xl">
          Tu reserva está confirmada.
        </h1>
        <p className="mt-6 text-base text-white/85 md:text-lg">
          Gracias por dar este paso en tu bienestar. Tu hora quedó reservada y en unos minutos
          recibirás un correo con todos los detalles.
        </p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl text-center text-white">
        <p className="text-lg uppercase tracking-[0.35em] text-yellow-300/80">Pago en revisión</p>
        <h1 className="mt-6 font-[var(--font-playfair)] text-4xl leading-[1.1] md:text-6xl">
          Tu pago está siendo procesado.
        </h1>
        <p className="mt-6 text-base text-white/85 md:text-lg">
          Estamos verificando tu pago con MercadoPago. Te enviaremos un correo en cuanto se confirme
          tu reserva. Si tienes dudas, comunícate con nosotros.
        </p>
      </div>
    );
  }

  // failed / cancelled / rejected
  return (
    <div className="mx-auto max-w-3xl text-center text-white">
      <p className="text-lg uppercase tracking-[0.35em] text-red-300/80">Pago no procesado</p>
      <h1 className="mt-6 font-[var(--font-playfair)] text-4xl leading-[1.1] md:text-6xl">
        No pudimos procesar tu pago.
      </h1>
      <p className="mt-6 text-base text-white/85 md:text-lg">
        Tu reserva no fue confirmada. Por favor intenta nuevamente o comunícate con nosotros para
        coordinar otra forma de pago.
      </p>
    </div>
  );
}

export default function BookingThanksPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-16 font-[var(--font-source-sans)]"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${heroImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Suspense fallback={null}>
        <BookingThanksContent />
      </Suspense>
    </main>
  );
}
