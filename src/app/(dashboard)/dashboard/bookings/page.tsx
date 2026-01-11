"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
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
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editServiceId, setEditServiceId] = useState("");
  const [editPatientId, setEditPatientId] = useState("");
  const [editProfessionalId, setEditProfessionalId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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

      let professionalList: Professional[] = [];
      const eligibleMembers = ((memberData ?? []) as Array<{
        user_id: string;
        role: string;
        secondary_role?: string | null;
      }>).filter(
        (member) =>
          ["admin", "professional"].includes(member.role) ||
          (member.secondary_role && ["admin", "professional"].includes(member.secondary_role)),
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

  const professionalLabel = (userId?: string | null) => {
    if (!userId) return "Sin profesional";
    const match = professionals.find((member) => member.user_id === userId);
    return match?.profiles?.full_name ?? match?.profiles?.email ?? "Sin profesional";
  };

  const groupedBookings = bookings.reduce((acc, booking) => {
    const label = new Date(booking.start_at).toLocaleDateString("es-CL", { dateStyle: "full" });
    const existing = acc.get(label);
    if (existing) {
      existing.push(booking);
    } else {
      acc.set(label, [booking]);
    }
    return acc;
  }, new Map<string, Booking[]>());

  const openEditBooking = (booking: Booking) => {
    setEditingBookingId(booking.id);
    setEditServiceId(booking.service_id ?? "");
    setEditPatientId(booking.patient_id ?? "");
    setEditProfessionalId(booking.professional_user_id ?? "");
    const start = new Date(booking.start_at);
    const localDate = new Date(start.getTime() - start.getTimezoneOffset() * 60000);
    const [datePart, timePart] = localDate.toISOString().split("T");
    setEditDate(datePart ?? "");
    setEditTime(timePart ? timePart.slice(0, 5) : "");
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

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold md:text-2xl">Reservas</h1>
        <p className="text-sm text-[var(--panel-muted)]">Listado de reservas y pagos.</p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="space-y-3">
        {bookings.length === 0 ? (
          <p className="text-sm text-[var(--panel-muted)]">Sin reservas aun.</p>
        ) : (
          <div className="space-y-3">
            {Array.from(groupedBookings.entries()).map(([label, items]) => (
              <div key={label} className="space-y-3">
                <h3 className="text-base font-semibold capitalize">{label}</h3>
                <div className="space-y-3">
                  {items.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 text-base transition hover:border-[var(--page-text)] cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => openEditBooking(booking)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          openEditBooking(booking);
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-4 py-2 text-base font-semibold">
                          {new Date(booking.start_at).toLocaleTimeString("es-CL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold">{booking.customer_name}</p>
                          <p className="text-sm text-[var(--panel-muted)]">
                            {professionalLabel(booking.professional_user_id)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--panel-muted)]">
                        <span className="badge rounded-full px-3 py-1">
                          {booking.services?.name ?? "Servicio sin nombre"}
                        </span>
                        <button
                          className="rounded-full border border-[var(--panel-border)] p-2 text-[var(--panel-muted)] hover:text-[var(--page-text)]"
                          type="button"
                          aria-label="Eliminar reserva"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteBooking(booking.id);
                          }}
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

                const startAt = new Date(`${createDate}T${createTime}:00`);
                const endAt = new Date(startAt.getTime() + service.duration_minutes * 60000);

                if (createProfessionalId) {
                  const { data: overlap, error: overlapError } = await supabase
                    .from("bookings")
                    .select("id")
                    .eq("professional_user_id", createProfessionalId)
                    .eq("status", "confirmed")
                    .lt("start_at", endAt.toISOString())
                    .gt("end_at", startAt.toISOString())
                    .limit(1);

                  if (overlapError) {
                    setError(overlapError.message);
                    return;
                  }
                  if (overlap && overlap.length > 0) {
                    setError("El profesional ya tiene una reserva en ese horario.");
                    return;
                  }
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
                  start_at: startAt.toISOString(),
                  end_at: endAt.toISOString(),
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
                    start_at: startAt.toISOString(),
                    end_at: endAt.toISOString(),
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
                    onChange={(event) => setCreateDate(event.target.value)}
                    required
                  />
                </label>
                <label className="text-base">
                  Hora
                  <input
                    className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-base"
                    type="time"
                    value={createTime}
                    onChange={(event) => setCreateTime(event.target.value)}
                    required
                  />
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
                >
                  Crear reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {editingBookingId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setEditingBookingId(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editar reserva</h2>
              <button
                className="text-sm text-[var(--panel-muted)]"
                type="button"
                onClick={() => setEditingBookingId(null)}
              >
                Cerrar
              </button>
            </div>
            <form
              className="mt-4 grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setError(null);
                setSavingEdit(true);
                if (!activeTenantId || !editingBookingId) return;

                const service = services.find((item) => item.id === editServiceId);
                const patient = patients.find((item) => item.id === editPatientId);
                if (!service || !patient) {
                  setError("Selecciona servicio y paciente.");
                  setSavingEdit(false);
                  return;
                }
                if (!editDate || !editTime) {
                  setError("Selecciona fecha y hora.");
                  setSavingEdit(false);
                  return;
                }

                const startAt = new Date(`${editDate}T${editTime}:00`);
                const endAt = new Date(startAt.getTime() + service.duration_minutes * 60000);

                if (editProfessionalId) {
                  const { data: overlap, error: overlapError } = await supabase
                    .from("bookings")
                    .select("id")
                    .eq("professional_user_id", editProfessionalId)
                    .eq("status", "confirmed")
                    .neq("id", editingBookingId)
                    .lt("start_at", endAt.toISOString())
                    .gt("end_at", startAt.toISOString())
                    .limit(1);

                  if (overlapError) {
                    setError(overlapError.message);
                    setSavingEdit(false);
                    return;
                  }
                  if (overlap && overlap.length > 0) {
                    setError("El profesional ya tiene una reserva en ese horario.");
                    setSavingEdit(false);
                    return;
                  }
                }

                const { error: updateError } = await (supabase.from("bookings") as any)
                  .update({
                    service_id: service.id,
                    professional_user_id: editProfessionalId || null,
                    patient_id: patient.id,
                    customer_name: `${patient.first_name} ${patient.last_name}`,
                    customer_email: patient.email,
                    start_at: startAt.toISOString(),
                    end_at: endAt.toISOString(),
                  })
                  .eq("id", editingBookingId);

                if (updateError) {
                  setError(updateError.message);
                  setSavingEdit(false);
                  return;
                }

                setBookings((current) =>
                  current.map((booking) =>
                    booking.id === editingBookingId
                      ? {
                          ...booking,
                          service_id: service.id,
                          patient_id: patient.id,
                          professional_user_id: editProfessionalId || null,
                          customer_name: `${patient.first_name} ${patient.last_name}`,
                          customer_email: patient.email ?? "",
                          start_at: startAt.toISOString(),
                          end_at: endAt.toISOString(),
                        }
                      : booking,
                  ),
                );
                setEditingBookingId(null);
                setSavingEdit(false);
              }}
            >
              <label className="text-base">
                Servicio
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-base"
                  value={editServiceId}
                  onChange={(event) => setEditServiceId(event.target.value)}
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
                  value={editProfessionalId}
                  onChange={(event) => setEditProfessionalId(event.target.value)}
                  required
                >
                  <option value="">Selecciona</option>
                  {professionals.map((professional) => (
                    <option key={professional.user_id} value={professional.user_id}>
                      {professional.profiles?.full_name ?? professional.profiles?.email ?? professional.user_id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-base">
                Paciente
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-base"
                  value={editPatientId}
                  onChange={(event) => setEditPatientId(event.target.value)}
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
              <label className="text-base">
                Fecha
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-base"
                  type="date"
                  value={editDate}
                  onChange={(event) => setEditDate(event.target.value)}
                  required
                />
              </label>
              <label className="text-base">
                Hora
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-base"
                  type="time"
                  value={editTime}
                  onChange={(event) => setEditTime(event.target.value)}
                  required
                />
              </label>
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <button
                  className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm"
                  type="button"
                  onClick={() => setEditingBookingId(null)}
                  disabled={savingEdit}
                >
                  Cancelar
                </button>
                <button
                  className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
                  type="submit"
                  disabled={savingEdit}
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
