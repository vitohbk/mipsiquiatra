"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { callEdgeFunction } from "@/lib/api/edge";
import { useActiveTenant } from "@/lib/tenant/useActiveTenant";
import AvailabilityRuleEditor, { type AvailabilityRuleDraft } from "../../_components/availability-rule-editor";

const roleLabels = {
  owner: "Owner",
  admin: "Admin",
  professional: "Professional",
  staff: "Usuario",
};

const editableRoles = ["admin", "professional", "staff"] as const;

type Member = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  secondary_role?: string | null;
  profiles?: {
    email: string | null;
    full_name: string | null;
    specialty?: string | null;
    avatar_url?: string | null;
  } | null;
};

export default function UsersPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const { activeTenantId } = useActiveTenant();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSpecialty, setInviteSpecialty] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteTab, setInviteTab] = useState<"details" | "availability">("details");
  const [inviteRuleWeekdays, setInviteRuleWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [inviteRuleStartTime, setInviteRuleStartTime] = useState("09:00");
  const [inviteRuleEndTime, setInviteRuleEndTime] = useState("18:00");
  const [inviteRulesDraft, setInviteRulesDraft] = useState<AvailabilityRuleDraft[]>([]);
  const [inviteExceptionDate, setInviteExceptionDate] = useState("");
  const [inviteExceptionStart, setInviteExceptionStart] = useState("09:00");
  const [inviteExceptionEnd, setInviteExceptionEnd] = useState("12:00");
  const [inviteExceptionAvailable, setInviteExceptionAvailable] = useState(false);
  const [inviteExceptionAllDay, setInviteExceptionAllDay] = useState(true);
  const [inviteExceptionNote, setInviteExceptionNote] = useState("");
  const [inviteExceptionsDraft, setInviteExceptionsDraft] = useState<
    { date: string; startTime: string; endTime: string; allDay: boolean; isAvailable: boolean; note: string }[]
  >([]);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [editRole, setEditRole] = useState("staff");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editSecondaryRole, setEditSecondaryRole] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<"details" | "availability">("details");
  const [editRuleWeekdays, setEditRuleWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [editRuleStartTime, setEditRuleStartTime] = useState("09:00");
  const [editRuleEndTime, setEditRuleEndTime] = useState("18:00");
  const [editRulesDraft, setEditRulesDraft] = useState<AvailabilityRuleDraft[]>([]);
  const [editExceptionDate, setEditExceptionDate] = useState("");
  const [editExceptionStart, setEditExceptionStart] = useState("09:00");
  const [editExceptionEnd, setEditExceptionEnd] = useState("12:00");
  const [editExceptionAvailable, setEditExceptionAvailable] = useState(false);
  const [editExceptionAllDay, setEditExceptionAllDay] = useState(true);
  const [editExceptionNote, setEditExceptionNote] = useState("");
  const [editExceptionsDraft, setEditExceptionsDraft] = useState<
    { date: string; startTime: string; endTime: string; allDay: boolean; isAvailable: boolean; note: string }[]
  >([]);
  const [editAvailabilityLoading, setEditAvailabilityLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadMembers = async () => {
    if (!activeTenantId) return;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { data, error: loadError } = await supabase
        .from("memberships")
        .select("id, tenant_id, user_id, role, secondary_role")
        .eq("tenant_id", activeTenantId);

      if (loadError) {
        setError(loadError.message);
        return;
      }

      const normalized = (data ?? []) as Member[];
      const userIds = normalized.map((member) => member.user_id);
      if (userIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("user_id, email, full_name, specialty, avatar_url")
          .in("user_id", userIds);

        if (profileError) {
          setError(profileError.message);
          return;
        }

        const profileMap = new Map(
          ((profileData ?? []) as Array<{
            user_id: string;
            email?: string | null;
            full_name?: string | null;
            specialty?: string | null;
            avatar_url?: string | null;
          }>).map((profile) => [profile.user_id, profile]),
        );
        normalized.forEach((member) => {
          const profile = profileMap.get(member.user_id);
          member.profiles = profile
            ? {
                email: profile.email ?? null,
                full_name: profile.full_name ?? null,
                specialty: profile.specialty ?? null,
                avatar_url: profile.avatar_url ?? null,
              }
            : null;
        });
      }

      setMembers(normalized);
      if (authData?.user?.id) {
        const self = (normalized as Member[]).find((member) => member.user_id === authData.user.id);
        setCurrentRole(self?.role ?? null);
        setCurrentUserId(authData.user.id);
      }
    } catch (edgeError) {
      setError(edgeError instanceof Error ? edgeError.message : "Error cargando usuarios");
    }
  };

  useEffect(() => {
    loadMembers();
  }, [supabase, activeTenantId]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setInviteTab("details");
      setInviteRulesDraft([]);
      setInviteExceptionsDraft([]);
      setInvitePassword("");
    }
  }, [searchParams]);

  const displayName = (member: Member) => {
    const name = member.profiles?.full_name?.trim();
    return name ? name : "Sin nombre";
  };

  const openEdit = (member: Member) => {
    setEditingMember(member);
    setEditTab("details");
    setEditName(member.profiles?.full_name ?? "");
    setEditSpecialty(member.profiles?.specialty ?? "");
    setEditRole(member.role);
    setEditSecondaryRole(member.secondary_role ?? null);
    setEditAvatarUrl(member.profiles?.avatar_url ?? null);
    setEditAvatarFile(null);
    setEditRuleWeekdays([]);
    setEditRuleStartTime("09:00");
    setEditRuleEndTime("18:00");
    setEditRulesDraft([]);
    setEditExceptionDate("");
    setEditExceptionStart("09:00");
    setEditExceptionEnd("12:00");
    setEditExceptionAvailable(false);
    setEditExceptionAllDay(true);
    setEditExceptionNote("");
    setEditExceptionsDraft([]);
  };

  useEffect(() => {
    const loadAvailability = async () => {
      if (!editingMember || !activeTenantId) return;
      setEditAvailabilityLoading(true);
      try {
        const [rulesResult, exceptionsResult] = await Promise.all([
          supabase
            .from("availability_rules")
            .select("weekday, start_time, end_time")
            .eq("tenant_id", activeTenantId)
            .eq("professional_user_id", editingMember.user_id)
            .is("service_id", null)
            .eq("is_active", true)
            .order("weekday", { ascending: true }),
          supabase
            .from("availability_exceptions")
            .select("date, start_time, end_time, is_available, note")
            .eq("tenant_id", activeTenantId)
            .eq("professional_user_id", editingMember.user_id)
            .is("service_id", null)
            .order("date", { ascending: true }),
        ]);

        if (rulesResult.error) throw rulesResult.error;
        if (exceptionsResult.error) throw exceptionsResult.error;

        const rules = (rulesResult.data ?? []) as Array<{
          weekday: number;
          start_time: string;
          end_time: string;
        }>;
        if (rules.length > 0) {
          const grouped = new Map<string, AvailabilityRuleDraft>();
          rules.forEach((rule) => {
            const key = `${rule.start_time}-${rule.end_time}`;
            const current = grouped.get(key) ?? {
              weekdays: [],
              startTime: rule.start_time,
              endTime: rule.end_time,
            };
            current.weekdays.push(rule.weekday);
            grouped.set(key, current);
          });
          const groupedRules = Array.from(grouped.values());
          setEditRulesDraft(groupedRules);
          setEditRuleWeekdays(groupedRules[0]?.weekdays ?? []);
          setEditRuleStartTime(groupedRules[0]?.startTime ?? "09:00");
          setEditRuleEndTime(groupedRules[0]?.endTime ?? "18:00");
        } else {
          setEditRuleWeekdays([]);
          setEditRuleStartTime("09:00");
          setEditRuleEndTime("18:00");
          setEditRulesDraft([]);
        }

        const exceptions = (exceptionsResult.data ?? []) as Array<{
          date: string;
          start_time: string | null;
          end_time: string | null;
          is_available: boolean;
          note: string | null;
        }>;
        if (exceptions.length > 0) {
          const first = exceptions[0];
          setEditExceptionDate(first.date);
          setEditExceptionAvailable(first.is_available);
          setEditExceptionNote(first.note ?? "");
          if (first.start_time && first.end_time) {
            setEditExceptionAllDay(false);
            setEditExceptionStart(first.start_time);
            setEditExceptionEnd(first.end_time);
          } else {
            setEditExceptionAllDay(true);
            setEditExceptionStart("09:00");
            setEditExceptionEnd("12:00");
          }
          setEditExceptionsDraft(
            exceptions.map((ex) => ({
              date: ex.date,
              startTime: ex.start_time ?? "09:00",
              endTime: ex.end_time ?? "12:00",
              allDay: !ex.start_time || !ex.end_time,
              isAvailable: ex.is_available,
              note: ex.note ?? "",
            })),
          );
        } else {
          setEditExceptionDate("");
          setEditExceptionAvailable(false);
          setEditExceptionNote("");
          setEditExceptionAllDay(true);
          setEditExceptionStart("09:00");
          setEditExceptionEnd("12:00");
          setEditExceptionsDraft([]);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error cargando disponibilidad");
      } finally {
        setEditAvailabilityLoading(false);
      }
    };

    loadAvailability();
  }, [editingMember, activeTenantId, supabase]);

  const handleDeleteMember = async (member: Member) => {
    if (member.role === "owner") {
      setError("No puedes eliminar al owner.");
      return;
    }
    if (member.user_id === currentUserId) {
      setError("No puedes eliminar tu propio usuario.");
      return;
    }
    if (!window.confirm("Eliminar este usuario del tenant?")) return;
    setError(null);

    const { error: deleteError } = await supabase.from("memberships").delete().eq("id", member.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadMembers();
  };

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold md:text-2xl">Usuarios</h1>
        <p className="text-sm text-[var(--panel-muted)]">Roles del equipo.</p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="space-y-3">
        {members.length === 0 ? (
          <p className="text-sm text-[var(--panel-muted)]">Sin usuarios.</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold">{displayName(member)}</p>
                  <p className="text-xs text-[var(--panel-muted)]">{member.profiles?.email ?? "-"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[var(--panel-border)] px-3 py-1 text-xs text-[var(--panel-muted)]">
                    {roleLabels[member.role as keyof typeof roleLabels] ?? member.role}
                    {member.secondary_role
                      ? ` + ${roleLabels[member.secondary_role as keyof typeof roleLabels] ?? member.secondary_role}`
                      : ""}
                  </span>
                  <button
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-1 text-xs"
                    type="button"
                    onClick={() => openEdit(member)}
                  >
                    Editar
                  </button>
                  {member.role !== "owner" ? (
                    <button
                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-1 text-xs"
                      type="button"
                      onClick={() => handleDeleteMember(member)}
                    >
                      Eliminar
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {editingMember ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setEditingMember(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editar usuario</h2>
              <button
                className="text-sm text-[var(--panel-muted)]"
                type="button"
                onClick={() => setEditingMember(null)}
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <button
                className={`rounded-full border px-3 py-1 ${
                  editTab === "details"
                    ? "border-[var(--page-text)] bg-[var(--page-text)] text-[var(--page-bg)]"
                    : "border-[var(--panel-border)] text-[var(--page-text)]"
                }`}
                type="button"
                onClick={() => setEditTab("details")}
              >
                Detalles
              </button>
              <button
                className={`rounded-full border px-3 py-1 ${
                  editTab === "availability"
                    ? "border-[var(--page-text)] bg-[var(--page-text)] text-[var(--page-bg)]"
                    : "border-[var(--panel-border)] text-[var(--page-text)]"
                }`}
                type="button"
                onClick={() => setEditTab("availability")}
              >
                Disponibilidad
              </button>
            </div>
            <form
              className="mt-4 grid gap-4 md:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!editingMember) return;
                setError(null);
                setSavingEdit(true);
                try {
                  const resolvedRules = editRulesDraft;

                  for (const rule of resolvedRules) {
                    if (rule.weekdays.length === 0) {
                      setError("Selecciona al menos un dia.");
                      return;
                    }
                    if (rule.startTime >= rule.endTime) {
                      setError("La hora de inicio debe ser menor a la de fin.");
                      return;
                    }
                  }

                  const resolvedExceptions =
                    editExceptionsDraft.length > 0
                      ? editExceptionsDraft
                      : editExceptionDate
                        ? [
                            {
                              date: editExceptionDate,
                              startTime: editExceptionStart,
                              endTime: editExceptionEnd,
                              allDay: editExceptionAllDay,
                              isAvailable: editExceptionAvailable,
                              note: editExceptionNote,
                            },
                          ]
                        : [];

                  for (const ex of resolvedExceptions) {
                    if (!ex.date) {
                      setError("Ingresa una fecha para la excepcion.");
                      return;
                    }
                    if (!ex.allDay && ex.startTime >= ex.endTime) {
                      setError("La hora de inicio debe ser menor a la de fin en la excepcion.");
                      return;
                    }
                  }

                  const profileUpdates: Record<string, string | null> = {};
                  if (editName.trim() !== (editingMember.profiles?.full_name ?? "")) {
                    profileUpdates.full_name = editName.trim();
                  }
                  if (editSpecialty.trim() !== (editingMember.profiles?.specialty ?? "")) {
                    profileUpdates.specialty = editSpecialty.trim() || null;
                  }
                  if (editAvatarFile) {
                    const extension = editAvatarFile.name.split(".").pop() ?? "png";
                    const filePath = `users/${editingMember.user_id}.${extension}`;
                    const { error: uploadError } = await supabase.storage
                      .from("avatars")
                      .upload(filePath, editAvatarFile, {
                        upsert: true,
                        contentType: editAvatarFile.type || "image/png",
                      });
                    if (uploadError) {
                      throw uploadError;
                    }
                    const { data: publicUrlData } = supabase.storage
                      .from("avatars")
                      .getPublicUrl(filePath);
                    const nextAvatarUrl = publicUrlData?.publicUrl ?? null;
                    profileUpdates.avatar_url = nextAvatarUrl;
                    setEditAvatarUrl(nextAvatarUrl);
                  }

                  if (Object.keys(profileUpdates).length > 0) {
                    const { error: profileError } = await (supabase
                      .from("profiles") as any)
                      .update(profileUpdates)
                      .eq("user_id", editingMember.user_id);
                    if (profileError) {
                      throw profileError;
                    }
                  }

                  if (editingMember.role !== "owner" && editRole !== editingMember.role) {
                    const { error: roleError } = await (supabase
                      .from("memberships") as any)
                      .update({ role: editRole })
                      .eq("id", editingMember.id);
                    if (roleError) {
                      throw roleError;
                    }
                  }

                  if ((editSecondaryRole ?? null) !== (editingMember.secondary_role ?? null)) {
                    const { error: secondaryError } = await (supabase
                      .from("memberships") as any)
                      .update({ secondary_role: editSecondaryRole })
                      .eq("id", editingMember.id);
                    if (secondaryError) {
                      throw secondaryError;
                    }
                  }

                  if (activeTenantId) {
                    const { error: deleteRulesError } = await supabase
                      .from("availability_rules")
                      .delete()
                      .eq("tenant_id", activeTenantId)
                      .eq("professional_user_id", editingMember.user_id)
                      .is("service_id", null);
                    if (deleteRulesError) {
                      throw deleteRulesError;
                    }

                    if (resolvedRules.length > 0) {
                      const rulePayload = resolvedRules.flatMap((rule) =>
                        rule.weekdays.map((day) => ({
                          tenant_id: activeTenantId,
                          professional_user_id: editingMember.user_id,
                          service_id: null,
                          weekday: day,
                          start_time: rule.startTime,
                          end_time: rule.endTime,
                          timezone: "America/Santiago",
                        })),
                      );
                      const { error: ruleError } = await (supabase
                        .from("availability_rules") as any)
                        .insert(rulePayload);
                      if (ruleError) {
                        throw ruleError;
                      }
                    }

                    const { error: deleteExceptionsError } = await supabase
                      .from("availability_exceptions")
                      .delete()
                      .eq("tenant_id", activeTenantId)
                      .eq("professional_user_id", editingMember.user_id)
                      .is("service_id", null);
                    if (deleteExceptionsError) {
                      throw deleteExceptionsError;
                    }

                    if (resolvedExceptions.length > 0) {
                      const exceptionPayload = resolvedExceptions.map((ex) => ({
                        tenant_id: activeTenantId,
                        professional_user_id: editingMember.user_id,
                        service_id: null,
                        date: ex.date,
                        is_available: ex.isAvailable,
                        note: ex.note || null,
                        start_time: ex.allDay ? null : ex.startTime,
                        end_time: ex.allDay ? null : ex.endTime,
                      }));
                      const { error: exceptionError } = await (supabase
                        .from("availability_exceptions") as any)
                        .insert(exceptionPayload);
                      if (exceptionError) {
                        throw exceptionError;
                      }
                    }
                  }

                  await loadMembers();
                  setEditingMember(null);
                } catch (updateError) {
                  setError(updateError instanceof Error ? updateError.message : "Error actualizando usuario");
                } finally {
                  setSavingEdit(false);
                }
              }}
            >
              {editTab === "details" ? (
                <>
                  <div className="md:col-span-2">
                    <p className="text-sm text-[var(--panel-muted)]">Avatar del profesional</p>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="h-14 w-14 overflow-hidden rounded-full border border-[var(--panel-border)] bg-[var(--panel-soft)]">
                        {editAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={editAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <label className="text-sm">
                        <input
                          type="file"
                          accept="image/*"
                          className="block text-sm"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            setEditAvatarFile(file);
                          }}
                        />
                        <span className="mt-1 block text-xs text-[var(--panel-muted)]">
                          JPG o PNG. Se guarda en Supabase Storage.
                        </span>
                      </label>
                    </div>
                  </div>
                  <label className="text-sm">
                    Nombre
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                    />
                  </label>
                  <label className="text-sm">
                    Especialidad
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={editSpecialty}
                      onChange={(event) => setEditSpecialty(event.target.value)}
                    />
                  </label>
                  <label className="text-sm">
                    Rol
                    {editingMember.role === "owner" || !["owner", "admin"].includes(currentRole ?? "") ? (
                      <input
                        className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                        value={
                          roleLabels[editingMember.role as keyof typeof roleLabels] ?? editingMember.role
                        }
                        disabled
                      />
                    ) : (
                      <select
                        className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                        value={editRole}
                        onChange={(event) => setEditRole(event.target.value)}
                      >
                        {editableRoles.map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role as keyof typeof roleLabels]}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                  <label className="text-sm">
                    Rol adicional (opcional)
                    {["owner", "admin"].includes(currentRole ?? "") ? (
                      <select
                        className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                        value={editSecondaryRole ?? ""}
                        onChange={(event) => setEditSecondaryRole(event.target.value || null)}
                      >
                        <option value="">Sin rol adicional</option>
                        {editableRoles.map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role as keyof typeof roleLabels]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                        value={
                          editSecondaryRole
                            ? roleLabels[editSecondaryRole as keyof typeof roleLabels] ?? editSecondaryRole
                            : "Sin rol adicional"
                        }
                        disabled
                      />
                    )}
                  </label>
                </>
              ) : (
                <div className="grid gap-4 md:col-span-2">
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                    <AvailabilityRuleEditor
                      title="Disponibilidad"
                      weekdays={editRuleWeekdays}
                      setWeekdays={setEditRuleWeekdays}
                      startTime={editRuleStartTime}
                      endTime={editRuleEndTime}
                      onStartTimeChange={setEditRuleStartTime}
                      onEndTimeChange={setEditRuleEndTime}
                      onAddRule={() => {
                        setError(null);
                        if (editRuleWeekdays.length === 0) {
                          setError("Selecciona al menos un dia.");
                          return;
                        }
                        if (editRuleStartTime >= editRuleEndTime) {
                          setError("La hora de inicio debe ser menor a la de fin.");
                          return;
                        }
                        setEditRulesDraft((current) => [
                          ...current,
                          {
                            weekdays: [...editRuleWeekdays],
                            startTime: editRuleStartTime,
                            endTime: editRuleEndTime,
                          },
                        ]);
                      }}
                      loading={editAvailabilityLoading}
                      rules={editRulesDraft}
                      onRemoveRule={(index) =>
                        setEditRulesDraft((current) => {
                          const next = current.filter((_, idx) => idx !== index);
                          if (next.length === 0) {
                            setEditRuleWeekdays([]);
                          }
                          return next;
                        })
                      }
                    />
                  </div>
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Excepciones</h3>
                      <button
                        className="rounded-full border border-[var(--panel-border)] px-3 py-1 text-xs"
                        type="button"
                        onClick={() => {
                          setError(null);
                          if (!editExceptionDate) {
                            setError("Ingresa una fecha para la excepcion.");
                            return;
                          }
                          if (!editExceptionAllDay && editExceptionStart >= editExceptionEnd) {
                            setError("La hora de inicio debe ser menor a la de fin en la excepcion.");
                            return;
                          }
                          setEditExceptionsDraft((current) => [
                            ...current,
                            {
                              date: editExceptionDate,
                              startTime: editExceptionStart,
                              endTime: editExceptionEnd,
                              allDay: editExceptionAllDay,
                              isAvailable: editExceptionAvailable,
                              note: editExceptionNote,
                            },
                          ]);
                          setEditExceptionDate("");
                          setEditExceptionStart("09:00");
                          setEditExceptionEnd("12:00");
                          setEditExceptionAvailable(false);
                          setEditExceptionAllDay(true);
                          setEditExceptionNote("");
                        }}
                      >
                        Agregar
                      </button>
                    </div>
                    {editAvailabilityLoading ? (
                      <p className="mt-2 text-xs text-[var(--panel-muted)]">Cargando disponibilidad...</p>
                    ) : (
                      <>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="text-sm md:col-span-2">
                            Fecha
                            <input
                              className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                              type="date"
                              value={editExceptionDate}
                              onChange={(event) => setEditExceptionDate(event.target.value)}
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm md:col-span-2">
                            <input
                              type="checkbox"
                              checked={editExceptionAvailable}
                              onChange={(event) => setEditExceptionAvailable(event.target.checked)}
                            />
                            Disponible extra
                          </label>
                          <label className="flex items-center gap-2 text-sm md:col-span-2">
                            <input
                              type="checkbox"
                              checked={editExceptionAllDay}
                              onChange={(event) => setEditExceptionAllDay(event.target.checked)}
                            />
                            Todo el dia
                          </label>
                          {!editExceptionAllDay ? (
                            <>
                              <label className="text-sm">
                                Inicio
                                <input
                                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                                  type="time"
                                  value={editExceptionStart}
                                  onChange={(event) => setEditExceptionStart(event.target.value)}
                                  required
                                />
                              </label>
                              <label className="text-sm">
                                Fin
                                <input
                                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                                  type="time"
                                  value={editExceptionEnd}
                                  onChange={(event) => setEditExceptionEnd(event.target.value)}
                                  required
                                />
                              </label>
                            </>
                          ) : null}
                          <label className="text-sm md:col-span-2">
                            Nota
                            <input
                              className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                              value={editExceptionNote}
                              onChange={(event) => setEditExceptionNote(event.target.value)}
                              placeholder="Feriado, vacaciones, etc."
                            />
                          </label>
                        </div>
                        {editExceptionsDraft.length > 0 ? (
                          <div className="mt-4 space-y-2 text-sm">
                            {editExceptionsDraft.map((ex, index) => (
                              <div
                                key={`${ex.date}-${index}`}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--panel-border)] px-3 py-2"
                              >
                                <div className="flex flex-col text-xs text-[var(--panel-muted)]">
                                  <span>{ex.date}</span>
                                  <span>{ex.allDay ? "Todo el dia" : `${ex.startTime} - ${ex.endTime}`}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span>{ex.isAvailable ? "Disponible" : "Bloqueado"}</span>
                                  {ex.note ? <span className="text-[var(--panel-muted)]">{ex.note}</span> : null}
                                </div>
                                <button
                                  className="text-xs text-[var(--panel-muted)]"
                                  type="button"
                                  onClick={() =>
                                    setEditExceptionsDraft((current) => current.filter((_, idx) => idx !== index))
                                  }
                                >
                                  Quitar
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              )}
              {error ? <p className="text-sm text-red-400 md:col-span-2">{error}</p> : null}
              <div className="flex justify-end gap-2 md:col-span-2">
                <button
                  className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm"
                  type="button"
                  onClick={() => setEditingMember(null)}
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
      {searchParams.get("create") === "1" ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => router.replace("/agenda/users")}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nuevo usuario</h2>
              <button
                className="text-sm text-[var(--panel-muted)]"
                type="button"
                onClick={() => router.replace("/agenda/users")}
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <button
                className={`rounded-full border px-3 py-1 ${
                  inviteTab === "details"
                    ? "border-[var(--page-text)] bg-[var(--page-text)] text-[var(--page-bg)]"
                    : "border-[var(--panel-border)] text-[var(--page-text)]"
                }`}
                type="button"
                onClick={() => setInviteTab("details")}
              >
                Detalles
              </button>
              <button
                className={`rounded-full border px-3 py-1 ${
                  inviteTab === "availability"
                    ? "border-[var(--page-text)] bg-[var(--page-text)] text-[var(--page-bg)]"
                    : "border-[var(--panel-border)] text-[var(--page-text)]"
                }`}
                type="button"
                onClick={() => setInviteTab("availability")}
              >
                Disponibilidad
              </button>
            </div>
            <form
              className="mt-4 grid gap-4 md:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                setError(null);

                if (!activeTenantId) return;

                try {
                  const result = await callEdgeFunction<{ user_id: string }>("create_tenant_user", {
                    tenant_id: activeTenantId,
                    full_name: inviteName,
                    email: inviteEmail,
                    specialty: inviteSpecialty.trim() || null,
                    role: inviteRole,
                    password: invitePassword,
                  });
                  const newUserId = result.user_id;

                  const resolvedRules =
                    inviteRulesDraft.length > 0
                      ? inviteRulesDraft
                      : inviteRuleWeekdays.length > 0
                        ? [{ weekdays: inviteRuleWeekdays, startTime: inviteRuleStartTime, endTime: inviteRuleEndTime }]
                        : [];

                  for (const rule of resolvedRules) {
                    if (rule.weekdays.length === 0) {
                      throw new Error("Selecciona al menos un dia.");
                    }
                    if (rule.startTime >= rule.endTime) {
                      throw new Error("La hora de inicio debe ser menor a la de fin.");
                    }
                  }

                  const resolvedExceptions =
                    inviteExceptionsDraft.length > 0
                      ? inviteExceptionsDraft
                      : inviteExceptionDate
                        ? [
                            {
                              date: inviteExceptionDate,
                              startTime: inviteExceptionStart,
                              endTime: inviteExceptionEnd,
                              allDay: inviteExceptionAllDay,
                              isAvailable: inviteExceptionAvailable,
                              note: inviteExceptionNote,
                            },
                          ]
                        : [];

                  for (const ex of resolvedExceptions) {
                    if (!ex.date) {
                      throw new Error("Ingresa una fecha para la excepcion.");
                    }
                    if (!ex.allDay && ex.startTime >= ex.endTime) {
                      throw new Error("La hora de inicio debe ser menor a la de fin en la excepcion.");
                    }
                  }

                  if (resolvedRules.length > 0) {
                    const rulePayload = resolvedRules.flatMap((rule) =>
                      rule.weekdays.map((day) => ({
                        tenant_id: activeTenantId,
                        professional_user_id: newUserId,
                        service_id: null,
                        weekday: day,
                        start_time: rule.startTime,
                        end_time: rule.endTime,
                        timezone: "America/Santiago",
                      })),
                    );
                    const { error: ruleError } = await (supabase
                      .from("availability_rules") as any)
                      .insert(rulePayload);
                    if (ruleError) throw ruleError;
                  }

                  if (resolvedExceptions.length > 0) {
                    const exceptionPayload = resolvedExceptions.map((ex) => ({
                      tenant_id: activeTenantId,
                      professional_user_id: newUserId,
                      service_id: null,
                      date: ex.date,
                      is_available: ex.isAvailable,
                      note: ex.note || null,
                      start_time: ex.allDay ? null : ex.startTime,
                      end_time: ex.allDay ? null : ex.endTime,
                    }));
                    const { error: exceptionError } = await (supabase
                      .from("availability_exceptions") as any)
                      .insert(exceptionPayload);
                    if (exceptionError) throw exceptionError;
                  }
                  await loadMembers();
                  setInviteName("");
                  setInviteEmail("");
                  setInviteSpecialty("");
                  setInvitePassword("");
                  setInviteRole("staff");
                  setInviteTab("details");
                  setInviteRulesDraft([]);
                  setInviteExceptionsDraft([]);
                  router.replace("/agenda/users");
                } catch (inviteError) {
                  setError(inviteError instanceof Error ? inviteError.message : "Error creando usuario");
                }
              }}
            >
              {inviteTab === "details" ? (
                <>
                  <label className="text-sm">
                    Nombre
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={inviteName}
                      onChange={(event) => setInviteName(event.target.value)}
                      required
                    />
                  </label>
                  <label className="text-sm">
                    Especialidad
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={inviteSpecialty}
                      onChange={(event) => setInviteSpecialty(event.target.value)}
                    />
                  </label>
                  <label className="text-sm">
                    Email
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="nombre@correo.com"
                      required
                    />
                  </label>
                  <label className="text-sm">
                    Contraseña
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      type="password"
                      value={invitePassword}
                      onChange={(event) => setInvitePassword(event.target.value)}
                      required
                    />
                  </label>
                  <label className="text-sm">
                    Rol
                    <select
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={inviteRole}
                      onChange={(event) => setInviteRole(event.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="professional">Professional</option>
                      <option value="staff">Usuario</option>
                    </select>
                  </label>
                </>
              ) : (
                <div className="grid gap-4 md:col-span-2">
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                    <AvailabilityRuleEditor
                      title="Disponibilidad"
                      weekdays={inviteRuleWeekdays}
                      setWeekdays={setInviteRuleWeekdays}
                      startTime={inviteRuleStartTime}
                      endTime={inviteRuleEndTime}
                      onStartTimeChange={setInviteRuleStartTime}
                      onEndTimeChange={setInviteRuleEndTime}
                      onAddRule={() => {
                        setError(null);
                        if (inviteRuleWeekdays.length === 0) {
                          setError("Selecciona al menos un dia.");
                          return;
                        }
                        if (inviteRuleStartTime >= inviteRuleEndTime) {
                          setError("La hora de inicio debe ser menor a la de fin.");
                          return;
                        }
                        setInviteRulesDraft((current) => [
                          ...current,
                          {
                            weekdays: [...inviteRuleWeekdays],
                            startTime: inviteRuleStartTime,
                            endTime: inviteRuleEndTime,
                          },
                        ]);
                      }}
                      rules={inviteRulesDraft}
                      onRemoveRule={(index) =>
                        setInviteRulesDraft((current) => current.filter((_, idx) => idx !== index))
                      }
                    />
                  </div>
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Excepciones</h3>
                      <button
                        className="rounded-full border border-[var(--panel-border)] px-3 py-1 text-xs"
                        type="button"
                        onClick={() => {
                          setError(null);
                          if (!inviteExceptionDate) {
                            setError("Ingresa una fecha para la excepcion.");
                            return;
                          }
                          if (!inviteExceptionAllDay && inviteExceptionStart >= inviteExceptionEnd) {
                            setError("La hora de inicio debe ser menor a la de fin en la excepcion.");
                            return;
                          }
                          setInviteExceptionsDraft((current) => [
                            ...current,
                            {
                              date: inviteExceptionDate,
                              startTime: inviteExceptionStart,
                              endTime: inviteExceptionEnd,
                              allDay: inviteExceptionAllDay,
                              isAvailable: inviteExceptionAvailable,
                              note: inviteExceptionNote,
                            },
                          ]);
                          setInviteExceptionDate("");
                          setInviteExceptionStart("09:00");
                          setInviteExceptionEnd("12:00");
                          setInviteExceptionAvailable(false);
                          setInviteExceptionAllDay(true);
                          setInviteExceptionNote("");
                        }}
                      >
                        Agregar
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="text-sm md:col-span-2">
                        Fecha
                        <input
                          className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                          type="date"
                          value={inviteExceptionDate}
                          onChange={(event) => setInviteExceptionDate(event.target.value)}
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm md:col-span-2">
                        <input
                          type="checkbox"
                          checked={inviteExceptionAvailable}
                          onChange={(event) => setInviteExceptionAvailable(event.target.checked)}
                        />
                        Disponible extra
                      </label>
                      <label className="flex items-center gap-2 text-sm md:col-span-2">
                        <input
                          type="checkbox"
                          checked={inviteExceptionAllDay}
                          onChange={(event) => setInviteExceptionAllDay(event.target.checked)}
                        />
                        Todo el dia
                      </label>
                      {!inviteExceptionAllDay ? (
                        <>
                          <label className="text-sm">
                            Inicio
                            <input
                              className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                              type="time"
                              value={inviteExceptionStart}
                              onChange={(event) => setInviteExceptionStart(event.target.value)}
                              required
                            />
                          </label>
                          <label className="text-sm">
                            Fin
                            <input
                              className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                              type="time"
                              value={inviteExceptionEnd}
                              onChange={(event) => setInviteExceptionEnd(event.target.value)}
                              required
                            />
                          </label>
                        </>
                      ) : null}
                      <label className="text-sm md:col-span-2">
                        Nota
                        <input
                          className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                          value={inviteExceptionNote}
                          onChange={(event) => setInviteExceptionNote(event.target.value)}
                          placeholder="Feriado, vacaciones, etc."
                        />
                      </label>
                    </div>
                    {inviteExceptionsDraft.length > 0 ? (
                      <div className="mt-4 space-y-2 text-sm">
                        {inviteExceptionsDraft.map((ex, index) => (
                          <div
                            key={`${ex.date}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--panel-border)] px-3 py-2"
                          >
                            <div className="flex flex-col text-xs text-[var(--panel-muted)]">
                              <span>{ex.date}</span>
                              <span>{ex.allDay ? "Todo el dia" : `${ex.startTime} - ${ex.endTime}`}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span>{ex.isAvailable ? "Disponible" : "Bloqueado"}</span>
                              {ex.note ? <span className="text-[var(--panel-muted)]">{ex.note}</span> : null}
                            </div>
                            <button
                              className="text-xs text-[var(--panel-muted)]"
                              type="button"
                              onClick={() =>
                                setInviteExceptionsDraft((current) => current.filter((_, idx) => idx !== index))
                              }
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
              {error ? <p className="text-sm text-red-400 md:col-span-2">{error}</p> : null}
              <div className="flex justify-end gap-2 md:col-span-2">
                <button
                  className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm"
                  type="button"
                  onClick={() => router.replace("/agenda/users")}
                >
                  Cancelar
                </button>
                <button
                  className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
                  type="submit"
                >
                  Crear usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
