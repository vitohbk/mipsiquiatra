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
  payment_id: string | null;
  payments?: { status: string | null } | null;
  services?: { name: string; modality: string | null } | null;
};

type PaymentStatusMap = Record<string, string>;

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  slug?: string | null;
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
  const [paymentStatusMap, setPaymentStatusMap] = useState<PaymentStatusMap>({});
  const [error, setError] = useState<string | null>(null);
  const [createServiceId, setCreateServiceId] = useState("");
  const [createPatientId, setCreatePatientId] = useState("");
  const [createPatientQuery, setCreatePatientQuery] = useState("");
  const [createProfessionalId, setCreateProfessionalId] = useState("");
  const [createDate, setCreateDate] = useState("");
  const [createTime, setCreateTime] = useState("");
  const [createAvailableSlots, setCreateAvailableSlots] = useState<Slot[]>([]);
  const [createAvailabilityLoading, setCreateAvailabilityLoading] = useState(false);
  const [createAvailabilityLink, setCreateAvailabilityLink] = useState<BookingLink | null>(null);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editPatientId, setEditPatientId] = useState("");
  const [editPatientQuery, setEditPatientQuery] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editOriginalStartAt, setEditOriginalStartAt] = useState<string | null>(null);
  const [editOriginalEndAt, setEditOriginalEndAt] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [canManageBookings, setCanManageBookings] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityLink, setAvailabilityLink] = useState<{
    bookingId: string;
    slug: string | null;
    public_token: string | null;
  } | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!activeTenantId) return;
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("id, customer_name, customer_email, start_at, end_at, status, professional_user_id, service_id, patient_id, payment_id, services(name, modality), payments(status)")
        .eq("tenant_id", activeTenantId)
        .order("start_at", { ascending: true });

      if (bookingError) {
        setError(bookingError.message);
        return;
      }

      setPaymentStatusMap({});

      const { data: serviceData } = await supabase
        .from("services")
        .select("id, name, duration_minutes, slug")
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

      let nextLink: BookingLink | null = null;
      if (linkError || !linkData) {
        const service = services.find((item) => item.id === createServiceId);
        if (!service?.slug) {
          setCreateAvailabilityLink(null);
          setCreateAvailableSlots([]);
          return;
        }
        const { data: createdLink, error: createLinkError } = await (supabase
          .from("public_booking_links") as any)
          .insert({
            tenant_id: activeTenantId,
            service_id: createServiceId,
            professional_user_id: createProfessionalId,
            slug: service.slug,
            public_token: crypto.randomUUID(),
            is_active: true,
          })
          .select("slug, public_token")
          .single();

        if (createLinkError || !createdLink) {
          setCreateAvailabilityLink(null);
          setCreateAvailableSlots([]);
          return;
        }
        nextLink = {
          slug: createdLink.slug ?? null,
          public_token: createdLink.public_token ?? null,
        };
      } else {
        nextLink = {
          slug: linkData.slug ?? null,
          public_token: linkData.public_token ?? null,
        };
      }

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

  const patientLabel = (patient: Patient) =>
    `${patient.first_name} ${patient.last_name}${patient.email ? ` · ${patient.email}` : ""}`.trim();

  const patientNameLabel = (patient: Patient) =>
    `${patient.first_name} ${patient.last_name}`.trim();

  const resolvePatientId = (query: string) => {
    if (!query) return "";
    const match = patients.find((patient) => patientLabel(patient) === query);
    return match?.id ?? "";
  };

  const resolvePatientIdByName = (query: string) => {
    if (!query) return "";
    const match = patients.find((patient) => patientNameLabel(patient) === query);
    return match?.id ?? "";
  };

  const formatDateLabel = (value: string) => {
    const date = new Date(value);
    const weekday = date.toLocaleDateString("es-CL", { weekday: "long" });
    const rest = date.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
    const weekdayLabel = weekday ? `${weekday[0].toUpperCase()}${weekday.slice(1)}` : weekday;
    return `${weekdayLabel}, ${rest}`;
  };

  const servicePillStyle = (name?: string | null) => {
    const label = (name ?? "").toLowerCase();
    if (label.includes("primera")) {
      return "bg-emerald-100 text-emerald-700";
    }
    if (label.includes("control")) {
      return "bg-amber-100 text-amber-700";
    }
    return "bg-[var(--panel-soft)] text-[var(--page-text)]";
  };

  const isPaymentPaid = (booking: Booking) => {
    const statusOverride = booking.payment_id ? paymentStatusMap[booking.payment_id] : undefined;
    const status = statusOverride ?? booking.payments?.status ?? "";
    return status === "paid";
  };

  const groupedBookings = bookings.reduce((acc, booking) => {
    const dateKey = booking.start_at.slice(0, 10);
    const existing = acc.get(dateKey);
    if (existing) {
      existing.push(booking);
    } else {
      acc.set(dateKey, [booking]);
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

  const openReschedule = async (booking: Booking, options?: { quiet?: boolean }) => {
    setEditingBookingId(booking.id);
    setEditPatientId(booking.patient_id ?? "");
    const patient = patients.find((item) => item.id === booking.patient_id);
    setEditPatientQuery(patient ? patientNameLabel(patient) : booking.customer_name ?? "");
    setEditOriginalStartAt(booking.start_at);
    setEditOriginalEndAt(booking.end_at);
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
      if (!options?.quiet) {
        setError(linkError?.message ?? "No se encontró disponibilidad para reprogramar.");
      }
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

  const handleMarkPaid = async (paymentId: string | null) => {
    if (!paymentId) return;
    const previousStatus = paymentStatusMap[paymentId] ?? "";
    setError(null);
    setMarkingPaidId(paymentId);
    setPaymentStatusMap((current) => ({ ...current, [paymentId]: "paid" }));
    const { error: updateError } = await (supabase
      .from("payments") as any)
      .update({ status: "paid" })
      .eq("id", paymentId);
    if (updateError) {
      setError(updateError.message);
      setPaymentStatusMap((current) => ({ ...current, [paymentId]: previousStatus }));
      setMarkingPaidId(null);
      return;
    }
    setMarkingPaidId(null);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm("Cancelar esta cita?")) return;
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
        <h1 className="text-xl font-semibold md:text-2xl">Citas</h1>
        <p className="text-sm text-[var(--panel-muted)]">Listado de citas.</p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="space-y-3">
        {bookings.length === 0 ? (
          <p className="text-sm text-[var(--panel-muted)]">Sin citas aun.</p>
        ) : (
          <div className="space-y-3">
            {Array.from(groupedBookings.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([dateKey, items]) => (
              <div key={dateKey} className="space-y-3">
                <h3 className="text-base font-semibold">{formatDateLabel(dateKey)}</h3>
                <div className="space-y-3">
                  {items
                    .sort(
                      (a, b) =>
                        new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
                    )
                    .map((booking) => {
                    const isPaid = isPaymentPaid(booking);
                    return (
                    <div key={booking.id} className="space-y-3">
                      <div className="group relative flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-white/80 p-4 text-base">
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col gap-2">
                            <div
                              className={`rounded-xl px-4 py-2 text-base font-semibold ${servicePillStyle(
                                booking.services?.name,
                              )}`}
                            >
                              {new Date(booking.start_at).toLocaleTimeString("es-CL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          <div className="space-y-0 leading-tight">
                            <p className="text-base font-semibold">{booking.customer_name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs ${servicePillStyle(
                                  booking.services?.name,
                                )}`}
                              >
                                {booking.services?.name ?? "Servicio sin nombre"}
                              </span>
                              <span className="inline-flex w-fit rounded-full bg-[var(--panel-soft)] px-2 py-0.5 text-xs text-[var(--panel-muted)]">
                                {professionalLabel(booking.professional_user_id)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            className={`inline-flex items-center justify-center p-2 transition hover:text-[var(--page-text)] ${
                              isPaid ? "text-emerald-500" : "text-[var(--panel-muted)]"
                            }`}
                            type="button"
                            onClick={() => handleMarkPaid(booking.payment_id)}
                            disabled={!booking.payment_id || markingPaidId === booking.payment_id}
                            aria-label={isPaid ? "Pagado" : "Marcar como pagado"}
                            title={isPaid ? "Pagado" : "Marcar como pagado"}
                          >
                            <svg
                              viewBox="144 144 512 512"
                              aria-hidden="true"
                              className="h-5 w-5"
                              fill="currentColor"
                            >
                              <g>
                                <path d="m376.38 360.64c-8.6836 0-15.742-7.0625-15.742-15.742 0-8.6836 7.0625-15.742 15.742-15.742h31.488c8.6914 0 15.742-7.0547 15.742-15.742 0-8.6914-7.0547-15.742-15.742-15.742h-15.742c0-8.6914-7.0547-15.742-15.742-15.742-8.6914 0-15.742 7.0547-15.742 15.742v2.7539c-18.316 6.5039-31.488 23.953-31.488 44.477 0 26.047 21.184 47.23 47.23 47.23 8.6836 0 15.742 7.0625 15.742 15.742 0 8.6836-7.0625 15.742-15.742 15.742h-31.488c-8.6914 0-15.742 7.0547-15.742 15.742 0 8.6914 7.0547 15.742 15.742 15.742h15.742c0 8.6914 7.0547 15.742 15.742 15.742 8.6914 0 15.742-7.0547 15.742-15.742v-2.7539c18.309-6.5117 31.488-23.961 31.488-44.477 0-26.047-21.184-47.23-47.23-47.23z" />
                                <path d="m542.55 473.49c-7.2422-4.832-17.012-2.8672-21.828 4.3672l-20.828 31.25-2.1641-2.1562c-6.1484-6.1484-16.113-6.1484-22.262 0-6.1484 6.1484-6.1484 16.113 0 22.262l15.742 15.742c2.957 2.9648 6.9727 4.6094 11.121 4.6094.51172 0 1.0312-.023437 1.5508-.078125 4.6914-.46484 8.9336-3.0078 11.547-6.9336l31.488-47.23c4.8164-7.2383 2.8672-17.016-4.3672-21.832z" />
                                <path d="m541.2 429.44c5.5039-17.074 8.3672-34.844 8.3672-53.059 0-95.496-77.688-173.18-173.18-173.18-95.496 0-173.18 77.688-173.18 173.18 0 95.496 77.688 173.18 173.18 173.18 18.238 0 36.023-2.7852 53.09-8.2969 12.523 32.426 43.949 55.531 80.734 55.531 47.742 0 86.594-38.848 86.594-86.594 0-36.816-23.137-68.258-55.602-80.766zm-306.51-53.059c0-78.129 63.566-141.7 141.7-141.7 78.129 0 141.7 63.566 141.7 141.7 0 16.297-2.875 32.117-8.2422 47.246-47.453.20312-86.02 38.762-86.207 86.223-15.113 5.3711-30.938 8.2266-47.246 8.2266-78.129 0-141.7-63.566-141.7-141.7zm275.52 188.93c-30.379 0-55.105-24.727-55.105-55.105 0-30.379 24.727-55.105 55.105-55.105 30.379 0 55.105 24.727 55.105 55.105 0 30.379-24.727 55.105-55.105 55.105z" />
                              </g>
                            </svg>
                          </button>
                          {canManageBookings ? (
                            <div className="flex flex-row items-center gap-1">
                              <button
                                className="px-2 py-2 text-[var(--panel-muted)] transition hover:text-[var(--page-text)]"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleCancelBooking(booking.id);
                                }}
                                disabled={savingEdit}
                                aria-label="Cancelar"
                              >
                                <svg
                                  viewBox="144 144 512 512"
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                  fill="currentColor"
                                >
                                  <g>
                                    <path d="m588.93 232.06h-41.984v-20.992c0-7.5-4-14.43-10.496-18.18-6.4922-3.75-14.496-3.75-20.992 0-6.4922 3.75-10.496 10.68-10.496 18.18v20.992h-209.92v-20.992c0-7.5-4-14.43-10.496-18.18-6.4961-3.75-14.496-3.75-20.992 0-6.4961 3.75-10.496 10.68-10.496 18.18v20.992h-41.984c-5.5664 0-10.906 2.2109-14.844 6.1484s-6.1484 9.2773-6.1484 14.844v335.87c0 5.5703 2.2109 10.906 6.1484 14.844s9.2773 6.1484 14.844 6.1484h377.86c5.5703 0 10.906-2.2109 14.844-6.1484s6.1484-9.2734 6.1484-14.844v-335.87c0-5.5664-2.2109-10.906-6.1484-14.844s-9.2734-6.1484-14.844-6.1484zm-20.992 335.87h-335.87V358.01h335.87zm0-251.9h-335.87v-41.984h335.87z" />
                                    <path d="m343.11 519.86c3.9414 3.9727 9.3086 6.2109 14.906 6.2109s10.961-2.2383 14.902-6.2109L4e2 492.571l27.078 27.289c3.9414 3.9727 9.3086 6.2109 14.906 6.2109 5.5938 0 10.961-2.2383 14.902-6.2109 3.9727-3.9414 6.2109-9.3086 6.2109-14.906 0-5.5938-2.2383-10.961-6.2109-14.902l-27.289-27.078 27.289-27.078v-0.003907c5.3242-5.3242 7.4062-13.086 5.457-20.359-1.9492-7.2734-7.6328-12.957-14.906-14.906-7.2734-1.9453-15.035 0.13281-20.359 5.457l-27.078 27.289-27.078-27.289h-0.003906c-5.3242-5.3242-13.086-7.4023-20.359-5.457-7.2734 1.9492-12.953 7.6328-14.902 14.906-1.9492 7.2734 0.12891 15.035 5.4531 20.359l27.289 27.082-27.289 27.078c-3.9727 3.9414-6.207 9.3086-6.207 14.902 0 5.5977 2.2344 10.965 6.207 14.906z" />
                                  </g>
                                </svg>
                              </button>
                              <button
                                className="px-2 py-2 text-[var(--panel-muted)] transition hover:text-[var(--page-text)]"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void openReschedule(booking);
                                }}
                                disabled={savingEdit}
                                aria-label="Reprogramar"
                              >
                                <svg
                                  viewBox="144 144 512 512"
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                  fill="currentColor"
                                >
                                  <g>
                                    <path d="m500.76 490.68h-30.23c-7.1992 0-13.852 3.8398-17.453 10.078-3.5977 6.2344-3.5977 13.914 0 20.152 3.6016 6.2344 10.254 10.074 17.453 10.074h30.23c16.031 0 31.41-6.3672 42.75-17.707 11.336-11.336 17.707-26.715 17.707-42.75v-171.29c0-16.035-6.3711-31.414-17.707-42.75-11.34-11.34-26.719-17.707-42.75-17.707H339.54c-16.035 0-31.414 6.3672-42.75 17.707-11.34 11.336-17.707 26.715-17.707 42.75v60.457c0 7.1992 3.8398 13.852 10.074 17.449 6.2344 3.6016 13.918 3.6016 20.152 0 6.2344-3.5977 10.078-10.25 10.078-17.449v-60.457c0-5.3477 2.1211-10.473 5.9023-14.25 3.7773-3.7812 8.9023-5.9023 14.25-5.9023h60.457v40.305c0 7.1992 3.8398 13.852 10.074 17.449 6.2344 3.6016 13.918 3.6016 20.152 0 6.2344-3.5977 10.078-10.25 10.078-17.449v-40.305h60.457c5.3438 0 10.469 2.1211 14.25 5.9023 3.7773 3.7773 5.9023 8.9023 5.9023 14.25v171.29c0 5.3438-2.125 10.473-5.9023 14.25-3.7812 3.7812-8.9062 5.9023-14.25 5.9023z" />
                                    <path d="m365.49 504.84c3.7773 3.7852 8.9102 5.9102 14.258 5.9102s10.477-2.125 14.258-5.9102l41.262-40.707c6.3672-6.293 9.9531-14.875 9.9531-23.828 0-8.957-3.5859-17.539-9.9531-23.832l-41.465-40.91c-5.1289-5.0547-12.566-6.9922-19.512-5.0781-6.9453 1.9102-12.344 7.3867-14.156 14.355-1.8164 6.9727 0.22656 14.383 5.3555 19.441l16.324 15.871h-70.535c-18.348-0.19922-36.074 6.625-49.551 19.074-13.48 12.445-21.688 29.578-22.945 47.879-0.98438 19.32 6.0117 38.195 19.348 52.207 13.336 14.012 31.84 21.93 51.184 21.906h20.152c7.1992 0 13.852-3.8438 17.453-10.078 3.5977-6.2344 3.5977-13.918 0-20.152-3.6016-6.2344-10.254-10.074-17.453-10.074h-20.152c-8.7109 0.003907-17.004-3.7539-22.746-10.309-5.7422-6.5508-8.3789-15.266-7.2305-23.902 1.1328-7.3828 4.8984-14.109 10.602-18.938 5.7031-4.8242 12.961-7.4219 20.434-7.3086h71.441l-16.121 15.871-0.003906-0.003906c-3.8086 3.7539-5.9727 8.8672-6.0117 14.219-0.035156 5.3477 2.0547 10.492 5.8125 14.297z" />
                                  </g>
                                </svg>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {editingBookingId === booking.id && canManageBookings ? (
                        <form
                          className="grid gap-3 rounded-2xl bg-white/80 p-4"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            setError(null);
                            setSavingEdit(true);
                            if (!editingBookingId) {
                              setSavingEdit(false);
                              return;
                            }

                            const patient = patients.find((item) => item.id === editPatientId);
                            if (!patient) {
                              setError("Selecciona un paciente.");
                              setSavingEdit(false);
                              return;
                            }

                            const match = availableSlots.find(
                              (slot) =>
                                toLocalDateInput(slot.start_at) === editDate &&
                                toLocalTimeInput(slot.start_at) === editTime,
                            );
                            const originalDate = editOriginalStartAt
                              ? toLocalDateInput(editOriginalStartAt)
                              : "";
                            const originalTime = editOriginalStartAt
                              ? toLocalTimeInput(editOriginalStartAt)
                              : "";
                            const isOriginalSlot =
                              Boolean(editOriginalStartAt && editOriginalEndAt) &&
                              editDate === originalDate &&
                              editTime === originalTime;
                            if (!match && !isOriginalSlot) {
                              setError("Selecciona un horario disponible.");
                              setSavingEdit(false);
                              return;
                            }
                            const nextStartAt = match?.start_at ?? editOriginalStartAt;
                            const nextEndAt = match?.end_at ?? editOriginalEndAt;
                            if (!nextStartAt || !nextEndAt) {
                              setError("No se pudo mantener la hora actual.");
                              setSavingEdit(false);
                              return;
                            }

                            const { error: updateError } = await (supabase.from("bookings") as any)
                              .update({
                                patient_id: patient.id,
                                customer_name: `${patient.first_name} ${patient.last_name}`,
                                customer_email: patient.email,
                                start_at: nextStartAt,
                                end_at: nextEndAt,
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
                                      patient_id: patient.id,
                                      customer_name: `${patient.first_name} ${patient.last_name}`,
                                      customer_email: patient.email ?? "",
                                      start_at: nextStartAt,
                                      end_at: nextEndAt,
                                    }
                                  : item,
                              ),
                            );
                            setEditingBookingId(null);
                            setSavingEdit(false);
                          }}
                        >
                          <div className="grid gap-3 md:grid-cols-3">
                            <label className="text-base">
                              Paciente
                              <input
                                className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-base"
                                list="patient-options-edit"
                                value={editPatientQuery}
                                onChange={(event) => {
                                  const next = event.target.value;
                                  setEditPatientQuery(next);
                                  setEditPatientId(resolvePatientIdByName(next));
                                }}
                                onBlur={() => {
                                  setEditPatientId(resolvePatientIdByName(editPatientQuery));
                                }}
                                placeholder="Buscar paciente"
                                required
                              />
                              <datalist id="patient-options-edit">
                                {patients.map((patient) => (
                                  <option key={patient.id} value={patientNameLabel(patient)} />
                                ))}
                              </datalist>
                            </label>
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
                              disabled={savingEdit || availabilityLoading}
                            >
                              Guardar
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
                </div>
              </div>
            ))}
            </div>
          )}
      </div>
      {searchParams.get("create") === "1" ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => router.replace("/agenda/citas")}
          role="presentation"
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nueva cita</h2>
              <button
                className="text-sm text-[var(--panel-muted)]"
                type="button"
                onClick={() => router.replace("/agenda/citas")}
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
                    payment_id: null,
                    services: { name: service.name, modality: (service as { modality?: string | null }).modality ?? null },
                  },
                  ...current,
                ]);
                setCreatePatientQuery("");
                router.replace("/agenda/citas");
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
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-base"
                  list="patient-options"
                  value={createPatientQuery}
                  onChange={(event) => {
                    const next = event.target.value;
                    setCreatePatientQuery(next);
                    setCreatePatientId(resolvePatientId(next));
                  }}
                  onBlur={() => {
                    setCreatePatientId(resolvePatientId(createPatientQuery));
                  }}
                  placeholder="Buscar paciente"
                  required
                />
                <datalist id="patient-options">
                  {patients.map((patient) => (
                    <option key={patient.id} value={patientLabel(patient)} />
                  ))}
                </datalist>
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
                  onClick={() => router.replace("/agenda/citas")}
                >
                  Cancelar
                </button>
                <button
                  className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
                  type="submit"
                  disabled={createAvailabilityLoading || createAvailableSlots.length === 0}
                >
                  Crear cita
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
