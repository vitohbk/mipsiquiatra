"use client";
import { useEffect } from "react";

// Captures the first URL of the session so funnel events can reference
// which landing page drove the conversion, even across domains.
export function LandingTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("landing_url")) return;
    sessionStorage.setItem("landing_url", window.location.href);
  }, []);

  return null;
}
