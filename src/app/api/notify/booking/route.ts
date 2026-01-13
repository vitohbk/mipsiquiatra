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

  const brevoApiKey = process.env.BREVO_API_KEY ?? "";
  const fromEmail = process.env.BREVO_FROM ?? "";
  const fromName = process.env.BREVO_FROM_NAME ?? "MiPsiquiatra";

  if (!brevoApiKey || !fromEmail) {
    console.error("notify: missing Brevo configuration", {
      brevoApiKey: Boolean(brevoApiKey),
      fromEmail: Boolean(fromEmail),
    });
    return NextResponse.json({ error: "Missing Brevo configuration" }, { status: 500 });
  }

  const payload = (await req.json()) as NotifyPayload;
  if (!payload?.to || !payload?.start_at) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { subject, html } = buildBookingEmail(payload);

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          email: fromEmail,
          name: fromName,
        },
        to: [{ email: payload.to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("notify: brevo send failed", {
        status: response.status,
        body: errorBody,
        to: payload.to,
        subject,
      });
      return NextResponse.json({ error: "Send failed" }, { status: 500 });
    }
    console.log("notify: brevo send ok", {
      to: payload.to,
      subject,
    });
  } catch (error) {
    console.error("notify: brevo send failed", {
      message: error instanceof Error ? error.message : String(error),
      to: payload.to,
      subject,
    });
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}

export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
