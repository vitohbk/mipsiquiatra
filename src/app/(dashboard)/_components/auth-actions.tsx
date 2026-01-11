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
      className="rounded-full border border-[var(--panel-border)] px-3 py-1 text-xs text-[var(--page-text)]"
      type="button"
      onClick={handleLogout}
    >
      Salir
    </button>
  );
}
