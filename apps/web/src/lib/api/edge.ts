import { supabaseBrowser } from "@/lib/supabase/client";

type EdgeAuthOptions = {
  authToken?: string | null;
  disableAuth?: boolean;
};

export async function callEdgeFunction<T>(
  name: string,
  payload: unknown,
  authTokenOrOptions?: string | EdgeAuthOptions,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  const url = `${supabaseUrl}/functions/v1/${name}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (supabaseAnonKey) {
    headers.apikey = supabaseAnonKey;
  }

  const options =
    typeof authTokenOrOptions === "string" || authTokenOrOptions === null || authTokenOrOptions === undefined
      ? { authToken: authTokenOrOptions }
      : authTokenOrOptions;

  // Prefer a fresh session token when available; fall back to provided token.
  let token: string | null = options.authToken ?? null;
  if (!options.disableAuth) {
    try {
      const supabase = supabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const expiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
      const needsRefresh = session?.refresh_token && expiresAt && Date.now() > expiresAt - 60_000;
      if (needsRefresh) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        token = refreshed.session?.access_token ?? token;
      } else if (session?.access_token) {
        token = session.access_token;
      }
    } catch (e) {
      // ignore errors getting session
    }
  }

  if (options.disableAuth) {
    if (supabaseAnonKey) {
      headers.Authorization = `Bearer ${supabaseAnonKey}`;
    }
  } else if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }

  if (!response.ok) {
    throw new Error(data?.error ?? `Edge function error: ${response.status}`);
  }

  return data as T;
}
