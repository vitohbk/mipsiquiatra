import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type NotifyPayload = {
  type: "confirmation" | "reminder";
  to: string;
  customer_name?: string | null;
  service_name?: string | null;
  tenant_name?: string | null;
  start_at: string;
  timezone?: string | null;
};

function formatDateTime(value: string, timeZone: string) {
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  });
}

export async function POST(req: Request) {
  const secret = process.env.NOTIFY_WEBHOOK_SECRET ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!secret || bearerToken !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const smtpHost = process.env.SMTP_HOST ?? "";
  const smtpUser = process.env.SMTP_USER ?? "";
  const smtpPass = process.env.SMTP_PASS ?? "";
  const smtpPort = Number(process.env.SMTP_PORT ?? "465");
  const fromEmail = process.env.SMTP_FROM ?? "";

  if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
    return NextResponse.json({ error: "Missing SMTP configuration" }, { status: 500 });
  }

  const payload = (await req.json()) as NotifyPayload;
  if (!payload?.to || !payload?.start_at) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const timezone = payload.timezone ?? "America/Santiago";
  const formattedDate = formatDateTime(payload.start_at, timezone);
  const tenantName = payload.tenant_name ?? "Nuestro equipo";
  const serviceName = payload.service_name ?? "tu atención";
  const customerName = payload.customer_name ?? "";

  const subject =
    payload.type === "reminder" ? "Recordatorio de tu reserva" : "Reserva confirmada";

  const title = payload.type === "reminder" ? "Recordatorio de reserva" : "Reserva confirmada";
  const bodyText =
    payload.type === "reminder"
      ? `Te recordamos tu reserva para ${serviceName}.`
      : `Tu reserva para ${serviceName} quedó confirmada.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2 style="margin: 0 0 12px;">${title}</h2>
      <p style="margin: 0 0 12px;">Hola ${customerName || ""},</p>
      <p style="margin: 0 0 12px;">${bodyText}</p>
      <p style="margin: 0 0 12px;">
        <strong>Fecha y hora:</strong> ${formattedDate}
      </p>
      <p style="margin: 0 0 16px;">Gracias por confiar en ${tenantName}.</p>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: fromEmail,
    to: payload.to,
    subject,
    html,
  });

  return NextResponse.json({ status: "ok" });
}

export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
