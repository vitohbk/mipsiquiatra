"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import AuthActions from "./_components/auth-actions";
import AuthGuard from "./_components/auth-guard";
import DashboardHeader from "./_components/dashboard-header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItem = (href: string, label: string, onClick?: () => void) => {
    const isActive = pathname === href;
    return (
      <Link
        aria-current={isActive ? "page" : undefined}
        className={[
          "rounded-full px-3 py-2 transition hover:bg-[var(--panel-soft)] hover:text-[var(--brand-teal)]",
          isActive
            ? "bg-[var(--panel-soft)] font-semibold text-[var(--brand-ink)]"
            : "text-[var(--brand-copper)]",
        ].join(" ")}
        href={href}
        onClick={onClick}
      >
        {label}
      </Link>
    );
  };

  return (
    <AuthGuard>
      <div className="dashboard-brand min-h-screen bg-[var(--page-bg)] font-[var(--font-source-sans)] text-[var(--page-text)]">
        <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[240px_1fr]">
          <aside className="hidden flex-col gap-6 rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 md:flex">
            <nav className="flex flex-col gap-2 text-sm uppercase tracking-[0.2em]">
              {navItem("/agenda/citas", "Citas")}
              {navItem("/agenda/pagos", "Pagos")}
              {navItem("/agenda/services", "Servicios")}
              {navItem("/agenda/availability", "Disponibilidad")}
              {navItem("/agenda/patients", "Pacientes")}
              {navItem("/agenda/users", "Usuarios")}
              {navItem("/agenda/options", "Opciones")}
            </nav>
            <div className="mt-auto">
              <AuthActions />
            </div>
          </aside>
          <main className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-6 pt-6 pb-24 md:pb-6">
            <DashboardHeader />
            <div className="pt-6">{children}</div>
          </main>
        </div>
        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 md:hidden">
            <button
              type="button"
              className="absolute inset-0 z-0"
              aria-label="Cerrar menú"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-full max-w-sm rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 text-center shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.35em] text-[var(--brand-copper)]">Menú</p>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--panel-border)] text-[var(--brand-copper)]"
                  aria-label="Cerrar menú"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 6L18 18M6 18L18 6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <nav className="mt-6 flex flex-col items-center gap-3 text-sm uppercase tracking-[0.2em]">
                {navItem("/agenda/citas", "Citas", () => setMobileMenuOpen(false))}
                {navItem("/agenda/pagos", "Pagos", () => setMobileMenuOpen(false))}
                {navItem("/agenda/services", "Servicios", () => setMobileMenuOpen(false))}
                {navItem("/agenda/availability", "Disponibilidad", () => setMobileMenuOpen(false))}
                {navItem("/agenda/patients", "Pacientes", () => setMobileMenuOpen(false))}
                {navItem("/agenda/users", "Usuarios", () => setMobileMenuOpen(false))}
                {navItem("/agenda/options", "Opciones", () => setMobileMenuOpen(false))}
              </nav>
              <div className="mt-6">
                <AuthActions />
              </div>
            </div>
          </div>
        ) : null}
        <div className="fixed bottom-4 left-0 right-0 z-40 flex w-full justify-center md:hidden">
          <div className="flex w-full max-w-sm items-center justify-between rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 shadow-lg">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--panel-border)] text-[var(--brand-copper)] transition hover:text-[var(--brand-teal)]"
              aria-label="Abrir menú"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 6H21M3 12H21M3 18H21"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {pathname === "/agenda/services" ? (
              <Link
                className="rounded-full bg-[var(--page-text)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-bg)]"
                href="/agenda/services?create=1"
              >
                Nuevo servicio
              </Link>
            ) : null}
            {pathname === "/agenda/citas" || pathname === "/agenda" ? (
              <Link
                className="rounded-full bg-[var(--page-text)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-bg)]"
                href="/agenda/citas?create=1"
              >
                Nueva cita
              </Link>
            ) : null}
            {pathname === "/agenda/patients" ? (
              <Link
                className="rounded-full bg-[var(--page-text)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-bg)]"
                href="/agenda/patients?create=1"
              >
                Nuevo paciente
              </Link>
            ) : null}
            {pathname === "/agenda/users" ? (
              <Link
                className="rounded-full bg-[var(--page-text)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-bg)]"
                href="/agenda/users?create=1"
              >
                Nuevo usuario
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
