const heroImage = "/assets/hero.webp";

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
    </main>
  );
}
