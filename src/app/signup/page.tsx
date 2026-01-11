"use client";

import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-20 text-[var(--page-text)]">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--panel-muted)]">
            Mipsiquiatra
          </p>
          <h1 className="text-2xl font-semibold">Registro deshabilitado</h1>
          <p className="text-sm text-[var(--panel-muted)]">
            Tu cuenta debe ser creada por el owner.
          </p>
        </div>
        <Link className="text-[var(--page-text)] underline" href="/login">
          Volver al login
        </Link>
      </div>
    </main>
  );
}
