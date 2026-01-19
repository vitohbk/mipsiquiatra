import { supabaseBrowser } from "./client";

const functionsBase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");

async function callEdgeFunction(name: string, body: unknown) {
  const supabase = supabaseBrowser();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? null;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: anon,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${functionsBase}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = new Error(`Function ${name} failed: ${res.status} ${res.statusText}`) as Error & {
      status?: number;
      body?: unknown;
    };
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

export function listTenantMembers(tenantId: string) {
  return callEdgeFunction("list_tenant_members", { tenant_id: tenantId });
}
