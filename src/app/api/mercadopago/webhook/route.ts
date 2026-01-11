import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Missing Supabase env vars." }, { status: 500 });
  }

  const payload = await req.text();

  const forward = await fetch(`${supabaseUrl}/functions/v1/mercadopago_webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: payload,
  });

  const responseText = await forward.text();
  return new NextResponse(responseText, { status: forward.status });
}

export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}

export async function OPTIONS() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
