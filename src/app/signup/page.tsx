"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = supabaseBrowser();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setNotice("Revisa tu correo para confirmar la cuenta.");
    router.replace("/dashboard");
  };

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-20 text-[var(--page-text)]">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--panel-muted)]">
            Mipsiquiatra
          </p>
          <h1 className="text-3xl font-semibold">Crea tu cuenta</h1>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            Email
            <input
              className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm text-[var(--page-text)]"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm text-[var(--page-text)]"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}
          <button
            className="w-full rounded-xl bg-[var(--page-text)] px-4 py-3 text-sm font-semibold text-[var(--page-bg)]"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>
        <p className="text-sm text-[var(--panel-muted)]">
          Ya tienes cuenta?{" "}
          <Link className="text-[var(--page-text)] underline" href="/login">
            Ingresar
          </Link>
        </p>
      </div>
    </main>
  );
}
