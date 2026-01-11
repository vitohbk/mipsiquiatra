import { buildBookingEmail } from "@/lib/notify/email-template";

export default function EmailPreviewPage() {
  const { html } = buildBookingEmail({
    type: "confirmation",
    to: "preview@example.com",
    customer_name: "Valentina",
    service_name: "Sesión de evaluación",
    tenant_name: "MiPsiquiatra",
    start_at: "2026-01-12T15:00:00Z",
    timezone: "America/Santiago",
  });

  return (
    <main className="min-h-screen bg-[#f4f2ee] p-6">
      <div className="mx-auto max-w-2xl">
        <div
          className="rounded-2xl bg-white shadow-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </main>
  );
}
