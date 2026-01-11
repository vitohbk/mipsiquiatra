import Link from "next/link";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-12 text-[var(--page-text)]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <h1 className="text-3xl font-semibold">Booking demo</h1>
        <p className="text-[var(--panel-muted)]">
          Visita /&lt;slug&gt; con el slug de un booking link creado en el dashboard.
        </p>
        <Link className="text-sm text-[var(--panel-muted)]" href="/">
          ← Volver
        </Link>
      </div>
    </main>
  );
}
