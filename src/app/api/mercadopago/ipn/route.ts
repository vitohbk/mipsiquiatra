import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getWebhookUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!supabaseUrl || !anonKey) {
    return null;
  }
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/functions/v1/mercadopago_webhook?apikey=${encodeURIComponent(anonKey)}`;
}

async function forwardToWebhook(payload: unknown) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    return NextResponse.json({ error: "Missing Supabase webhook config" }, { status: 500 });
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  return new NextResponse(text || JSON.stringify({ status: "ok" }), {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function POST(req: Request) {
  const raw = await req.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { raw };
    }
  }
  return forwardToWebhook(payload ?? {});
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const topic = searchParams.get("topic");
  const type = searchParams.get("type") ?? topic;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const payload = {
    id,
    type,
    topic,
    data: { id },
  };

  return forwardToWebhook(payload);
}
