import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getWebhookConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!supabaseUrl || !anonKey) {
    return null;
  }
  const base = supabaseUrl.replace(/\/$/, "");
  return { url: `${base}/functions/v1/mercadopago_webhook`, anonKey };
}

async function forwardToWebhook(payload: unknown) {
  const config = getWebhookConfig();
  if (!config) {
    return NextResponse.json({ error: "Missing Supabase webhook config" }, { status: 500 });
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.anonKey}`,
      apikey: config.anonKey,
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
  const parsed = payload as { data?: { id?: string } } | null;
  const id = parsed?.data?.id ?? null;
  if (!id || id === "123456") {
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
  return forwardToWebhook(payload ?? {});
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const topic = searchParams.get("topic");
  const type = searchParams.get("type") ?? topic;

  if (!id || id === "123456") {
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }

  const payload = {
    id,
    type,
    topic,
    data: { id },
  };

  return forwardToWebhook(payload);
}
