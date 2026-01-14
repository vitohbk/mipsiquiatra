export type NotifyPayload = {
  type: "confirmation" | "cancelled" | "rescheduled";
  to: string;
  customer_name?: string | null;
  service_name?: string | null;
  tenant_name?: string | null;
  start_at: string;
  timezone?: string | null;
  cancel_url?: string | null;
  reschedule_url?: string | null;
};

function formatDateTime(value: string, timeZone: string) {
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  });
}

export function buildBookingEmail(payload: NotifyPayload) {
  const timezone = payload.timezone ?? "America/Santiago";
  const formattedDate = formatDateTime(payload.start_at, timezone);
  const tenantName = payload.tenant_name ?? "Nuestro equipo";
  const serviceName = payload.service_name ?? "tu atención";
  const greetingName = tenantName;

  const subjectMap: Record<NotifyPayload["type"], string> = {
    confirmation: "Reserva confirmada",
    cancelled: "Reserva cancelada",
    rescheduled: "Reserva reprogramada",
  };
  const titleMap: Record<NotifyPayload["type"], string> = {
    confirmation: "Reserva confirmada",
    cancelled: "Reserva cancelada",
    rescheduled: "Reserva reprogramada",
  };
  const bodyTextMap: Record<NotifyPayload["type"], string> = {
    confirmation: `Tu reserva para ${serviceName} quedó confirmada.`,
    cancelled: `Tu reserva para ${serviceName} fue cancelada.`,
    rescheduled: `Tu reserva para ${serviceName} fue reprogramada.`,
  };

  const subject = subjectMap[payload.type];
  const title = titleMap[payload.type];
  const bodyText = bodyTextMap[payload.type];

  const actionButtons = payload.cancel_url || payload.reschedule_url
    ? `
        <tr>
          <td style="padding:8px 34px 20px;font-family:Arial, sans-serif;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                ${payload.reschedule_url ? `
                  <td style="padding-right:10px;">
                    <a href="${payload.reschedule_url}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#0f766e;color:#ffffff;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;">Reprogramar</a>
                  </td>
                ` : ""}
                ${payload.cancel_url ? `
                  <td>
                    <a href="${payload.cancel_url}" style="display:inline-block;padding:10px 16px;border-radius:999px;border:1px solid #0f766e;color:#0f766e;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;">Cancelar</a>
                  </td>
                ` : ""}
              </tr>
            </table>
          </td>
        </tr>
      `
    : "";

  const html = `
    <div style="margin:0;padding:34px;background:#f5f9f8;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #e3f0ed;box-shadow:0 26px 60px rgba(14,116,144,0.12);">
        <tr>
          <td style="padding:28px 34px 18px;font-family:Arial, sans-serif;background:linear-gradient(130deg,#fff4e6,#e8fbf8);border-bottom:1px solid #e5f2ef;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#0f766e;">${tenantName}</p>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#fff2df;color:#b45309;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;">${title}</span>
                </td>
              </tr>
            </table>
            <h1 style="margin:14px 0 6px;font-size:28px;letter-spacing:-0.02em;color:#0f172a;">${title}</h1>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">${bodyText}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 34px 6px;font-family:Arial, sans-serif;color:#0f172a;">
            <p style="margin:0 0 8px;font-size:15px;">Hola ${greetingName},</p>
            ${payload.type !== "cancelled" ? `
              <p style="margin:0 0 16px;font-size:15px;color:#334155;">
                Aca dejamos los detalles de tu cita:
              </p>
            ` : ""}
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 12px;">
              <tr>
                <td style="padding:16px 18px;border-radius:16px;background:#f0fdfa;border:1px solid #cfeee9;">
                  <p style="margin:0;font-size:11px;letter-spacing:0.26em;text-transform:uppercase;color:#0f766e;">Fecha y hora</p>
                  <p style="margin:10px 0 0;font-size:17px;font-weight:600;color:#0f172a;">${formattedDate}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 18px;border-radius:16px;background:#ffffff;border:1px solid #ffd9b5;">
                  <p style="margin:0;font-size:11px;letter-spacing:0.26em;text-transform:uppercase;color:#b45309;">Servicio</p>
                  <p style="margin:10px 0 0;font-size:16px;font-weight:600;color:#0f172a;">${serviceName}</p>
                </td>
              </tr>
            </table>
            ${payload.type !== "cancelled" ? `
              <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#0f766e;">
                <strong>IMPORTANTE:</strong> Nuestra secretaria se contactara contigo antes de la sesion para instrucciones de conexion.
                Su numero es el <a href="https://wa.me/56968051535" style="color:#0f766e;text-decoration:underline;">+56968051535</a>.
              </p>
            ` : ""}
          </td>
        </tr>
        ${payload.type === "confirmation" ? actionButtons : ""}
        <tr>
          <td style="padding:20px 34px 30px;font-family:Arial, sans-serif;color:#475569;">
            <p style="margin:0;">Gracias por confiar en ${tenantName}.</p>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, html };
}
