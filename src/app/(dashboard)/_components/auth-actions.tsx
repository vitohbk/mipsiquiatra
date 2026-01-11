"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthActions() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <button
      className="rounded-full border border-[var(--panel-border)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--brand-copper)] hover:text-[var(--brand-teal)]"
      type="button"
      onClick={handleLogout}
    >
      Salir
    </button>
  );
}
