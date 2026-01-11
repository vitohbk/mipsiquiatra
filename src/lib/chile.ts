type RegionApiItem = {
  codigo: string;
  nombre: string;
};

type ComunaApiItem = {
  codigo: string;
  nombre: string;
};

export type ChileRegion = { code: string; name: string };
export type ChileComuna = { code: string; name: string };

export function capitalizeFirst(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function normalizeRut(value: string) {
  return value.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function formatRut(value: string) {
  const normalized = normalizeRut(value);
  if (normalized.length < 2) return normalized;
  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);
  const bodyWithDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${bodyWithDots}-${dv}`;
}

export function isValidRut(value: string) {
  const normalized = normalizeRut(value);
  if (normalized.length < 2) return false;
  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);
  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const mod = 11 - (sum % 11);
  const expected = mod === 11 ? "0" : mod === 10 ? "K" : String(mod);
  return expected === dv;
}

export async function fetchRegions() {
  const response = await fetch("/api/chile/regions");
  if (!response.ok) {
    throw new Error("No se pudieron cargar regiones");
  }
  const data = (await response.json()) as RegionApiItem[];
  return data.map((item) => ({ code: item.codigo, name: item.nombre })) as ChileRegion[];
}

export async function fetchComunas(regionCode: string) {
  const response = await fetch(`/api/chile/comunas?region=${regionCode}`);
  if (!response.ok) {
    throw new Error("No se pudieron cargar comunas");
  }
  const data = (await response.json()) as ComunaApiItem[];
  return data.map((item) => ({ code: item.codigo, name: item.nombre })) as ChileComuna[];
}
