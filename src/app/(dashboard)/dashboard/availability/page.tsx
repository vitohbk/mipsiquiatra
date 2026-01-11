"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useActiveTenant } from "@/lib/tenant/useActiveTenant";
import AvailabilityRuleEditor, { weekdayLabels } from "../../_components/availability-rule-editor";

type AvailabilityRule = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  timezone: string;
};

type AvailabilityException = {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  note: string | null;
};

export default function AvailabilityPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const { activeTenantId } = useActiveTenant();
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionStart, setExceptionStart] = useState("09:00");
  const [exceptionEnd, setExceptionEnd] = useState("12:00");
  const [exceptionAvailable, setExceptionAvailable] = useState(false);
  const [exceptionAllDay, setExceptionAllDay] = useState(true);
  const [exceptionNote, setExceptionNote] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setProfessionalId(data.session?.user.id ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    const load = async () => {
      if (!activeTenantId || !professionalId) return;

      const [rulesResult, exceptionsResult] = await Promise.all([
        supabase
          .from("availability_rules")
          .select("id, weekday, start_time, end_time, timezone")
          .eq("tenant_id", activeTenantId)
          .eq("professional_user_id", professionalId)
          .order("weekday", { ascending: true }),
        supabase
          .from("availability_exceptions")
          .select("id, date, start_time, end_time, is_available, note")
          .eq("tenant_id", activeTenantId)
          .eq("professional_user_id", professionalId)
          .order("date", { ascending: true }),
      ]);

      if (rulesResult.error) {
        setError(rulesResult.error.message);
        return;
      }
      if (exceptionsResult.error) {
        setError(exceptionsResult.error.message);
        return;
      }

      setRules((rulesResult.data ?? []) as AvailabilityRule[]);
      setExceptions((exceptionsResult.data ?? []) as AvailabilityException[]);
    };

    load();
  }, [supabase, activeTenantId, professionalId]);

  const refreshRules = async () => {
    if (!activeTenantId || !professionalId) return;
    const { data } = await supabase
      .from("availability_rules")
      .select("id, weekday, start_time, end_time, timezone")
      .eq("tenant_id", activeTenantId)
      .eq("professional_user_id", professionalId)
      .order("weekday", { ascending: true });
    setRules((data ?? []) as AvailabilityRule[]);
  };

  const refreshExceptions = async () => {
    if (!activeTenantId || !professionalId) return;
    const { data } = await supabase
      .from("availability_exceptions")
      .select("id, date, start_time, end_time, is_available, note")
      .eq("tenant_id", activeTenantId)
      .eq("professional_user_id", professionalId)
      .order("date", { ascending: true });
    setExceptions((data ?? []) as AvailabilityException[]);
  };

  const handleDeleteRule = async (ruleId: string) => {
    setError(null);
    const { error: deleteError } = await supabase.from("availability_rules").delete().eq("id", ruleId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await refreshRules();
  };

  const handleDeleteException = async (exceptionId: string) => {
    setError(null);
    const { error: deleteError } = await supabase
      .from("availability_exceptions")
      .delete()
      .eq("id", exceptionId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await refreshExceptions();
  };

  const handleCreateRule = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!activeTenantId || !professionalId) {
      setError("Selecciona un tenant primero.");
      return;
    }

    if (startTime >= endTime) {
      setError("La hora de inicio debe ser menor a la de fin.");
      return;
    }

    if (selectedWeekdays.length === 0) {
      setError("Selecciona al menos un dia.");
      return;
    }

    const payload = selectedWeekdays.map((day) => ({
      tenant_id: activeTenantId,
      professional_user_id: professionalId,
      weekday: day,
      start_time: startTime,
      end_time: endTime,
      timezone: "America/Santiago",
    }));

    const { error: insertError } = await (supabase
      .from("availability_rules") as any)
      .insert(payload);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    await refreshRules();
  };

  const handleCreateException = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!activeTenantId || !professionalId) {
      setError("Selecciona un tenant primero.");
      return;
    }

    if (!exceptionDate) {
      setError("Ingresa una fecha.");
      return;
    }

    if (!exceptionAllDay && exceptionStart >= exceptionEnd) {
      setError("La hora de inicio debe ser menor a la de fin.");
      return;
    }

    const payload = {
      tenant_id: activeTenantId,
      professional_user_id: professionalId,
      date: exceptionDate,
      is_available: exceptionAvailable,
      note: exceptionNote || null,
      start_time: exceptionAllDay ? null : exceptionStart,
      end_time: exceptionAllDay ? null : exceptionEnd,
    };

    const { error: insertError } = await (supabase
      .from("availability_exceptions") as any)
      .insert(payload);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setExceptionDate("");
    setExceptionNote("");
    await refreshExceptions();
  };

  return (
    <section className="space-y-8 pt-2">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold md:text-2xl">Disponibilidad</h1>
        <p className="text-sm text-[var(--panel-muted)]">Reglas semanales y excepciones generales de tu negocio.</p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="space-y-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6"
          onSubmit={handleCreateRule}
        >
          <h2 className="text-lg font-semibold">Regla semanal</h2>
          <AvailabilityRuleEditor
            title="Dias y horario"
            weekdays={selectedWeekdays}
            setWeekdays={setSelectedWeekdays}
            startTime={startTime}
            endTime={endTime}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
            addLabel="Agregar regla"
            addButtonType="submit"
            addButtonClassName="rounded-full bg-[var(--page-text)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-bg)]"
          />
        </form>

        <form
          className="space-y-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6"
          onSubmit={handleCreateException}
        >
          <h2 className="text-lg font-semibold">Excepcion</h2>
          <label className="text-sm">
            Fecha
            <input
              className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
              type="date"
              value={exceptionDate}
              onChange={(event) => setExceptionDate(event.target.value)}
              required
            />
          </label>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exceptionAvailable}
                onChange={(event) => setExceptionAvailable(event.target.checked)}
              />
              Disponible extra
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exceptionAllDay}
                onChange={(event) => setExceptionAllDay(event.target.checked)}
              />
              Todo el dia
            </label>
          </div>
          {!exceptionAllDay ? (
            <div className="grid gap-4 md:grid-cols-2">
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
            </div>
          ) : null}
          <label className="text-sm">
            Nota
            <input
              className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
              value={exceptionNote}
              onChange={(event) => setExceptionNote(event.target.value)}
              placeholder="Feriado, vacaciones, etc."
            />
          </label>
          <button
            className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
            type="submit"
          >
            Agregar excepcion
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Reglas actuales</h3>
          {rules.length === 0 ? (
            <p className="text-sm text-[var(--panel-muted)]">Sin reglas aun.</p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 text-sm"
                >
                  <span>
                    {weekdayLabels[rule.weekday]} · {rule.start_time} - {rule.end_time}
                  </span>
                  <button
                    className="text-xs text-[var(--panel-muted)] hover:text-[var(--page-text)]"
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Excepciones</h3>
          {exceptions.length === 0 ? (
            <p className="text-sm text-[var(--panel-muted)]">Sin excepciones aun.</p>
          ) : (
            <div className="space-y-2">
              {exceptions.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 text-sm"
                >
                  <span>
                    {ex.date} · {ex.is_available ? "Disponible" : "Bloqueado"}
                    {ex.start_time && ex.end_time ? ` (${ex.start_time} - ${ex.end_time})` : ""}
                    {ex.note ? ` · ${ex.note}` : ""}
                  </span>
                  <button
                    className="text-xs text-[var(--panel-muted)] hover:text-[var(--page-text)]"
                    type="button"
                    onClick={() => handleDeleteException(ex.id)}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
