import { NextResponse } from "next/server";
import { CHILE_REGIONS } from "../../../../lib/chile-data";

export async function GET() {
  const fallback = CHILE_REGIONS.map((item) => ({ codigo: item.code, nombre: item.name }));
  return NextResponse.json(fallback);
}
