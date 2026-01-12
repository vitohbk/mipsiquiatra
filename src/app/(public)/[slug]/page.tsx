"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { callEdgeFunction } from "@/lib/api/edge";
import {
  capitalizeFirst,
  fetchComunas,
  fetchRegions,
  formatRut,
  isValidRut,
  type ChileComuna,
  type ChileRegion,
} from "@/lib/chile";

type ServiceInfo = {
  id: string;
  name: string;
  description: string | null;
  max_advance_hours: number;
  modality: string;
  duration_minutes: number;
  price_clp: number;
  payment_mode: string;
  deposit_amount_clp: number | null;
  currency: string;
  requires_payment: boolean;
  professional_name?: string | null;
  professional_specialty?: string | null;
  professional_avatar_url?: string | null;
};

type TenantInfo = {
  name: string;
  branding: Record<string, unknown> | null;
};

type Slot = { start_at: string; end_at: string };
type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  rut: string | null;
  birth_date: string | null;
  email: string | null;
  phone: string | null;
  address_line: string | null;
  comuna: string | null;
  region: string | null;
  health_insurance: string | null;
};

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function addMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function formatLocalDate(date: Date) {
  return date.toLocaleDateString("es-CL", { dateStyle: "full", timeZone: "UTC" });
}

const insuranceOptions = [
  { value: "fonasa", label: "FONASA" },
  { value: "isapre", label: "ISAPRE" },
  { value: "particular", label: "PARTICULAR" },
];

const weekdayLabels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

