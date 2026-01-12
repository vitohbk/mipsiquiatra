"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { callEdgeFunction } from "@/lib/api/edge";
import { useActiveTenant } from "@/lib/tenant/useActiveTenant";
import AvailabilityRuleEditor, { type AvailabilityRuleDraft } from "../../_components/availability-rule-editor";

type Membership = {
  tenant_id: string;
  user_id: string;
  role: string;
  secondary_role?: string | null;
  tenants?: { name: string; slug: string } | null;
  profiles?: { full_name: string | null; email: string | null; avatar_url?: string | null } | null;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  max_advance_hours: number;
  modality: string;
  slug: string | null;
  duration_minutes: number;
  price_clp: number;
  payment_mode: string;
  is_active: boolean;
  requires_payment: boolean;
  professional_user_id: string;
};

type BookingLink = {
  id: string;
  slug: string;
  public_token: string;
  service_id: string;
};

const slugPattern = /^[a-z0-9-]+$/;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ServicesPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeTenantId, setActiveTenantId } = useActiveTenant();
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");

  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceMaxAdvanceHours, setServiceMaxAdvanceHours] = useState("72");
  const [serviceModality, setServiceModality] = useState("zoom");
  const [serviceSlug, setServiceSlug] = useState("");
  const [serviceSlugDirty, setServiceSlugDirty] = useState(false);
  const [serviceDuration, setServiceDuration] = useState("60");
  const [servicePrice, setServicePrice] = useState("30000");
  const [serviceRequiresPayment, setServiceRequiresPayment] = useState(true);
  const [serviceProfessionalId, setServiceProfessionalId] = useState("");
  const [createTab, setCreateTab] = useState<"details" | "availability">("details");
  const [ruleWeekdays, setRuleWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [ruleStartTime, setRuleStartTime] = useState("09:00");
  const [ruleEndTime, setRuleEndTime] = useState("18:00");
  const [rulesDraft, setRulesDraft] = useState<AvailabilityRuleDraft[]>([]);
  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionStart, setExceptionStart] = useState("09:00");
  const [exceptionEnd, setExceptionEnd] = useState("12:00");
  const [exceptionAvailable, setExceptionAvailable] = useState(false);
  const [exceptionAllDay, setExceptionAllDay] = useState(true);
  const [exceptionNote, setExceptionNote] = useState("");
  const [exceptionsDraft, setExceptionsDraft] = useState<
    { date: string; startTime: string; endTime: string; allDay: boolean; isAvailable: boolean; note: string }[]
  >([]);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMaxAdvanceHours, setEditMaxAdvanceHours] = useState("72");
  const [editModality, setEditModality] = useState("zoom");
  const [editSlug, setEditSlug] = useState("");
  const [editDuration, setEditDuration] = useState("60");
  const [editPrice, setEditPrice] = useState("30000");
  const [editRequiresPayment, setEditRequiresPayment] = useState(true);
  const [editProfessionalId, setEditProfessionalId] = useState("");
  const [editRuleWeekdays, setEditRuleWeekdays] = useState<number[]>([]);
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
  const [editTab, setEditTab] = useState<"details" | "availability">("details");

  const professionalLabel = (userId: string) => {
    const match = memberships.find((member) => member.user_id === userId);
    return match?.profiles?.full_name ?? match?.profiles?.email ?? userId;
  };

  const professionalAvatar = (userId: string) => {
    const match = memberships.find((member) => member.user_id === userId);
    return match?.profiles?.avatar_url ?? null;
  };

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;
      setSessionUserId(user.id);

      const { data: membershipData } = await supabase
        .from("memberships")
        .select("tenant_id, user_id, role, secondary_role, tenants(name, slug)");

      const normalized = (membershipData ?? []) as Membership[];
      const userIds = normalized.map((member) => member.user_id);
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(
          ((profileData ?? []) as Array<{
            user_id: string;
            full_name?: string | null;
            email?: string | null;
            avatar_url?: string | null;
          }>).map((profile) => [profile.user_id, profile]),
        );

        normalized.forEach((member) => {
          const profile = profileMap.get(member.user_id);
          member.profiles = profile
            ? {
                full_name: profile.full_name ?? null,
                email: profile.email ?? null,
                avatar_url: profile.avatar_url ?? null,
              }
            : null;
        });
      }

      setMemberships(normalized);

      if (!activeTenantId && normalized.length > 0) {
        setActiveTenantId(normalized[0].tenant_id);
      }
      if (!serviceProfessionalId && normalized.length > 0) {
        const firstProfessional = normalized.find(
          (member) =>
            member.role === "professional" ||
            (member.secondary_role && member.secondary_role === "professional"),
        );
        if (firstProfessional) {
          setServiceProfessionalId(firstProfessional.user_id ?? "");
        }
      }
      setLoading(false);
    };

    load();
  }, [supabase, activeTenantId, setActiveTenantId]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateTab("details");
      setRulesDraft([]);
      setExceptionsDraft([]);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadServices = async () => {
      if (!activeTenantId) {
        setServices([]);
        return;
      }
      const { data } = await supabase
        .from("services")
        .select(
          "id, name, description, max_advance_hours, modality, slug, duration_minutes, price_clp, payment_mode, is_active, requires_payment, professional_user_id",
        )
        .eq("tenant_id", activeTenantId as string)
        .order("created_at", { ascending: false });

      setServices((data ?? []) as Service[]);

    };

    loadServices();
  }, [supabase, activeTenantId]);

  useEffect(() => {
    if (!serviceSlugDirty) {
      setServiceSlug(slugify(serviceName));
    }
  }, [serviceName, serviceSlugDirty]);

  const handleCreateTenant = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setFormError("No hay sesion activa.");
      return;
    }

    if (!slugPattern.test(tenantSlug)) {
      setFormError("Slug invalido. Usa minusculas, numeros y guiones.");
      return;
    }

    try {
      const payload = await callEdgeFunction<{ tenant_id: string }>(
        "create_tenant",
        { name: tenantName, slug: tenantSlug },
        accessToken,
      );
      setActiveTenantId(payload.tenant_id);
      setTenantName("");
      setTenantSlug("");

      const { data: membershipData } = await supabase
        .from("memberships")
        .select("tenant_id, user_id, role, tenants(name, slug)");
      const normalized = (membershipData ?? []) as Membership[];
      const userIds = normalized.map((member) => member.user_id);
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(
          ((profileData ?? []) as Array<{
            user_id: string;
            full_name?: string | null;
            email?: string | null;
            avatar_url?: string | null;
          }>).map((profile) => [profile.user_id, profile]),
        );

        normalized.forEach((member) => {
          const profile = profileMap.get(member.user_id);
          member.profiles = profile
            ? {
                full_name: profile.full_name ?? null,
                email: profile.email ?? null,
                avatar_url: profile.avatar_url ?? null,
              }
            : null;
        });
      }
      setMemberships(normalized);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Error creando tenant");
    }
  };

  const handleCreateService = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!activeTenantId || !sessionUserId) {
      setFormError("Selecciona un tenant primero.");
      return;
    }

    if (!serviceProfessionalId) {
      setFormError("Selecciona un profesional.");
      return;
    }

    const duration = Number(serviceDuration);
    const price = Number(servicePrice);
    const maxAdvanceHours = Number(serviceMaxAdvanceHours);

    if (!serviceName || Number.isNaN(duration) || Number.isNaN(price) || Number.isNaN(maxAdvanceHours)) {
      setFormError("Completa los campos del servicio.");
      return;
    }

    if (duration <= 0 || price < 0 || maxAdvanceHours <= 0) {
      setFormError("Duracion y precio deben ser validos.");
      return;
    }

    const resolvedRules =
      rulesDraft.length > 0
        ? rulesDraft
        : ruleWeekdays.length > 0
          ? [{ weekdays: ruleWeekdays, startTime: ruleStartTime, endTime: ruleEndTime }]
          : [];

    for (const rule of resolvedRules) {
      if (rule.weekdays.length === 0) {
        setFormError("Selecciona al menos un dia.");
        return;
      }
      if (rule.startTime >= rule.endTime) {
        setFormError("La hora de inicio debe ser menor a la de fin.");
        return;
      }
    }

    const resolvedExceptions =
      exceptionsDraft.length > 0
        ? exceptionsDraft
        : exceptionDate
          ? [
              {
                date: exceptionDate,
                startTime: exceptionStart,
                endTime: exceptionEnd,
                allDay: exceptionAllDay,
                isAvailable: exceptionAvailable,
                note: exceptionNote,
              },
            ]
          : [];

    for (const ex of resolvedExceptions) {
      if (!ex.date) {
        setFormError("Ingresa una fecha para la excepcion.");
        return;
      }
      if (!ex.allDay && ex.startTime >= ex.endTime) {
        setFormError("La hora de inicio debe ser menor a la de fin en la excepcion.");
        return;
      }
    }

    if (!serviceSlug || !slugPattern.test(serviceSlug)) {
      setFormError("Slug invalido. Usa minusculas, numeros y guiones.");
      return;
    }

    const { data: serviceInsert, error } = await (supabase
      .from("services") as any)
      .insert({
        tenant_id: activeTenantId,
        professional_user_id: serviceProfessionalId,
        name: serviceName,
        description: serviceDescription || null,
        max_advance_hours: maxAdvanceHours,
        modality: serviceModality,
        slug: serviceSlug,
        duration_minutes: duration,
        price_clp: price,
        payment_mode: "full",
        requires_payment: serviceRequiresPayment,
      })
      .select("id")
      .single();

    if (error || !serviceInsert) {
      setFormError(error?.message ?? "Error creando servicio");
      return;
    }

    if (resolvedRules.length > 0) {
      const rulePayload = resolvedRules.flatMap((rule) =>
        rule.weekdays.map((day) => ({
          tenant_id: activeTenantId,
          service_id: serviceInsert.id,
          professional_user_id: serviceProfessionalId,
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
        setFormError(`Servicio creado, pero reglas fallaron: ${ruleError.message}`);
      }
    }

    if (resolvedExceptions.length > 0) {
      const exceptionPayload = resolvedExceptions.map((ex) => ({
        tenant_id: activeTenantId,
        service_id: serviceInsert.id,
        professional_user_id: serviceProfessionalId,
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
        setFormError(`Servicio creado, pero excepcion falló: ${exceptionError.message}`);
      }
    }

    const { error: linkError } = await (supabase.from("public_booking_links") as any).insert({
      tenant_id: activeTenantId,
      service_id: serviceInsert.id,
      professional_user_id: serviceProfessionalId,
      slug: serviceSlug,
      public_token: crypto.randomUUID(),
      is_active: true,
    });

    if (linkError) {
      setFormError(`Servicio creado, pero link falló: ${linkError.message}`);
    }

    setServiceName("");
    setServiceDescription("");
    setServiceMaxAdvanceHours("72");
    setServiceModality("zoom");
    setServiceSlug("");
    setServiceSlugDirty(false);
    setServiceDuration("60");
    setServicePrice("30000");
    setServiceRequiresPayment(true);
    setServiceProfessionalId(serviceProfessionalId);
    setRulesDraft([]);
    setExceptionsDraft([]);
    setRuleWeekdays([1, 2, 3, 4, 5]);
    setRuleStartTime("09:00");
    setRuleEndTime("18:00");
    setExceptionDate("");
    setExceptionStart("09:00");
    setExceptionEnd("12:00");
    setExceptionAvailable(false);
    setExceptionAllDay(true);
    setExceptionNote("");

    const { data } = await supabase
      .from("services")
      .select(
        "id, name, description, max_advance_hours, modality, slug, duration_minutes, price_clp, payment_mode, is_active, requires_payment, professional_user_id",
      )
      .eq("tenant_id", activeTenantId as string)
      .order("created_at", { ascending: false });
    setServices((data ?? []) as Service[]);
    router.replace("/dashboard/services");
  };

  const handleEditService = async (service: Service) => {
    setEditingServiceId(service.id);
    setEditTab("details");
    setEditName(service.name);
    setEditDescription(service.description ?? "");
    setEditMaxAdvanceHours(String(service.max_advance_hours));
    setEditModality(service.modality);
    setEditSlug(service.slug ?? "");
    setEditDuration(String(service.duration_minutes));
    setEditPrice(String(service.price_clp));
    setEditRequiresPayment(service.requires_payment);
    setEditProfessionalId(service.professional_user_id);
    setEditAvailabilityLoading(true);
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

    if (!activeTenantId) {
      setEditAvailabilityLoading(false);
      return;
    }

    try {
      const [rulesResult, exceptionsResult] = await Promise.all([
        supabase
          .from("availability_rules")
          .select("weekday, start_time, end_time")
          .eq("tenant_id", activeTenantId)
          .eq("service_id", service.id)
          .eq("professional_user_id", service.professional_user_id)
          .eq("is_active", true)
          .order("weekday", { ascending: true }),
        supabase
          .from("availability_exceptions")
          .select("date, start_time, end_time, is_available, note")
          .eq("tenant_id", activeTenantId)
          .eq("service_id", service.id)
          .eq("professional_user_id", service.professional_user_id)
          .order("date", { ascending: true })
          .limit(1),
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

      const ex = (exceptionsResult.data ?? [])[
        0
      ] as { date: string; start_time: string | null; end_time: string | null; is_available: boolean; note: string | null } | undefined;
      if (ex) {
        setEditExceptionDate(ex.date);
        setEditExceptionAvailable(ex.is_available);
        setEditExceptionNote(ex.note ?? "");
        if (ex.start_time && ex.end_time) {
          setEditExceptionAllDay(false);
          setEditExceptionStart(ex.start_time);
          setEditExceptionEnd(ex.end_time);
        } else {
          setEditExceptionAllDay(true);
          setEditExceptionStart("09:00");
          setEditExceptionEnd("12:00");
        }
        setEditExceptionsDraft([
          {
            date: ex.date,
            startTime: ex.start_time ?? "09:00",
            endTime: ex.end_time ?? "12:00",
            allDay: !ex.start_time || !ex.end_time,
            isAvailable: ex.is_available,
            note: ex.note ?? "",
          },
        ]);
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
      setFormError(loadError instanceof Error ? loadError.message : "Error cargando disponibilidad");
    } finally {
      setEditAvailabilityLoading(false);
    }
  };

  const handleUpdateService = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!editingServiceId) return;

    const resolvedRules = editRulesDraft;

    for (const rule of resolvedRules) {
      if (rule.weekdays.length === 0) {
        setFormError("Selecciona al menos un dia.");
        return;
      }
      if (rule.startTime >= rule.endTime) {
        setFormError("La hora de inicio debe ser menor a la de fin.");
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
        setFormError("Ingresa una fecha para la excepcion.");
        return;
      }
      if (!ex.allDay && ex.startTime >= ex.endTime) {
        setFormError("La hora de inicio debe ser menor a la de fin en la excepcion.");
        return;
      }
    }

    const duration = Number(editDuration);
    const price = Number(editPrice);
    const maxAdvanceHours = Number(editMaxAdvanceHours);

    if (!editName || Number.isNaN(duration) || Number.isNaN(price) || Number.isNaN(maxAdvanceHours)) {
      setFormError("Completa los campos del servicio.");
      return;
    }

    if (duration <= 0 || price < 0 || maxAdvanceHours <= 0) {
      setFormError("Duracion y precio deben ser validos.");
      return;
    }

    if (!editSlug || !slugPattern.test(editSlug)) {
      setFormError("Slug invalido. Usa minusculas, numeros y guiones.");
      return;
    }

    const { error } = await (supabase
      .from("services") as any)
      .update({
        name: editName,
        description: editDescription || null,
        max_advance_hours: maxAdvanceHours,
        modality: editModality,
        slug: editSlug,
        duration_minutes: duration,
        price_clp: price,
        requires_payment: editRequiresPayment,
        professional_user_id: editProfessionalId,
      })
      .eq("id", editingServiceId);

    if (error) {
      setFormError(error.message);
      return;
    }

    if (activeTenantId) {
      const { error: deleteRulesError } = await supabase
        .from("availability_rules")
        .delete()
        .eq("tenant_id", activeTenantId)
        .eq("service_id", editingServiceId);
      if (deleteRulesError) {
        setFormError(deleteRulesError.message);
        return;
      }

      if (resolvedRules.length > 0) {
        const rulePayload = resolvedRules.flatMap((rule) =>
          rule.weekdays.map((day) => ({
            tenant_id: activeTenantId,
            service_id: editingServiceId,
            professional_user_id: editProfessionalId,
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
          setFormError(ruleError.message);
          return;
        }
      }

      const { error: deleteExceptionsError } = await supabase
        .from("availability_exceptions")
        .delete()
        .eq("tenant_id", activeTenantId)
        .eq("service_id", editingServiceId);
      if (deleteExceptionsError) {
        setFormError(deleteExceptionsError.message);
        return;
      }

      if (resolvedExceptions.length > 0) {
        const exceptionPayload = resolvedExceptions.map((ex) => ({
          tenant_id: activeTenantId,
          service_id: editingServiceId,
          professional_user_id: editProfessionalId,
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
          setFormError(exceptionError.message);
          return;
        }
      }
    }

    setEditingServiceId(null);
    setEditName("");
    setEditDescription("");
    setEditMaxAdvanceHours("72");
    setEditModality("zoom");
    setEditSlug("");
    setEditDuration("60");
    setEditPrice("30000");
    setEditRequiresPayment(true);
    setEditProfessionalId("");
    setEditRulesDraft([]);
    setEditExceptionsDraft([]);
    setEditRuleWeekdays([]);
    setEditRuleStartTime("09:00");
    setEditRuleEndTime("18:00");
    setEditExceptionDate("");
    setEditExceptionStart("09:00");
    setEditExceptionEnd("12:00");
    setEditExceptionAvailable(false);
    setEditExceptionAllDay(true);
    setEditExceptionNote("");

    const { data } = await supabase
      .from("services")
      .select(
        "id, name, description, max_advance_hours, modality, slug, duration_minutes, price_clp, payment_mode, is_active, requires_payment, professional_user_id",
      )
      .eq("tenant_id", activeTenantId as string)
      .order("created_at", { ascending: false });
    setServices((data ?? []) as Service[]);
  };

  const handleDeleteService = async (serviceId: string) => {
    setFormError(null);
    if (!window.confirm("Eliminar este servicio?")) return;

    const { error } = await supabase.from("services").delete().eq("id", serviceId);
    if (error) {
      setFormError(error.message);
      return;
    }

    const { data } = await supabase
      .from("services")
      .select(
        "id, name, description, max_advance_hours, modality, slug, duration_minutes, price_clp, payment_mode, is_active, requires_payment, professional_user_id",
      )
      .eq("tenant_id", activeTenantId as string)
      .order("created_at", { ascending: false });
    setServices((data ?? []) as Service[]);
  };


  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold md:text-2xl">Servicios</h1>
        <p className="text-sm text-[var(--panel-muted)]">Gestiona catalogo, duraciones y precios.</p>
      </div>

      {loading ? <p className="text-sm text-[var(--panel-muted)]">Cargando...</p> : null}

      {!loading && memberships.length === 0 ? (
        <form
          className="space-y-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6"
          onSubmit={handleCreateTenant}
        >
          <h2 className="text-lg font-semibold">Crea tu primer tenant</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Nombre
              <input
                className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                value={tenantName}
                onChange={(event) => setTenantName(event.target.value)}
                required
              />
            </label>
            <label className="text-sm">
              Slug
              <input
                className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                value={tenantSlug}
                onChange={(event) => setTenantSlug(event.target.value.trim())}
                placeholder="mi-consulta"
                required
              />
            </label>
          </div>
          {formError ? <p className="text-sm text-red-400">{formError}</p> : null}
          <button
            className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
            type="submit"
          >
            Crear tenant
          </button>
        </form>
      ) : null}

      {memberships.length > 0 ? (
        <div className="space-y-3">
            {services.length === 0 ? (
              <p className="text-sm text-[var(--panel-muted)]">Sin servicios aun.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {services.map((service) => (
                  <div
                    key={service.id}
                    role="button"
                    tabIndex={0}
                    className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 text-left transition hover:border-[var(--page-text)]"
                    onClick={() => handleEditService(service)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleEditService(service);
                      }
                    }}
                  >
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold">{service.name}</h3>
                        {service.slug ? (
                          <a
                            className="rounded-full border border-[var(--panel-border)] p-1 text-[var(--panel-muted)] hover:text-[var(--page-text)]"
                            href={`/${service.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Abrir pagina de reserva"
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M9.71069 18.2929C10.1012 18.6834 10.7344 18.6834 11.1249 18.2929l4.8874-4.8923C16.7927 12.6195 16.7924 11.3537 16.0117 10.5729L11.1213 5.68254C10.7308 5.29202 10.0976 5.29202 9.70708 5.68254c-.39053.39053-.39053 1.02369.0 1.41422L13.8927 11.2824C14.2833 11.6729 14.2833 12.3061 13.8927 12.6966L9.71069 16.8787c-.39053.3905-.39053 1.0236.0 1.4142z"
                                fill="currentColor"
                              />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-xs text-[var(--panel-muted)]">{service.payment_mode}</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="badge rounded-full px-2 py-1">
                          {service.duration_minutes} min
                        </span>
                        <span className="badge rounded-full px-2 py-1">
                          ${service.price_clp.toLocaleString("es-CL")}
                        </span>
                        <span className="badge rounded-full px-2 py-1">
                          {service.requires_payment ? "Pago online" : "Pago manual"}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-[var(--panel-muted)]">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--panel-border)] bg-[var(--panel-soft)]">
                            {professionalAvatar(service.professional_user_id) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={professionalAvatar(service.professional_user_id) ?? ""}
                                alt={professionalLabel(service.professional_user_id)}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </span>
                          <span>{professionalLabel(service.professional_user_id)}</span>
                        </div>
                        <button
                          className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-soft)] p-2 text-[var(--panel-muted)] hover:text-[var(--page-text)]"
                          type="button"
                          aria-label="Eliminar servicio"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteService(service.id);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M9 3h6l1 2h4a1 1 0 1 1 0 2h-1l-1 12a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3L4 7H3a1 1 0 1 1 0-2h4l1-2zm1.25 6.5a1 1 0 1 1 2 0v7a1 1 0 1 1-2 0v-7zm3.5 0a1 1 0 1 1 2 0v7a1 1 0 1 1-2 0v-7z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      </div>
                    </>
                  </div>
                ))}
              </div>
            )}
          </div>
      ) : null}
      {editingServiceId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setEditingServiceId(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editar servicio</h2>
              <button
                className="text-sm text-[var(--panel-muted)]"
                type="button"
                onClick={() => setEditingServiceId(null)}
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
            <form className="mt-4 grid gap-4 md:grid-cols-4" onSubmit={handleUpdateService}>
              {editTab === "details" ? (
                <>
                  <label className="text-sm md:col-span-2">
                    Profesional
                    <select
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={editProfessionalId}
                      onChange={(event) => setEditProfessionalId(event.target.value)}
                      required
                    >
                      <option value="">Selecciona</option>
                        {memberships
                          .filter(
                            (member) =>
                              member.role === "professional" ||
                              (member.secondary_role && member.secondary_role === "professional"),
                          )
                          .map((member) => (
                            <option key={member.user_id} value={member.user_id}>
                              {member.profiles?.full_name ?? member.profiles?.email ?? member.user_id}
                            </option>
                          ))}
                    </select>
                  </label>
                  <label className="text-sm md:col-span-2">
                    Nombre del servicio
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      required
                    />
                  </label>
                  <label className="text-sm md:col-span-2">
                    Slug
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={editSlug}
                      onChange={(event) => setEditSlug(event.target.value.trim())}
                      required
                    />
                  </label>
                  <label className="text-sm md:col-span-2">
                    Modalidad
                    <select
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={editModality}
                      onChange={(event) => setEditModality(event.target.value)}
                    >
                      <option value="zoom">Zoom</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </label>
                  <label className="text-sm md:col-span-2">
                    Descripcion
                    <textarea
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      rows={3}
                    />
                  </label>
                  <label className="text-sm">
                    Antelacion minima (horas)
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      type="number"
                      min={1}
                      value={editMaxAdvanceHours}
                      onChange={(event) => setEditMaxAdvanceHours(event.target.value)}
                      required
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm md:col-span-2">
                    <input
                      type="checkbox"
                      checked={editRequiresPayment}
                      onChange={(event) => setEditRequiresPayment(event.target.checked)}
                    />
                    Cobrar al reservar (pago online)
                  </label>
                  <label className="text-sm">
                    Duracion (min)
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      type="number"
                      min={5}
                      value={editDuration}
                      onChange={(event) => setEditDuration(event.target.value)}
                      required
                    />
                  </label>
                  <label className="text-sm">
                    Precio CLP
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      inputMode="numeric"
                      value={new Intl.NumberFormat("es-CL").format(Number(editPrice || 0))}
                      onChange={(event) => setEditPrice(formatPriceInput(event.target.value))}
                      required
                    />
                  </label>
                </>
              ) : (
                <div className="grid gap-4 md:col-span-4">
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
                        setFormError(null);
                        if (editRuleWeekdays.length === 0) {
                          setFormError("Selecciona al menos un dia.");
                          return;
                        }
                        if (editRuleStartTime >= editRuleEndTime) {
                          setFormError("La hora de inicio debe ser menor a la de fin.");
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
                          setFormError(null);
                          if (!editExceptionDate) {
                            setFormError("Ingresa una fecha para la excepcion.");
                            return;
                          }
                          if (!editExceptionAllDay && editExceptionStart >= editExceptionEnd) {
                            setFormError("La hora de inicio debe ser menor a la de fin en la excepcion.");
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
                                  <span>
                                    {ex.allDay ? "Todo el dia" : `${ex.startTime} - ${ex.endTime}`}
                                  </span>
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
              {formError ? <p className="text-sm text-red-400 md:col-span-4">{formError}</p> : null}
              <div className="flex justify-end gap-2 md:col-span-4">
                <button
                  className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm"
                  type="button"
                  onClick={() => setEditingServiceId(null)}
                >
                  Cancelar
                </button>
                <button
                  className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
                  type="submit"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {searchParams.get("create") === "1" ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => router.replace("/dashboard/services")}
          role="presentation"
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nuevo servicio</h2>
              <button
                className="text-sm text-[var(--panel-muted)]"
                type="button"
                onClick={() => router.replace("/dashboard/services")}
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <button
                className={`rounded-full border px-3 py-1 ${
                  createTab === "details"
                    ? "border-[var(--page-text)] bg-[var(--page-text)] text-[var(--page-bg)]"
                    : "border-[var(--panel-border)] text-[var(--page-text)]"
                }`}
                type="button"
                onClick={() => setCreateTab("details")}
              >
                Detalles
              </button>
              <button
                className={`rounded-full border px-3 py-1 ${
                  createTab === "availability"
                    ? "border-[var(--page-text)] bg-[var(--page-text)] text-[var(--page-bg)]"
                    : "border-[var(--panel-border)] text-[var(--page-text)]"
                }`}
                type="button"
                onClick={() => setCreateTab("availability")}
              >
                Disponibilidad
              </button>
            </div>
            <form className="mt-4 grid gap-4 md:grid-cols-4" onSubmit={handleCreateService}>
              {createTab === "details" ? (
                <>
                  <label className="text-sm md:col-span-2">
                    Profesional
                    <select
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={serviceProfessionalId}
                      onChange={(event) => setServiceProfessionalId(event.target.value)}
                      required
                    >
                      <option value="">Selecciona</option>
                        {memberships
                          .filter(
                            (member) =>
                              member.role === "professional" ||
                              (member.secondary_role && member.secondary_role === "professional"),
                          )
                          .map((member) => (
                            <option key={member.user_id} value={member.user_id}>
                              {member.profiles?.full_name ?? member.profiles?.email ?? member.user_id}
                            </option>
                          ))}
                    </select>
                  </label>
                  <label className="text-sm md:col-span-2">
                    Nombre del servicio
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={serviceName}
                      onChange={(event) => setServiceName(event.target.value)}
                      required
                    />
                  </label>
                  <label className="text-sm md:col-span-2">
                    Slug
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={serviceSlug}
                      onChange={(event) => {
                        setServiceSlug(event.target.value.trim());
                        setServiceSlugDirty(true);
                      }}
                      placeholder="consulta-psiquiatria"
                      required
                    />
                  </label>
                  <label className="text-sm md:col-span-2">
                    Modalidad
                    <select
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={serviceModality}
                      onChange={(event) => setServiceModality(event.target.value)}
                    >
                      <option value="zoom">Zoom</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </label>
                  <label className="text-sm md:col-span-2">
                    Descripcion
                    <textarea
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      value={serviceDescription}
                      onChange={(event) => setServiceDescription(event.target.value)}
                      rows={3}
                    />
                  </label>
                  <label className="text-sm">
                    Antelacion minima (horas)
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      type="number"
                      min={1}
                      value={serviceMaxAdvanceHours}
                      onChange={(event) => setServiceMaxAdvanceHours(event.target.value)}
                      required
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm md:col-span-2">
                    <input
                      type="checkbox"
                      checked={serviceRequiresPayment}
                      onChange={(event) => setServiceRequiresPayment(event.target.checked)}
                    />
                    Cobrar al reservar (pago online)
                  </label>
                  <label className="text-sm">
                    Duracion (min)
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      type="number"
                      min={5}
                      value={serviceDuration}
                      onChange={(event) => setServiceDuration(event.target.value)}
                      required
                    />
                  </label>
                  <label className="text-sm">
                    Precio CLP
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                      inputMode="numeric"
                      value={new Intl.NumberFormat("es-CL").format(Number(servicePrice || 0))}
                      onChange={(event) => setServicePrice(formatPriceInput(event.target.value))}
                      required
                    />
                  </label>
                </>
              ) : (
                <div className="grid gap-4 md:col-span-4">
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                    <AvailabilityRuleEditor
                      title="Disponibilidad"
                      weekdays={ruleWeekdays}
                      setWeekdays={setRuleWeekdays}
                      startTime={ruleStartTime}
                      endTime={ruleEndTime}
                      onStartTimeChange={setRuleStartTime}
                      onEndTimeChange={setRuleEndTime}
                      onAddRule={() => {
                        setFormError(null);
                        if (ruleWeekdays.length === 0) {
                          setFormError("Selecciona al menos un dia.");
                          return;
                        }
                        if (ruleStartTime >= ruleEndTime) {
                          setFormError("La hora de inicio debe ser menor a la de fin.");
                          return;
                        }
                        setRulesDraft((current) => [
                          ...current,
                          { weekdays: [...ruleWeekdays], startTime: ruleStartTime, endTime: ruleEndTime },
                        ]);
                      }}
                      rules={rulesDraft}
                      onRemoveRule={(index) =>
                        setRulesDraft((current) => current.filter((_, idx) => idx !== index))
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
                          setFormError(null);
                          if (!exceptionDate) {
                            setFormError("Ingresa una fecha para la excepcion.");
                            return;
                          }
                          if (!exceptionAllDay && exceptionStart >= exceptionEnd) {
                            setFormError("La hora de inicio debe ser menor a la de fin en la excepcion.");
                            return;
                          }
                          setExceptionsDraft((current) => [
                            ...current,
                            {
                              date: exceptionDate,
                              startTime: exceptionStart,
                              endTime: exceptionEnd,
                              allDay: exceptionAllDay,
                              isAvailable: exceptionAvailable,
                              note: exceptionNote,
                            },
                          ]);
                          setExceptionDate("");
                          setExceptionStart("09:00");
                          setExceptionEnd("12:00");
                          setExceptionAvailable(false);
                          setExceptionAllDay(true);
                          setExceptionNote("");
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
                          value={exceptionDate}
                          onChange={(event) => setExceptionDate(event.target.value)}
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm md:col-span-2">
                        <input
                          type="checkbox"
                          checked={exceptionAvailable}
                          onChange={(event) => setExceptionAvailable(event.target.checked)}
                        />
                        Disponible extra
                      </label>
                      <label className="flex items-center gap-2 text-sm md:col-span-2">
                        <input
                          type="checkbox"
                          checked={exceptionAllDay}
                          onChange={(event) => setExceptionAllDay(event.target.checked)}
                        />
                        Todo el dia
                      </label>
                      {!exceptionAllDay ? (
                        <>
                          <label className="text-sm">
                            Inicio
                            <input
                              className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                              type="time"
                              value={exceptionStart}
                              onChange={(event) => setExceptionStart(event.target.value)}
                              required
                            />
                          </label>
                          <label className="text-sm">
                            Fin
                            <input
                              className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                              type="time"
                              value={exceptionEnd}
                              onChange={(event) => setExceptionEnd(event.target.value)}
                              required
                            />
                          </label>
                        </>
                      ) : null}
                      <label className="text-sm md:col-span-2">
                        Nota
                        <input
                          className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                          value={exceptionNote}
                          onChange={(event) => setExceptionNote(event.target.value)}
                          placeholder="Feriado, vacaciones, etc."
                        />
                      </label>
                    </div>
                    {exceptionsDraft.length > 0 ? (
                      <div className="mt-4 space-y-2 text-sm">
                        {exceptionsDraft.map((ex, index) => (
                          <div
                            key={`${ex.date}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--panel-border)] px-3 py-2"
                          >
                            <div className="flex flex-col text-xs text-[var(--panel-muted)]">
                              <span>{ex.date}</span>
                              <span>
                                {ex.allDay ? "Todo el dia" : `${ex.startTime} - ${ex.endTime}`}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span>{ex.isAvailable ? "Disponible" : "Bloqueado"}</span>
                              {ex.note ? <span className="text-[var(--panel-muted)]">{ex.note}</span> : null}
                            </div>
                            <button
                              className="text-xs text-[var(--panel-muted)]"
                              type="button"
                              onClick={() =>
                                setExceptionsDraft((current) => current.filter((_, idx) => idx !== index))
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
              {formError ? <p className="text-sm text-red-400 md:col-span-4">{formError}</p> : null}
              <div className="flex justify-end gap-2 md:col-span-4">
                <button
                  className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm"
                  type="button"
                  onClick={() => router.replace("/dashboard/services")}
                >
                  Cancelar
                </button>
                <button
                  className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
                  type="submit"
                >
                  Crear servicio
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
  const formatPriceInput = (value: string) => value.replace(/[^\d]/g, "");
