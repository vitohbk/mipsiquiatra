"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { callEdgeFunction } from "@/lib/api/edge";
import { useActiveTenant } from "@/lib/tenant/useActiveTenant";

type Booking = {
  id: string;
  customer_name: string;
  customer_email: string;
  start_at: string;
  end_at: string;
  status: string;
  professional_user_id: string | null;
  service_id: string | null;
  patient_id: string | null;
  services?: { name: string; modality: string | null } | null;
};


type Service = {
  id: string;
  name: string;
  duration_minutes: number;
};

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
};

type Professional = {
  user_id: string;
  role: string;
  secondary_role?: string | null;
  profiles?: { full_name: string | null; email: string | null } | null;
};

type Slot = {
  start_at: string;
  end_at: string;
};

type BookingLink = {
  slug: string | null;
  public_token: string | null;
};

export default function BookingsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const { activeTenantId } = useActiveTenant();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createServiceId, setCreateServiceId] = useState("");
  const [createPatientId, setCreatePatientId] = useState("");
  const [createProfessionalId, setCreateProfessionalId] = useState("");
  const [createDate, setCreateDate] = useState("");
  const [createTime, setCreateTime] = useState("");
  const [createAvailableSlots, setCreateAvailableSlots] = useState<Slot[]>([]);
  const [createAvailabilityLoading, setCreateAvailabilityLoading] = useState(false);
  const [createAvailabilityLink, setCreateAvailabilityLink] = useState<BookingLink | null>(null);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [canManageBookings, setCanManageBookings] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityLink, setAvailabilityLink] = useState<{
    bookingId: string;
    slug: string | null;
    public_token: string | null;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!activeTenantId) return;
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("id, customer_name, customer_email, start_at, end_at, status, professional_user_id, service_id, patient_id, services(name, modality)")
        .eq("tenant_id", activeTenantId)
        .order("start_at", { ascending: true });

      if (bookingError) {
        setError(bookingError.message);
        return;
      }


      const { data: serviceData } = await supabase
        .from("services")
        .select("id, name, duration_minutes")
        .eq("tenant_id", activeTenantId);

      const { data: patientData } = await supabase
        .from("patients")
        .select("id, first_name, last_name, email")
        .eq("tenant_id", activeTenantId);

      const { data: memberData } = await supabase
        .from("memberships")
        .select("user_id, role, secondary_role")
        .eq("tenant_id", activeTenantId);

      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id ?? null;
      const currentMembership = ((memberData ?? []) as Array<{
        user_id: string;
        role: string;
        secondary_role?: string | null;
      }>).find((member) => member.user_id === currentUserId);
      const canManage =
        currentMembership &&
        (["owner", "admin"].includes(currentMembership.role) ||
          (currentMembership.secondary_role &&
            ["owner", "admin"].includes(currentMembership.secondary_role)));
      setCanManageBookings(Boolean(canManage));

      let professionalList: Professional[] = [];
      const eligibleMembers = ((memberData ?? []) as Array<{
        user_id: string;
        role: string;
        secondary_role?: string | null;
      }>).filter(
        (member) =>
          member.role === "professional" ||
          (member.secondary_role && member.secondary_role === "professional"),
      );
      if (eligibleMembers.length > 0) {
        const memberIds = eligibleMembers.map((member) => member.user_id);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", memberIds);

        const profileMap = new Map(
          ((profileData ?? []) as Array<{
            user_id: string;
            full_name?: string | null;
            email?: string | null;
          }>).map((profile) => [profile.user_id, profile]),
        );
        professionalList = eligibleMembers.map((member) => {
          const profile = profileMap.get(member.user_id);
          return {
            ...member,
            profiles: profile
              ? {
                  full_name: profile.full_name ?? null,
                  email: profile.email ?? null,
                }
              : null,
          };
        });
      }


      setBookings((bookingData ?? []) as Booking[]);
      setServices((serviceData ?? []) as Service[]);
      setPatients((patientData ?? []) as Patient[]);
      setProfessionals(professionalList);
    };

    load();
  }, [supabase, activeTenantId]);

  useEffect(() => {
    if (!createProfessionalId && professionals.length === 1) {
      setCreateProfessionalId(professionals[0].user_id);
    }
  }, [professionals, createProfessionalId]);

  useEffect(() => {
    const loadCreateLink = async () => {
      if (!activeTenantId || !createServiceId || !createProfessionalId) {
        setCreateAvailabilityLink(null);
        setCreateAvailableSlots([]);
        return;
      }
      const { data: linkData, error: linkError } = await supabase
        .from("public_booking_links")
        .select("slug, public_token")
        .eq("tenant_id", activeTenantId)
        .eq("service_id", createServiceId)
        .eq("professional_user_id", createProfessionalId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle<BookingLink>();

      if (linkError || !linkData) {
        setCreateAvailabilityLink(null);
        setCreateAvailableSlots([]);
        return;
      }

      const nextLink: BookingLink = {
        slug: linkData.slug ?? null,
        public_token: linkData.public_token ?? null,
      };
      setCreateAvailabilityLink(nextLink);
      if (createDate) {
        await loadCreateAvailability(nextLink, createDate);
      }
    };

    loadCreateLink();
  }, [activeTenantId, createServiceId, createProfessionalId, createDate, supabase]);

  const professionalLabel = (userId?: string | null) => {
    if (!userId) return "Sin profesional";
    const match = professionals.find((member) => member.user_id === userId);
    return match?.profiles?.full_name ?? match?.profiles?.email ?? "Sin profesional";
  };

  const formatDateLabel = (value: string) => {
    const date = new Date(value);
    const weekday = date.toLocaleDateString("es-CL", { weekday: "long" });
    const rest = date.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
    const weekdayLabel = weekday ? `${weekday[0].toUpperCase()}${weekday.slice(1)}` : weekday;
    return `${weekdayLabel}, ${rest}`;
  };

  const groupedBookings = bookings.reduce((acc, booking) => {
    const label = formatDateLabel(booking.start_at);
    const existing = acc.get(label);
    if (existing) {
      existing.push(booking);
    } else {
      acc.set(label, [booking]);
    }
    return acc;
  }, new Map<string, Booking[]>());

  const toLocalDateInput = (iso: string) => {
    const date = new Date(iso);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  const toLocalTimeInput = (iso: string) => {
    const date = new Date(iso);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(11, 16);
  };

  const loadAvailability = async (
    link: { slug: string | null; public_token: string | null },
    dateStr: string,
    onSlots?: (slots: Slot[]) => void,
  ) => {
    if (!link.slug && !link.public_token) {
      setAvailableSlots([]);
      setEditTime("");
      onSlots?.([]);
      return;
    }
    setAvailabilityLoading(true);
    try {
      const availability = await callEdgeFunction<{ slots: Slot[] }>(
        "public_availability",
        {
          slug: link.slug ?? undefined,
          public_token: link.public_token ?? undefined,
          start_date: dateStr,
          end_date: dateStr,
        },
        { disableAuth: true },
      );
      const slots = availability.slots ?? [];
      setAvailableSlots(slots);
      onSlots?.(slots);
      if (slots.length > 0) {
        const current = slots.find((slot) => toLocalTimeInput(slot.start_at) === editTime);
        if (!current) {
          setEditTime(toLocalTimeInput(slots[0].start_at));
        }
      } else {
        setEditTime("");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar disponibilidad.");
      setAvailableSlots([]);
      setEditTime("");
      onSlots?.([]);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const loadCreateAvailability = async (link: BookingLink, dateStr: string) => {
    setCreateAvailabilityLoading(true);
    try {
      const availability = await callEdgeFunction<{ slots: Slot[] }>(
        "public_availability",
        {
          slug: link.slug ?? undefined,
          public_token: link.public_token ?? undefined,
          start_date: dateStr,
          end_date: dateStr,
        },
        { disableAuth: true },
      );
      const slots = availability.slots ?? [];
      setCreateAvailableSlots(slots);
      if (slots.length > 0) {
        const current = slots.find((slot) => toLocalTimeInput(slot.start_at) === createTime);
        if (!current) {
          setCreateTime(toLocalTimeInput(slots[0].start_at));
        }
      } else {
        setCreateTime("");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar disponibilidad.");
      setCreateAvailableSlots([]);
      setCreateTime("");
    } finally {
      setCreateAvailabilityLoading(false);
    }
  };

  const openReschedule = async (booking: Booking) => {
    setEditingBookingId(booking.id);
    const start = new Date(booking.start_at);
    const localDate = new Date(start.getTime() - start.getTimezoneOffset() * 60000);
    const [datePart, timePart] = localDate.toISOString().split("T");
    const nextDate = datePart ?? "";
    setEditDate(nextDate);
    setEditTime(timePart ? timePart.slice(0, 5) : "");

    if (!activeTenantId || !booking.service_id || !booking.professional_user_id) {
      setAvailabilityLink(null);
      setAvailableSlots([]);
      return;
    }

    const { data: linkData, error: linkError } = await supabase
      .from("public_booking_links")
      .select("slug, public_token")
      .eq("tenant_id", activeTenantId)
      .eq("service_id", booking.service_id)
      .eq("professional_user_id", booking.professional_user_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle<BookingLink>();

    if (linkError || !linkData) {
      setError(linkError?.message ?? "No se encontró disponibilidad para reprogramar.");
      setAvailabilityLink(null);
      setAvailableSlots([]);
      return;
    }

    const nextLink = {
      bookingId: booking.id,
      slug: linkData.slug ?? null,
      public_token: linkData.public_token ?? null,
    };
    setAvailabilityLink(nextLink);
    if (nextDate) {
      await loadAvailability({ slug: nextLink.slug, public_token: nextLink.public_token }, nextDate);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm("Eliminar esta reserva?")) return;
    setError(null);
    const { error: deleteError } = await supabase.from("bookings").delete().eq("id", bookingId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setBookings((current) => current.filter((booking) => booking.id !== bookingId));
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm("Cancelar esta reserva?")) return;
    setError(null);
    setSavingEdit(true);
    const { error: cancelError } = await (supabase.from("bookings") as any)
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    if (cancelError) {
      setError(cancelError.message);
      setSavingEdit(false);
      return;
    }
    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId ? { ...booking, status: "cancelled" } : booking,
      ),
    );
    setEditingBookingId(null);
    setSavingEdit(false);
  };

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold md:text-2xl">Reservas</h1>
        <p className="text-sm text-[var(--panel-muted)]">Listado de reservas.</p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="space-y-3">
        {bookings.length === 0 ? (
          <p className="text-sm text-[var(--panel-muted)]">Sin reservas aun.</p>
        ) : (
          <div className="space-y-3">
            {Array.from(groupedBookings.entries()).map(([label, items]) => (
              <div key={label} className="space-y-3">
                <h3 className="text-base font-semibold">{label}</h3>
                <div className="space-y-3">
                  {items.map((booking) => (
                    <div key={booking.id} className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 text-base">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col gap-2">
                            <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-4 py-2 text-base font-semibold">
                              {new Date(booking.start_at).toLocaleTimeString("es-CL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            {canManageBookings ? (
                              <div className="flex flex-col gap-2">
                                <button
                                  className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600"
                                  type="button"
                                  onClick={() => handleCancelBooking(booking.id)}
                                  disabled={savingEdit}
                                >
                                  Cancelar
                                </button>
                                <button
                                  className="rounded-full border border-teal-500 px-3 py-1 text-xs text-teal-600 hover:bg-teal-50"
                                  type="button"
                                  onClick={() => openReschedule(booking)}
                                  disabled={savingEdit}
                                >
                                  Reprogramar
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <p className="text-base font-semibold">{booking.customer_name}</p>
                            <p className="text-sm text-[var(--panel-muted)]">
                              {professionalLabel(booking.professional_user_id)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--panel-muted)]">
                          <span className="text-[var(--page-text)]">
                            #{booking.services?.name ?? "Servicio sin nombre"}
                          </span>
                          <button
                            className="rounded-full border border-[var(--panel-border)] p-2 text-[var(--panel-muted)] hover:text-[var(--page-text)]"
                            type="button"
                            aria-label="Eliminar reserva"
                            onClick={() => handleDeleteBooking(booking.id)}
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              fill="none"
                              className="h-4 w-4"
                            >
                              <path
                                d="M9.5 3.5h5a1 1 0 0 1 1 1V6h3a1 1 0 1 1 0 2h-1.1l-.7 11.1a2 2 0 0 1-2 1.9H9.3a2 2 0 0 1-2-1.9L6.6 8H5.5a1 1 0 1 1 0-2h3V4.5a1 1 0 0 1 1-1Zm1 2.5v-1h3v1h-3Zm-1.1 4.5a1 1 0 0 1 1 1v5.5a1 1 0 1 1-2 0V11a1 1 0 0 1 1-1Zm5.2 0a1 1 0 0 1 1 1v5.5a1 1 0 1 1-2 0V11a1 1 0 0 1 1-1Z"
                                fill="currentColor"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {editingBookingId === booking.id && canManageBookings ? (
                        <form
                          className="grid gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-soft)] p-4"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            setError(null);
                            setSavingEdit(true);
                            if (!editingBookingId) {
                              setSavingEdit(false);
                              return;
                            }

                            const match = availableSlots.find(
                              (slot) =>
                                toLocalDateInput(slot.start_at) === editDate &&
                                toLocalTimeInput(slot.start_at) === editTime,
                            );
                            if (!match) {
                              setError("Selecciona un horario disponible.");
                              setSavingEdit(false);
                              return;
                            }

                            const { error: updateError } = await (supabase.from("bookings") as any)
                              .update({
                                start_at: match.start_at,
                                end_at: match.end_at,
                              })
                              .eq("id", editingBookingId);

                            if (updateError) {
                              setError(updateError.message);
                              setSavingEdit(false);
                              return;
                            }

                            setBookings((current) =>
                              current.map((item) =>
                                item.id === editingBookingId
                                  ? {
                                      ...item,
                                      start_at: match.start_at,
                                      end_at: match.end_at,
                                    }
                                  : item,
                              ),
                            );
                            setEditingBookingId(null);
                            setSavingEdit(false);
                          }}
                        >
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="text-base">
                              Fecha
                              <input
                                className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-base"
                                type="date"
                                value={editDate}
                                onChange={(event) => {
                                  const nextDate = event.target.value;
                                  setEditDate(nextDate);
                                  if (nextDate && availabilityLink?.bookingId === booking.id) {
                                    loadAvailability(
                                      {
                                        slug: availabilityLink.slug,
                                        public_token: availabilityLink.public_token,
                                      },
                                      nextDate,
                                    );
                                  }
                                }}
                                required
                              />
                            </label>
                            <label className="text-base">
                              Hora disponible
                              <select
                                className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-base"
                                value={editTime}
                                onChange={(event) => setEditTime(event.target.value)}
                                required
                                disabled={availabilityLoading || availableSlots.length === 0}
                              >
                                <option value="">
                                  {availabilityLoading
                                    ? "Cargando..."
                                    : availableSlots.length === 0
                                    ? "Sin horarios disponibles"
                                    : "Selecciona"}
                                </option>
                                {availableSlots.map((slot) => {
                                  if (toLocalDateInput(slot.start_at) !== editDate) return null;
                                  const label = toLocalTimeInput(slot.start_at);
                                  return (
                                    <option key={`${slot.start_at}-${slot.end_at}`} value={label}>
                                      {label}
                                    </option>
                                  );
                                })}
                              </select>
                            </label>
                          </div>
                          {error ? <p className="text-sm text-red-400">{error}</p> : null}
                          <div className="flex justify-end gap-2">
                            <button
                              className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm"
                              type="button"
                              onClick={() => setEditingBookingId(null)}
                              disabled={savingEdit}
                            >
                              Cerrar
                            </button>
                            <button
                              className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
                              type="submit"
                              disabled={savingEdit || availabilityLoading || availableSlots.length === 0}
                            >
                              Guardar
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            </div>
          )}
      </div>
      {searchParams.get("create") === "1" ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => router.replace("/dashboard/bookings")}
          role="presentation"
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nueva reserva</h2>
              <button
                className="text-sm text-[var(--panel-muted)]"
                type="button"
                onClick={() => router.replace("/dashboard/bookings")}
              >
                Cerrar
              </button>
            </div>
            <form
              className="mt-4 grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setError(null);

                if (!activeTenantId) return;
                const service = services.find((item) => item.id === createServiceId);
                const patient = patients.find((item) => item.id === createPatientId);
                if (!service || !patient) {
                  setError("Selecciona servicio y paciente.");
                  return;
                }
                if (!createDate || !createTime) {
                  setError("Selecciona fecha y hora.");
                  return;
                }

                const match = createAvailableSlots.find(
                  (slot) =>
                    toLocalDateInput(slot.start_at) === createDate &&
                    toLocalTimeInput(slot.start_at) === createTime,
                );
                if (!match) {
                  setError("Selecciona un horario disponible.");
                  return;
                }

                const { data: insertedBooking, error: insertError } = await (supabase
                  .from("bookings") as any)
                  .insert({
                  tenant_id: activeTenantId,
                  service_id: service.id,
                  professional_user_id: createProfessionalId || null,
                  patient_id: patient.id,
                  customer_name: `${patient.first_name} ${patient.last_name}`,
                  customer_email: patient.email,
                  start_at: match.start_at,
                  end_at: match.end_at,
                  status: "confirmed",
                  })
                  .select("id")
                  .single();

                if (insertError) {
                  setError(insertError.message);
                  return;
                }

                setBookings((current) => [
                  {
                    id: insertedBooking?.id ?? crypto.randomUUID(),
                    customer_name: `${patient.first_name} ${patient.last_name}`,
                    customer_email: patient.email ?? "",
                    start_at: match.start_at,
                    end_at: match.end_at,
                    status: "confirmed",
                    professional_user_id: createProfessionalId || null,
                    service_id: service.id,
                    patient_id: patient.id,
                    services: { name: service.name, modality: (service as { modality?: string | null }).modality ?? null },
                  },
                  ...current,
                ]);
                router.replace("/dashboard/bookings");
              }}
            >
              <label className="text-base">
                Servicio
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-base"
                  value={createServiceId}
                  onChange={(event) => setCreateServiceId(event.target.value)}
                  required
                >
                  <option value="">Selecciona</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-base">
                Profesional
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-base"
                  value={createProfessionalId}
                  onChange={(event) => setCreateProfessionalId(event.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {professionals.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.profiles?.full_name ?? member.profiles?.email ?? member.user_id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-base">
                Paciente
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-base"
                  value={createPatientId}
                  onChange={(event) => setCreatePatientId(event.target.value)}
                  required
                >
                  <option value="">Selecciona</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-base">
                  Fecha
                  <input
                    className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-base"
                    type="date"
                    value={createDate}
                    onChange={(event) => {
                      const nextDate = event.target.value;
                      setCreateDate(nextDate);
                      if (nextDate && createAvailabilityLink) {
                        loadCreateAvailability(createAvailabilityLink, nextDate);
                      }
                    }}
                    required
                  />
                </label>
                <label className="text-base">
                  Hora disponible
                  <select
                    className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-base"
                    value={createTime}
                    onChange={(event) => setCreateTime(event.target.value)}
                    required
                    disabled={createAvailabilityLoading || createAvailableSlots.length === 0}
                  >
                    <option value="">
                      {createAvailabilityLoading
                        ? "Cargando..."
                        : createAvailableSlots.length === 0
                        ? "Sin horarios disponibles"
                        : "Selecciona"}
                    </option>
                    {createAvailableSlots.map((slot) => {
                      if (toLocalDateInput(slot.start_at) !== createDate) return null;
                      const label = toLocalTimeInput(slot.start_at);
                      return (
                        <option key={`${slot.start_at}-${slot.end_at}`} value={label}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <button
                  className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm"
                  type="button"
                  onClick={() => router.replace("/dashboard/bookings")}
                >
                  Cancelar
                </button>
                <button
                  className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
                  type="submit"
                  disabled={createAvailabilityLoading || createAvailableSlots.length === 0}
                >
                  Crear reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
