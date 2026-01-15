import { buildBookingEmail, type NotifyPayload } from "@/lib/notify/email-template";

export default function EmailPreviewPage() {
  const basePayload = {
    to: "preview@example.com",
    customer_name: "Valentina",
    service_name: "Sesión de evaluación",
    tenant_name: "MiPsiquiatra",
    start_at: "2026-01-12T15:00:00Z",
    timezone: "America/Santiago",
  } satisfies Omit<NotifyPayload, "type">;

  const previews = [
    {
      title: "Confirmación (reserva pública)",
      payload: { ...basePayload, type: "confirmation", source: "public" } as NotifyPayload,
    },
    {
      title: "Confirmación (agenda backend)",
      payload: { ...basePayload, type: "confirmation", source: "admin" } as NotifyPayload,
    },
    {
      title: "Cancelación",
      payload: { ...basePayload, type: "cancelled", source: "public" } as NotifyPayload,
    },
    {
      title: "Reprogramación",
      payload: { ...basePayload, type: "rescheduled", source: "public" } as NotifyPayload,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f4f2ee] p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        {previews.map((preview) => {
          const { html } = buildBookingEmail(preview.payload);
          return (
            <section key={preview.title} className="space-y-3">
              <h2 className="text-lg font-semibold text-[#2f2f2f]">{preview.title}</h2>
              <div
                className="rounded-2xl bg-white shadow-sm"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </section>
          );
        })}
      </div>
    </main>
  );
}
