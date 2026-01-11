import { NextResponse } from "next/server";

export async function GET() {
  const response = await fetch("https://apis.digital.gob.cl/dpa/regiones", {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "No se pudieron cargar regiones" }, { status: 502 });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
