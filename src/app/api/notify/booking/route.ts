import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { buildBookingEmail, type NotifyPayload } from "@/lib/notify/email-template";

export const runtime = "nodejs";

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

  const { subject, html } = buildBookingEmail(payload);

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
