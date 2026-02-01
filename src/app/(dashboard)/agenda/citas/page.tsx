"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { callEdgeFunction } from "@/lib/api/edge";
import { useActiveTenant } from "@/lib/tenant/useActiveTenant";

type Booking = {
  id: string;
  customer_name: string;
  customer_email: string;
  created_at?: string | null;
  start_at: string;
  end_at: string;
  status: string;
  professional_user_id: string | null;
  service_id: string | null;
  patient_id: string | null;
  payment_id: string | null;
  payments?: { status: string | null }[] | { status: string | null } | null;
  services?: {
    name: string;
    modality: string | null;
    price_clp?: number | null;
    payment_mode?: string | null;
    deposit_amount_clp?: number | null;
    currency?: string | null;
  } | null;
};

type PaymentStatusMap = Record<string, string>;

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  slug?: string | null;
  price_clp?: number | null;
  payment_mode?: string | null;
  deposit_amount_clp?: number | null;
  currency?: string | null;
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
  const [tenantTimezone, setTenantTimezone] = useState("America/Santiago");
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
  const [activeTab, setActiveTab] = useState<"future" | "past">("future");
  const [futureSort, setFutureSort] = useState<"start_at" | "created_at">("start_at");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalValue, setPaymentModalValue] = useState("");
  const [paymentModalBooking, setPaymentModalBooking] = useState<Booking | null>(null);
  const [paymentModalMode, setPaymentModalMode] = useState<"paid" | "unpaid">("paid");
  const [savingCreate, setSavingCreate] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!activeTenantId) return;
      const [
        bookingsResult,
        servicesResult,
        patientsResult,
        membersResult,
        tenantResult,
        authResult,
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, created_at, customer_name, customer_email, start_at, end_at, status, professional_user_id, service_id, patient_id, payment_id, services(name, modality, price_clp, payment_mode, deposit_amount_clp, currency)",
          )
          .eq("tenant_id", activeTenantId)
          .neq("status", "cancelled")
          .order("start_at", { ascending: true }),
        supabase
          .from("services")
          .select("id, name, duration_minutes, slug, price_clp, payment_mode, deposit_amount_clp, currency")
          .eq("tenant_id", activeTenantId),
        supabase
          .from("patients")
          .select("id, first_name, last_name, email")
          .eq("tenant_id", activeTenantId),
        supabase
          .from("memberships")
          .select("user_id, role, secondary_role")
          .eq("tenant_id", activeTenantId),
        supabase
          .from("tenants")
          .select("timezone")
          .eq("id", activeTenantId)
          .maybeSingle<{ timezone: string | null }>(),
        supabase.auth.getUser(),
      ]);

      if (bookingsResult.error) {
        setError(bookingsResult.error.message);
        return;
      }

      setPaymentStatusMap({});
      const bookingData = (bookingsResult.data ?? []) as Booking[];
      const serviceData = servicesResult.data;
      const patientData = patientsResult.data;
      const memberData = membersResult.data;
      const tenantData = tenantResult.data;
      const authData = authResult.data;
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
      setTenantTimezone(tenantData?.timezone ?? "America/Santiago");

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


      const paymentIds = bookingData
        .map((booking) => booking.payment_id)
        .filter((id): id is string => Boolean(id));
      let paymentStatusMap = new Map<string, string | null>();
      if (paymentIds.length > 0) {
        const { data: paymentData, error: paymentError } = await supabase
          .from("payments")
          .select("id, status")
          .in("id", paymentIds);
        if (paymentError) {
          setError(paymentError.message);
          return;
        }
        paymentStatusMap = new Map(
          (paymentData ?? []).map((payment) => [payment.id, payment.status ?? null]),
        );
      }

      setBookings(
        bookingData.map((booking) => ({
          ...booking,
          payments: booking.payment_id
            ? { status: paymentStatusMap.get(booking.payment_id) ?? null }
            : null,
        })),
      );
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
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0));
    const parts = new Intl.DateTimeFormat("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: tenantTimezone,
    }).formatToParts(date);
    const lookup: Record<string, string> = {};
    for (const part of parts) lookup[part.type] = part.value;
    const weekday = lookup.weekday ?? "";
    const weekdayLabel = weekday ? `${weekday[0].toUpperCase()}${weekday.slice(1)}` : weekday;
    const rest = `${lookup.day ?? ""} ${lookup.month ?? ""} ${lookup.year ?? ""}`.trim();
    return `${weekdayLabel}, ${rest}`.trim();
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
    const paymentKey = booking.payment_id ?? booking.id;
    const statusOverride = paymentStatusMap[paymentKey];
    if (statusOverride) return statusOverride === "paid";
    if (Array.isArray(booking.payments)) {
      return booking.payments[0]?.status === "paid";
    }
    return booking.payments?.status === "paid";
  };

  const toTenantDateKey = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tenantTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));

  const formatTenantTime = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat("es-CL", {
        timeZone: tenantTimezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(iso)),
    [tenantTimezone],
  );

  const loadCreateAvailability = useCallback(async (link: BookingLink, dateStr: string) => {
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
        const current = slots.find((slot) => formatTenantTime(slot.start_at) === createTime);
        if (!current) {
          setCreateTime(formatTenantTime(slots[0].start_at));
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
  }, [createTime, formatTenantTime]);

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
        const { data: createdLinkRaw, error: createLinkError } = await supabase
          .from("public_booking_links")
          .insert({
            tenant_id: activeTenantId,
            service_id: createServiceId,
            professional_user_id: createProfessionalId,
            slug: service.slug,
            public_token: crypto.randomUUID(),
            is_active: true,
          } as unknown as never)
          .select("slug, public_token")
          .single();
        const createdLink = createdLinkRaw as { slug?: string | null; public_token?: string | null } | null;

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
  }, [activeTenantId, createServiceId, createProfessionalId, createDate, supabase, services, loadCreateAvailability]);

  const todayKey = toTenantDateKey(new Date().toISOString());
  const filteredBookings = bookings.filter((booking) => {
    const dateKey = toTenantDateKey(booking.start_at);
    return activeTab === "past" ? dateKey < todayKey : dateKey >= todayKey;
  });

  const groupedBookings = filteredBookings.reduce((acc, booking) => {
    const dateKey = toTenantDateKey(booking.start_at);
    const existing = acc.get(dateKey);
    if (existing) {
      existing.push(booking);
    } else {
      acc.set(dateKey, [booking]);
    }
    return acc;
  }, new Map<string, Booking[]>());

  const sortedGroups = Array.from(groupedBookings.entries()).sort(([aKey, aItems], [bKey, bItems]) => {
    if (activeTab !== "future" || futureSort === "start_at") {
      return aKey.localeCompare(bKey);
    }
    const maxCreatedAt = (items: Booking[]) =>
      Math.max(
        ...items.map((item) => {
          const value = item.created_at ?? item.start_at;
          return new Date(value).getTime();
        }),
      );
    return maxCreatedAt(bItems) - maxCreatedAt(aItems);
  });

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
        const current = slots.find((slot) => formatTenantTime(slot.start_at) === editTime);
        if (!current) {
          setEditTime(formatTenantTime(slots[0].start_at));
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

  const openReschedule = async (booking: Booking, options?: { quiet?: boolean }) => {
    setEditingBookingId(booking.id);
    setEditPatientId(booking.patient_id ?? "");
    const patient = patients.find((item) => item.id === booking.patient_id);
    setEditPatientQuery(patient ? patientNameLabel(patient) : booking.customer_name ?? "");
    setEditOriginalStartAt(booking.start_at);
    setEditOriginalEndAt(booking.end_at);
    const nextDate = toTenantDateKey(booking.start_at);
    setEditDate(nextDate);
    setEditTime(formatTenantTime(booking.start_at));

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

  const openPaymentModal = (booking: Booking, mode: "paid" | "unpaid") => {
    setPaymentModalBooking(booking);
    setPaymentModalMode(mode);
    setPaymentModalValue("");
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentModalBooking(null);
    setPaymentModalValue("");
  };

  const handlePaymentStatus = async (booking: Booking, mode: "paid" | "unpaid") => {
    const paymentKey = booking.payment_id ?? booking.id;
    const previousStatus = paymentStatusMap[paymentKey] ?? "";
    setError(null);
    setMarkingPaidId(paymentKey);
    const optimisticStatus = mode === "paid" ? "paid" : "pending";
    setPaymentStatusMap((current) => ({ ...current, [paymentKey]: optimisticStatus }));
    let didSucceed = false;

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const authToken = sessionData.session?.access_token ?? null;
      if (sessionError || !authToken) {
        throw new Error("No hay sesión activa.");
      }
      const result = await callEdgeFunction<{ payment_id: string; status: string }>(
        "mark_booking_paid",
        { booking_id: booking.id, auth_token: authToken, status: mode },
        { disableAuth: true },
      );
      if (!result?.payment_id) {
        throw new Error(mode === "paid" ? "No se pudo confirmar el pago." : "No se pudo desmarcar el pago.");
      }
      setPaymentStatusMap((current) => {
        const next = { ...current };
        delete next[paymentKey];
        next[result.payment_id] = result.status;
        return next;
      });
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                payment_id: result.payment_id,
                payments: { status: result.status },
              }
            : item,
        ),
      );
      didSucceed = true;
    } catch (markError) {
      const fallback = mode === "paid" ? "No se pudo marcar como pagado." : "No se pudo desmarcar el pago.";
      setError(markError instanceof Error ? markError.message : fallback);
      setPaymentStatusMap((current) => ({ ...current, [paymentKey]: previousStatus }));
    } finally {
      setMarkingPaidId(null);
    }
    return didSucceed;
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm("Cancelar esta cita?")) return;
    setError(null);
    setSavingEdit(true);
    const { error: cancelError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" } as unknown as never)
      .eq("id", bookingId);
    if (cancelError) {
      setError(cancelError.message);
      setSavingEdit(false);
      return;
    }
    const cancelledBooking = bookings.find((booking) => booking.id === bookingId);
    if (cancelledBooking?.id) {
      try {
        await callEdgeFunction(
          "booking_notify",
          {
            booking_id: cancelledBooking.id,
            customer_email: cancelledBooking.customer_email,
            type: "cancelled",
            source: "admin",
          },
          { disableAuth: true },
        );
      } catch {
        // Best-effort cancellation email for manual actions.
      }
    }
    setBookings((current) => current.filter((booking) => booking.id !== bookingId));
    setEditingBookingId(null);
    setSavingEdit(false);
  };

  const pillTone = activeTab === "past" ? "opacity-60" : "";
  const requiredPaymentPhrase = paymentModalMode === "paid" ? "PAGADO" : "NO PAGADO";
  const paymentPhraseMatches =
    paymentModalValue.trim().toUpperCase() === requiredPaymentPhrase;

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold md:text-2xl">Citas</h1>
        <p className="text-sm text-[var(--panel-muted)]">Listado de citas.</p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
            activeTab === "future"
              ? "bg-[var(--panel-soft)] font-semibold text-[var(--brand-ink)]"
              : "text-[var(--brand-copper)] hover:bg-[var(--panel-soft)]"
          }`}
          onClick={() => setActiveTab("future")}
        >
          Citas futuras
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
            activeTab === "past"
              ? "bg-[var(--panel-soft)] font-semibold text-[var(--brand-ink)]"
              : "text-[var(--brand-copper)] hover:bg-[var(--panel-soft)]"
          }`}
          onClick={() => setActiveTab("past")}
        >
          Citas pasadas
        </button>
        {activeTab === "future" ? (
          <label className="ml-auto flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--panel-muted)]">
            Ordenar
            <select
              className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-[var(--page-text)]"
              value={futureSort}
              onChange={(event) => setFutureSort(event.target.value as "start_at" | "created_at")}
            >
              <option value="start_at">Próximas primero</option>
              <option value="created_at">Últimas creadas</option>
            </select>
          </label>
        ) : null}
      </div>

      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <p className="text-sm text-[var(--panel-muted)]">Sin citas aun.</p>
        ) : (
          <div className="space-y-3">
            {sortedGroups.map(([dateKey, items]) => (
              <div key={dateKey} className="space-y-3">
                <h3 className="text-base font-semibold">{formatDateLabel(dateKey)}</h3>
                <div className="space-y-3">
                  {items
                    .sort((a, b) => {
                      if (activeTab === "future" && futureSort === "created_at") {
                        const aValue = a.created_at ?? a.start_at;
                        const bValue = b.created_at ?? b.start_at;
                        return new Date(bValue).getTime() - new Date(aValue).getTime();
                      }
                      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
                    })
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
                              )} ${pillTone}`}
                            >
                              {formatTenantTime(booking.start_at)}
                            </div>
                          </div>
                          <div className="space-y-0 leading-tight">
                            <p className="text-base font-semibold">{booking.customer_name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs ${servicePillStyle(
                                  booking.services?.name,
                                )} ${pillTone}`}
                              >
                                {booking.services?.name ?? "Servicio sin nombre"}
                              </span>
                              <span className="inline-flex w-fit rounded-full bg-[var(--panel-soft)] px-2 py-0.5 text-xs text-[var(--panel-muted)]">
                                {professionalLabel(booking.professional_user_id)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition ${
                              isPaid
                                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                : "border-[var(--panel-border)] text-[var(--panel-muted)] hover:text-[var(--page-text)]"
                            }`}
                            type="button"
                            onClick={() => openPaymentModal(booking, isPaid ? "unpaid" : "paid")}
                            disabled={markingPaidId === (booking.payment_id ?? booking.id)}
                            aria-label={isPaid ? "Desmarcar pago" : "Marcar como pagado"}
                            title={isPaid ? "Desmarcar pago" : "Marcar como pagado"}
                          >
                            P
                          </button>
                          {canManageBookings && activeTab === "future" ? (
                            <>
                              <button
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--panel-border)] text-xs font-semibold text-[var(--panel-muted)] transition hover:text-[var(--page-text)]"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleCancelBooking(booking.id);
                                }}
                                disabled={savingEdit}
                                aria-label="Cancelar"
                                title="Cancelar"
                              >
                                C
                              </button>
                              <button
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--panel-border)] text-xs font-semibold text-[var(--panel-muted)] transition hover:text-[var(--page-text)]"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void openReschedule(booking);
                                }}
                                disabled={savingEdit}
                                aria-label="Reprogramar"
                                title="Reprogramar"
                              >
                                R
                              </button>
                            </>
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
                                toTenantDateKey(slot.start_at) === editDate &&
                                formatTenantTime(slot.start_at) === editTime,
                            );
                            const originalDate = editOriginalStartAt
                              ? toTenantDateKey(editOriginalStartAt)
                              : "";
                            const originalTime = editOriginalStartAt
                              ? formatTenantTime(editOriginalStartAt)
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

                            const { error: updateError } = await supabase
                              .from("bookings")
                              .update({
                                patient_id: patient.id,
                                customer_name: `${patient.first_name} ${patient.last_name}`,
                                customer_email: patient.email,
                                start_at: nextStartAt,
                                end_at: nextEndAt,
                              } as unknown as never)
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
                            if (editingBookingId) {
                              try {
                                await callEdgeFunction(
                                  "booking_notify",
                                  {
                                    booking_id: editingBookingId,
                                    customer_email: patient.email ?? "",
                                    type: "rescheduled",
                                    source: "admin",
                                  },
                                  { disableAuth: true },
                                );
                              } catch {
                                // Best-effort reschedule email for manual actions.
                              }
                            }
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
                                  if (toTenantDateKey(slot.start_at) !== editDate) return null;
                                  const label = formatTenantTime(slot.start_at);
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
                if (savingCreate) return;
                if (!activeTenantId) return;
                setSavingCreate(true);

                try {
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
                      toTenantDateKey(slot.start_at) === createDate &&
                      formatTenantTime(slot.start_at) === createTime,
                  );
                  if (!match) {
                    setError("Selecciona un horario disponible.");
                    return;
                  }

                  const { data: insertedBookingRaw, error: insertError } = await supabase
                    .from("bookings")
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
                    } as unknown as never)
                    .select("id")
                    .single();
                  const insertedBooking = insertedBookingRaw as { id?: string } | null;

                  if (insertError) {
                    if (insertError.message.includes("bookings_no_overlap")) {
                      setError("Ese horario ya está reservado. Actualiza la lista y prueba otro.");
                    } else {
                      setError(insertError.message);
                    }
                    return;
                  }

                  if (insertedBooking?.id) {
                    try {
                      await callEdgeFunction(
                        "booking_notify",
                        {
                          booking_id: insertedBooking.id,
                          customer_email: patient.email,
                          type: "confirmation",
                          source: "admin",
                        },
                        { disableAuth: true },
                      );
                    } catch {
                      // Best-effort confirmation email for manual bookings.
                    }
                  }

                setBookings((current) => [
                  {
                    id: insertedBooking?.id ?? crypto.randomUUID(),
                    created_at: new Date().toISOString(),
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
                } finally {
                  setSavingCreate(false);
                }
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
                      if (toTenantDateKey(slot.start_at) !== createDate) return null;
                      const label = formatTenantTime(slot.start_at);
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
                  disabled={savingCreate || createAvailabilityLoading || createAvailableSlots.length === 0}
                >
                  Crear cita
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {paymentModalOpen && paymentModalBooking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--brand-ink)]">
                {paymentModalMode === "paid" ? "Confirmar pago" : "Desmarcar pago"}
              </h3>
              <p className="text-sm text-[var(--panel-muted)]">
                Escribe <strong>{requiredPaymentPhrase}</strong> para confirmar.
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm text-[var(--page-text)]"
                value={paymentModalValue}
                onChange={(event) => setPaymentModalValue(event.target.value)}
                placeholder={requiredPaymentPhrase}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm"
                  type="button"
                  onClick={closePaymentModal}
                >
                  Cancelar
                </button>
                <button
                  className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)] disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  disabled={!paymentPhraseMatches || markingPaidId !== null}
                  onClick={async () => {
                    const ok = await handlePaymentStatus(paymentModalBooking, paymentModalMode);
                    if (ok) {
                      closePaymentModal();
                    }
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
