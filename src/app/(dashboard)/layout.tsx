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
          "rounded-xl px-3 py-2 transition hover:bg-[var(--panel-soft)]",
          isActive ? "bg-[var(--panel-soft)] font-semibold text-[var(--page-text)]" : "text-[var(--panel-muted)]",
        ].join(" ")}
        href={href}
      >
        {label}
      </Link>
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[var(--page-bg)] text-[var(--page-text)]">
        <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-[240px_1fr] gap-6 px-6 py-6">
          <aside className="flex flex-col gap-6 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
            <nav className="flex flex-col gap-2 text-sm">
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
          <main className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-6 py-6">
            <DashboardHeader />
            <div className="pt-6">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