export default function PublicBookingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [service, setService] = useState<ServiceInfo | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rut, setRut] = useState("");
  const [noRut, setNoRut] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [comuna, setComuna] = useState("");
  const [region, setRegion] = useState("");
  const [insurance, setInsurance] = useState("fonasa");
  const [regions, setRegions] = useState<ChileRegion[]>([]);
  const [comunas, setComunas] = useState<ChileComuna[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientLookupError, setPatientLookupError] = useState<string | null>(null);
  const [regionOpen, setRegionOpen] = useState(false);
  const [comunaOpen, setComunaOpen] = useState(false);
  const [insuranceOpen, setInsuranceOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const regionRef = useRef<HTMLDivElement | null>(null);
  const comunaRef = useRef<HTMLDivElement | null>(null);
  const insuranceRef = useRef<HTMLDivElement | null>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const progressPercent = Math.min(100, (bookingStep / 3) * 100);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [monthCursor, setMonthCursor] = useState<Date>(new Date());
  const [monthAvailability, setMonthAvailability] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const lookup = await callEdgeFunction<{
          service: ServiceInfo;
          tenant: TenantInfo;
        }>("public_booking_lookup", { slug }, { disableAuth: true });

        setService(lookup.service);
        setTenant(lookup.tenant);

        const selected = new Date();
        const availability = await callEdgeFunction<{ slots: Slot[] }>(
          "public_availability",
          {
            slug,
            start_date: formatDate(selected),
            end_date: formatDate(selected),
          },
          { disableAuth: true },
        );

        setSlots(availability.slots);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error cargando");
      }
    };

    load();
  }, [slug]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (regionOpen && regionRef.current && !regionRef.current.contains(target)) {
        setRegionOpen(false);
      }
      if (comunaOpen && comunaRef.current && !comunaRef.current.contains(target)) {
        setComunaOpen(false);
      }
      if (insuranceOpen && insuranceRef.current && !insuranceRef.current.contains(target)) {
        setInsuranceOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [regionOpen, comunaOpen, insuranceOpen]);

  useEffect(() => {
    if (!selectedSlot) {
      setBookingStep(1);
    }
  }, [selectedSlot]);

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const data = await fetchRegions();
        setRegions(data);
      } catch (loadError) {
        setGeoError(loadError instanceof Error ? loadError.message : "No se pudieron cargar regiones");
      }
    };
    loadRegions();
  }, []);

  useEffect(() => {
    const loadComunas = async () => {
      if (!region || regions.length === 0) {
        setComunas([]);
        return;
      }
      const regionEntry = regions.find((item) => item.name === region || item.code === region);
      if (!regionEntry) {
        setComunas([]);
        return;
      }
      try {
        const data = await fetchComunas(regionEntry.code);
        setComunas(data);
      } catch (loadError) {
        setGeoError(loadError instanceof Error ? loadError.message : "No se pudieron cargar comunas");
      }
    };
    loadComunas();
  }, [region, regions]);

  useEffect(() => {
    const loadSlots = async () => {
      try {
        setError(null);
        const availability = await callEdgeFunction<{ slots: Slot[] }>(
          "public_availability",
          {
            slug,
            start_date: formatDate(selectedDate),
            end_date: formatDate(selectedDate),
          },
          { disableAuth: true },
        );
        setSlots(availability.slots);
        setSelectedSlot(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error cargando");
      }
    };

    if (slug) {
      loadSlots();
    }
  }, [slug, selectedDate]);

  const monthStart = startOfMonth(monthCursor);
  const monthEnd = endOfMonth(monthCursor);
  const monthDays = monthEnd.getUTCDate();
  const firstWeekday = monthStart.getUTCDay();

  useEffect(() => {
    const loadMonth = async () => {
      if (!slug) return;
      try {
        const rangeStart = startOfMonth(monthCursor);
        const rangeEnd = endOfMonth(monthCursor);
        const availability = await callEdgeFunction<{ slots: Slot[] }>(
          "public_availability",
          {
            slug,
            start_date: formatDate(rangeStart),
            end_date: formatDate(rangeEnd),
          },
          { disableAuth: true },
        );
        const map: Record<string, number> = {};
        availability.slots.forEach((slot) => {
          const key = slot.start_at.slice(0, 10);
          map[key] = (map[key] ?? 0) + 1;
        });
        setMonthAvailability(map);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error cargando");
      }
    };

    loadMonth();
  }, [slug, monthCursor]);

  const lookupPatientByRut = async (value: string) => {
    if (!value || noRut) return;
    const normalized = formatRut(value);
    if (!isValidRut(normalized)) return;

    setPatientLoading(true);
    setPatientLookupError(null);

    try {
      const result = await callEdgeFunction<{ patients: Patient[] }>(
        "public_patient_lookup",
        {
          slug,
          query: normalized,
        },
        { disableAuth: true },
      );
      if (result.patients.length > 0) {
        const patient = result.patients[0];
        setFirstName(patient.first_name);
        setLastName(patient.last_name);
        setRut(patient.rut ?? normalized);
        setBirthDate(patient.birth_date ?? "");
        setEmail(patient.email ?? "");
        setPhone(patient.phone ?? "");
        setAddressLine(patient.address_line ?? "");
        setComuna(patient.comuna ?? "");
        setRegion(patient.region ?? "");
        setInsurance(patient.health_insurance ?? "fonasa");
      }
    } catch (lookupError) {
      setPatientLookupError(lookupError instanceof Error ? lookupError.message : "Error buscando paciente");
    } finally {
      setPatientLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--brand-bg)] px-6 py-12 font-[var(--font-source-sans)] text-[var(--brand-body)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Link
          className="text-base uppercase tracking-[0.35em] text-[var(--brand-copper)] hover:text-[var(--brand-teal)]"
          href="/"
        >
          ← Volver
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--brand-border)] bg-white shadow-sm ring-1 ring-black/5">
            {(() => {
              const logoUrl = (tenant?.branding as { logo_url?: string } | null)?.logo_url;
              return logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
              ) : null;
            })()}
          </div>
          <div className="space-y-0.5">
            <p className="text-sm uppercase tracking-[0.25em] text-[var(--brand-muted)] opacity-70">
              {tenant?.name ?? "Reserva"}
            </p>
            <h1 className="text-xl font-[var(--font-playfair)] leading-tight text-[var(--brand-ink)] md:text-2xl">
              {service?.name ?? `Reserva para ${slug}`}
            </h1>
          </div>
        </div>
        {error ? <p className="text-base text-red-500">{error}</p> : null}
        <div
          className={`grid items-start gap-6 rounded-3xl border border-[var(--brand-border)] bg-white p-6 shadow-sm ${
            bookingStep === 1 ? "lg:grid-cols-[0.95fr_2.05fr]" : "lg:grid-cols-[1.1fr_1.9fr]"
          }`}
        >
          <div
            className={`rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-paper)] p-4 shadow-sm ${
              bookingStep === 1 ? "lg:col-span-1" : "lg:col-span-1"
            }`}
          >
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[var(--brand-border)] bg-white shadow-sm ring-1 ring-black/5">
                  {service?.professional_avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={service.professional_avatar_url}
                      alt={service?.professional_name ?? "Profesional"}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                  <div>
                    <p className="text-base font-semibold text-[var(--brand-ink)]">
                      {service?.professional_name ?? "Profesional"}
                    </p>
                    <p className="text-sm text-[var(--brand-muted)] opacity-70">
                      {service?.professional_specialty ?? "Especialidad"}
                    </p>
                  </div>
                </div>
                {service?.description ? (
                  <p className="text-sm text-[var(--brand-muted)] opacity-70">{service.description}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 text-sm uppercase tracking-wide text-[var(--brand-body)]">
                {service ? (
                  <span className="rounded-full border border-[var(--brand-border)] bg-white px-2 py-1 text-[var(--brand-copper)]">
                    ${service.price_clp.toLocaleString("es-CL")}
                  </span>
                ) : null}
                {service?.requires_payment ? (
                  <span className="rounded-full border border-[var(--brand-border)] bg-white px-2 py-1">
                    Pago online
                  </span>
                ) : null}
                {service?.modality ? (
                  <span className="rounded-full border border-[var(--brand-border)] bg-white px-2 py-1">
                    {service.modality === "zoom" ? "Videollamada" : service.modality}
                  </span>
                ) : null}
              </div>
              <div className="border-t border-[var(--brand-border)] pt-3">
                <p className="text-sm font-semibold text-[var(--brand-muted)]">Fecha y hora</p>
                <div className="mt-1 space-y-1 text-base font-medium">
                  <div className="flex items-center gap-2">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-[var(--brand-muted)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1zm12 8H5v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7zm-1-4H6a1 1 0 0 0-1 1v1h14V7a1 1 0 0 0-1-1z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>{formatLocalDate(selectedDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-[var(--brand-muted)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm1 3a1 1 0 0 0-2 0v5a1 1 0 0 0 .3.71l3 3a1 1 0 1 0 1.4-1.42L13 11.6V7z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>
                      {selectedSlot
                        ? new Date(selectedSlot.start_at).toLocaleTimeString("es-CL", { timeStyle: "short" })
                        : "Selecciona una hora"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {bookingStep === 1 ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-[var(--font-playfair)] text-[var(--brand-ink)] md:text-2xl">
                  Elige día y hora
                </h2>
                <div className="h-2 w-full rounded-full bg-[var(--brand-soft)]">
                  <div
                    className="h-full rounded-full bg-[var(--brand-teal)] transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-[var(--font-playfair)] text-[var(--brand-ink)] md:text-xl">
                      {capitalizeFirst(monthCursor.toLocaleDateString("es-CL", { month: "long" }))}
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-full border border-[var(--brand-border)] p-1 text-xs text-[var(--brand-copper)] transition hover:text-[var(--brand-teal)]"
                        type="button"
                        aria-label="Mes anterior"
                        onClick={() => setMonthCursor(addMonths(monthCursor, -1))}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="rotate-180"
                        >
                          <path
                            d="M9.71069 18.2929C10.1012 18.6834 10.7344 18.6834 11.1249 18.2929l4.8874-4.8923C16.7927 12.6195 16.7924 11.3537 16.0117 10.5729L11.1213 5.68254C10.7308 5.29202 10.0976 5.29202 9.70708 5.68254c-.39053.39053-.39053 1.02369 0 1.41422L13.8927 11.2824C14.2833 11.6729 14.2833 12.3061 13.8927 12.6966L9.71069 16.8787c-.39053.3905-.39053 1.0236 0 1.4142z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                      <button
                        className="rounded-full border border-[var(--brand-border)] p-1 text-xs text-[var(--brand-copper)] transition hover:text-[var(--brand-teal)]"
                        type="button"
                        aria-label="Mes siguiente"
                        onClick={() => setMonthCursor(addMonths(monthCursor, 1))}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M9.71069 18.2929C10.1012 18.6834 10.7344 18.6834 11.1249 18.2929l4.8874-4.8923C16.7927 12.6195 16.7924 11.3537 16.0117 10.5729L11.1213 5.68254C10.7308 5.29202 10.0976 5.29202 9.70708 5.68254c-.39053.39053-.39053 1.02369 0 1.41422L13.8927 11.2824C14.2833 11.6729 14.2833 12.3061 13.8927 12.6966L9.71069 16.8787c-.39053.3905-.39053 1.0236 0 1.4142z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center text-sm text-[var(--brand-muted)]">
                    {weekdayLabels.map((label) => (
                      <div key={label}>{label}</div>
                    ))}
                    {Array.from({ length: firstWeekday }).map((_, idx) => (
                      <div key={`empty-${idx}`} />
                    ))}
                    {Array.from({ length: monthDays }).map((_, idx) => {
                      const day = idx + 1;
                      const date = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth(), day));
                      const isSelected = formatDate(date) === formatDate(selectedDate);
                      const dayKey = formatDate(date);
                      const hasSlots = (monthAvailability[dayKey] ?? 0) > 0;
                      return (
                        <button
                          key={`day-${day}`}
                          type="button"
                          className={`rounded-full border px-2 py-2 text-base transition ${
                            isSelected
                              ? "border-[var(--brand-teal)] bg-[var(--brand-teal)] text-black"
                              : hasSlots
                                ? "border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-ink)] hover:bg-[var(--brand-border)]"
                                : "border-[var(--brand-border)] text-[var(--brand-muted)] hover:bg-[var(--brand-paper)]"
                          }`}
                          onClick={() => setSelectedDate(date)}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-3 shadow-sm">
                  {slots.length === 0 ? (
                    <p className="text-base text-[var(--brand-muted)]">Sin horarios disponibles.</p>
                  ) : (
                    <>
                      <div className="grid gap-2">
                        {slots.map((slot) => {
                          const isSelected = selectedSlot?.start_at === slot.start_at;
                          return (
                            <div
                              key={slot.start_at}
                              className={`grid items-stretch gap-2 transition-all duration-300 ease-out ${
                                isSelected ? "grid-cols-[1fr_1.2fr]" : "grid-cols-[1fr_0fr]"
                              }`}
                            >
                              <button
                                type="button"
                                className="rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-left text-base transition-all duration-300 ease-out hover:bg-[var(--brand-soft)]"
                                onClick={() => setSelectedSlot(isSelected ? null : slot)}
                              >
                                {new Date(slot.start_at).toLocaleString("es-CL", { timeStyle: "short" })}
                              </button>
                              <button
                                type="button"
                                className={`overflow-hidden rounded-full bg-[var(--brand-teal)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-black transition-all duration-300 ease-out ${
                                  isSelected
                                    ? "opacity-100 translate-x-0"
                                    : "pointer-events-none opacity-0 translate-x-2"
                                }`}
                                onClick={() => {
                                  setError(null);
                                  setBookingStep(2);
                                }}
                              >
                                Siguiente
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-[var(--font-playfair)] text-[var(--brand-ink)] md:text-2xl">
                  Datos personales
                </h2>
                <div className="h-2 w-full rounded-full bg-[var(--brand-soft)]">
                  <div
                    className="h-full rounded-full bg-[var(--brand-teal)] transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              {patientLookupError ? (
                <p className="mt-4 text-sm text-amber-500">{patientLookupError}</p>
              ) : null}
              <form
                className="mt-4 grid gap-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setError(null);
                  setBookingStatus(null);
                  setIsSubmitting(true);

                  if (!selectedSlot) {
                    setError("Selecciona un horario.");
                    setIsSubmitting(false);
                    return;
                  }

                  const normalizedRut = noRut ? "" : formatRut(rut);
                  if (!noRut && !isValidRut(normalizedRut)) {
                    setError("RUT invalido.");
                    setIsSubmitting(false);
                    return;
                  }

                  const normalizedFirstName = capitalizeFirst(firstName);
                  const normalizedLastName = capitalizeFirst(lastName);

                  try {
                    const result = await callEdgeFunction<{
                      payment_id: string;
                      redirect_url: string;
                      lock_token: string;
                      booking_id?: string;
                      status?: string;
                    }>("create_payment_intent", {
                      slug,
                      start_at: selectedSlot.start_at,
                      end_at: selectedSlot.end_at,
                      customer_name: `${normalizedFirstName} ${normalizedLastName}`.trim(),
                      customer_email: email,
                      patient: {
                        first_name: normalizedFirstName,
                        last_name: normalizedLastName,
                        rut: noRut ? null : normalizedRut,
                        birth_date: birthDate,
                        email,
                        phone,
                        address_line: addressLine,
                        comuna,
                        region,
                        health_insurance: insurance,
                      },
                      idempotency_key: crypto.randomUUID(),
                      return_url: `${window.location.origin}/${slug}/gracias`,
                    }, { disableAuth: true });

                    if (result.booking_id) {
                      setBookingStatus(`Reserva confirmada. ID ${result.booking_id}.`);
                      return;
                    }

                    if (result.redirect_url) {
                      window.location.href = result.redirect_url;
                      return;
                    }

                    setBookingStatus(
                      `Lock creado. Payment ${result.payment_id}. Checkout no disponible.`,
                    );
                  } catch (intentError) {
                    setError(intentError instanceof Error ? intentError.message : "Error creando pago");
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                {bookingStep === 2 ? (
                  <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base text-[var(--brand-ink)]">
                          <div className="flex items-center gap-2">
                            RUT
                            <span className="flex items-center gap-1 text-xs text-[var(--brand-muted)]">
                              (
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={noRut}
                                onChange={(event) => {
                                  setNoRut(event.target.checked);
                                  if (event.target.checked) {
                                    setRut("");
                                  }
                                }}
                              />{" "}
                              Sin RUT)
                            </span>
                          </div>
                          <input
                            className="mt-2 w-full rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-2 text-base text-[var(--brand-ink)]"
                            value={rut}
                            onChange={(event) => setRut(event.target.value)}
                            onBlur={() => {
                              const normalized = formatRut(rut);
                              setRut(normalized);
                              lookupPatientByRut(normalized);
                            }}
                            required
                            disabled={noRut || patientLoading}
                          />
                        </label>
                        <label className="text-base text-[var(--brand-ink)]">
                          Fecha nacimiento
                          <input
                            className="mt-2 w-full rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-2 text-base text-[var(--brand-ink)]"
                            type="date"
                            value={birthDate}
                            onChange={(event) => setBirthDate(event.target.value)}
                            required
                          />
                        </label>
                        <label className="text-base text-[var(--brand-ink)]">
                          Nombre
                          <input
                            className="mt-2 w-full rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-2 text-base text-[var(--brand-ink)]"
                            value={firstName}
                            onChange={(event) => setFirstName(event.target.value)}
                            onBlur={() => setFirstName(capitalizeFirst(firstName))}
                            required
                          />
                        </label>
                        <label className="text-base text-[var(--brand-ink)]">
                          Apellidos
                          <input
                            className="mt-2 w-full rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-2 text-base text-[var(--brand-ink)]"
                            value={lastName}
                            onChange={(event) => setLastName(event.target.value)}
                            onBlur={() => setLastName(capitalizeFirst(lastName))}
                            required
                          />
                        </label>
                      </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        className="rounded-full border border-[var(--brand-border)] px-6 py-3 text-sm uppercase tracking-[0.2em] text-[var(--brand-copper)]"
                        type="button"
                        onClick={() => setBookingStep(1)}
                      >
                        Volver
                      </button>
                      <button
                        className="rounded-full bg-[var(--brand-teal)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        disabled={!firstName || !lastName || !birthDate || (!noRut && !rut)}
                        onClick={() => {
                          if (!firstName || !lastName || !birthDate) {
                            setError("Completa los datos personales.");
                            return;
                          }
                          if (!noRut && !isValidRut(rut)) {
                            setError("RUT invalido.");
                            return;
                          }
                          setError(null);
                          setBookingStep(3);
                        }}
                      >
                        Continuar
                      </button>
                    </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="text-base text-[var(--brand-ink)]">
                              Email
                              <input
                                className="mt-2 w-full rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-2 text-base text-[var(--brand-ink)]"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                              />
                            </label>
                            <label className="text-base text-[var(--brand-ink)]">
                              Telefono
                              <input
                                className="mt-2 w-full rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-2 text-base text-[var(--brand-ink)]"
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                                required
                              />
                            </label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="text-base text-[var(--brand-ink)]">
                              Domicilio
                              <input
                                className="mt-2 w-full rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-2 text-base text-[var(--brand-ink)]"
                                value={addressLine}
                                onChange={(event) => setAddressLine(event.target.value)}
                                required
                              />
                            </label>
                            <label className="text-base text-[var(--brand-ink)]">
                              Region
                              <div className="relative" ref={regionRef}>
                                <button
                                  type="button"
                                  className="mt-2 flex w-full items-center justify-between rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-2 text-left text-base text-[var(--brand-ink)]"
                                  onClick={() => {
                                    setRegionOpen((prev) => !prev);
                                    setComunaOpen(false);
                                  }}
                                >
                                  <span>{region || "Selecciona"}</span>
                                  <svg
                                    aria-hidden="true"
                                    className="h-4 w-4 text-[var(--brand-muted)]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M7.41 9.59a1 1 0 0 1 1.41 0L12 12.76l3.18-3.17a1 1 0 1 1 1.41 1.41l-3.88 3.88a1 1 0 0 1-1.41 0L7.41 11a1 1 0 0 1 0-1.41z"
                                      fill="currentColor"
                                    />
                                  </svg>
                                </button>
                                {regionOpen && (
                                  <div className="absolute inset-x-0 z-20 mt-1 max-h-56 overflow-auto rounded-2xl border border-[var(--brand-border)] bg-white shadow-lg">
                                    {regions.map((item) => (
                                      <button
                                        key={item.code}
                                        type="button"
                                        className="w-full px-3 py-2 text-left text-base text-[var(--brand-ink)] hover:bg-[var(--brand-soft)]"
                                        onClick={() => {
                                          setRegion(item.name);
                                          setComuna("");
                                          setRegionOpen(false);
                                        }}
                                      >
                                        {item.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </label>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="text-base text-[var(--brand-ink)]">
                              Comuna
                              <div className="relative" ref={comunaRef}>
                                <button
                                  type="button"
                                  className="mt-2 flex w-full items-center justify-between rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-2 text-left text-base text-[var(--brand-ink)] disabled:opacity-50"
                                  onClick={() => {
                                    if (!region || comunas.length === 0) return;
                                    setComunaOpen((prev) => !prev);
                                    setRegionOpen(false);
                                  }}
                                  disabled={!region || comunas.length === 0}
                                >
                                  <span>{comuna || "Selecciona"}</span>
                                  <svg
                                    aria-hidden="true"
                                    className="h-4 w-4 text-[var(--brand-muted)]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M7.41 9.59a1 1 0 0 1 1.41 0L12 12.76l3.18-3.17a1 1 0 1 1 1.41 1.41l-3.88 3.88a1 1 0 0 1-1.41 0L7.41 11a1 1 0 0 1 0-1.41z"
                                      fill="currentColor"
                                    />
                                  </svg>
                                </button>
                                {comunaOpen && (
                                  <div className="absolute inset-x-0 z-20 mt-1 max-h-56 overflow-auto rounded-2xl border border-[var(--brand-border)] bg-white shadow-lg">
                                    {comunas.map((item) => (
                                      <button
                                        key={item.code}
                                        type="button"
                                        className="w-full px-3 py-2 text-left text-base text-[var(--brand-ink)] hover:bg-[var(--brand-soft)]"
                                        onClick={() => {
                                          setComuna(item.name);
                                          setComunaOpen(false);
                                        }}
                                      >
                                        {item.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </label>
                            <label className="text-base text-[var(--brand-ink)]">
                              Previsión
                              <div className="relative" ref={insuranceRef}>
                                <button
                                  type="button"
                                  className="mt-2 flex w-full items-center justify-between rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-2 text-left text-base text-[var(--brand-ink)]"
                                  onClick={() => {
                                    setInsuranceOpen((prev) => !prev);
                                  }}
                                >
                                  <span>
                                    {insuranceOptions.find((option) => option.value === insurance)?.label ??
                                      "Selecciona"}
                                  </span>
                                  <svg
                                    aria-hidden="true"
                                    className="h-4 w-4 text-[var(--brand-muted)]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M7.41 9.59a1 1 0 0 1 1.41 0L12 12.76l3.18-3.17a1 1 0 1 1 1.41 1.41l-3.88 3.88a1 1 0 0 1-1.41 0L7.41 11a1 1 0 0 1 0-1.41z"
                                      fill="currentColor"
                                    />
                                  </svg>
                                </button>
                                {insuranceOpen && (
                                  <div className="absolute inset-x-0 z-20 mt-1 rounded-2xl border border-[var(--brand-border)] bg-white shadow-lg">
                                    {insuranceOptions.map((option) => (
                                      <button
                                        key={option.value}
                                        type="button"
                                        className="flex w-full items-center justify-between px-3 py-2 text-left text-base text-[var(--brand-ink)] hover:bg-[var(--brand-soft)]"
                                        onClick={() => {
                                          setInsurance(option.value);
                                          setInsuranceOpen(false);
                                        }}
                                      >
                                        <span>{option.label}</span>
                                        {insurance === option.value && (
                                          <span className="text-[var(--brand-ink)]">✓</span>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                      {bookingStatus ? <p className="text-base text-emerald-600">{bookingStatus}</p> : null}
                      {geoError ? <p className="text-sm text-amber-500">{geoError}</p> : null}
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          className="rounded-full border border-[var(--brand-border)] px-6 py-3 text-sm uppercase tracking-[0.2em] text-[var(--brand-copper)]"
                          type="button"
                          onClick={() => setBookingStep(2)}
                        >
                          Volver
                        </button>
                        <button
                          className="rounded-full bg-[var(--brand-teal)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black"
                          type="submit"
                          disabled={isSubmitting}
                          aria-busy={isSubmitting}
                        >
                          {isSubmitting
                            ? "Procesando..."
                            : service?.requires_payment
                              ? "Confirmar y pagar"
                              : "Confirmar reserva"}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>
            )}
        </div>
      </div>
    </main>
  );
}
