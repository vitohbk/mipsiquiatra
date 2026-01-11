"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthActions from "./_components/auth-actions";
import AuthGuard from "./_components/auth-guard";
import DashboardHeader from "./_components/dashboard-header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navItem = (href: string, label: string) => {
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
      >
        {label}
      </Link>
    );
  };

  return (
    <AuthGuard>
      <div className="dashboard-brand min-h-screen bg-[var(--page-bg)] font-[var(--font-source-sans)] text-[var(--page-text)]">
        <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-[240px_1fr] gap-6 px-6 py-6">
          <aside className="flex flex-col gap-6 rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
            <nav className="flex flex-col gap-2 text-sm uppercase tracking-[0.2em]">
              {navItem("/dashboard/bookings", "Reservas")}
              {navItem("/dashboard/services", "Servicios")}
              {navItem("/dashboard/availability", "Disponibilidad")}
              {navItem("/dashboard/patients", "Pacientes")}
              {navItem("/dashboard/users", "Usuarios")}
              {navItem("/dashboard/settings", "Settings")}
            </nav>
            <div className="mt-auto">
              <AuthActions />
            </div>
          </aside>
          <main className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-6 py-6">
            <DashboardHeader />
            <div className="pt-6">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
