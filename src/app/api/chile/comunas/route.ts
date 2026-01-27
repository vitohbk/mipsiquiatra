import { NextResponse } from "next/server";
import { CHILE_COMUNAS_BY_REGION } from "../../../../lib/chile-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionCode = searchParams.get("region");

  if (!regionCode) {
    return NextResponse.json({ error: "region requerida" }, { status: 400 });
  }

  const fallback = CHILE_COMUNAS_BY_REGION[regionCode as keyof typeof CHILE_COMUNAS_BY_REGION] ?? [];
  const asApiShape = fallback.map((item) => ({ codigo: item.code, nombre: item.name }));
  return NextResponse.json(asApiShape);
}
