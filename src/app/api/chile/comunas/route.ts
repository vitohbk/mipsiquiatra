import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionCode = searchParams.get("region");

  if (!regionCode) {
    return NextResponse.json({ error: "region requerida" }, { status: 400 });
  }

  const response = await fetch(`https://apis.digital.gob.cl/dpa/regiones/${regionCode}/comunas`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "No se pudieron cargar comunas" }, { status: 502 });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
