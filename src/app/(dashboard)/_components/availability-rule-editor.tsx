"use client";

import type { Dispatch, SetStateAction } from "react";

export type AvailabilityRuleDraft = {
  weekdays: number[];
  startTime: string;
  endTime: string;
};

export const weekdayLabels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

type AvailabilityRuleEditorProps = {
  title: string;
  weekdays: number[];
  setWeekdays: Dispatch<SetStateAction<number[]>>;
  startTime: string;
  endTime: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onAddRule?: () => void;
  addLabel?: string;
  addButtonType?: "button" | "submit";
  addButtonClassName?: string;
  loading?: boolean;
  loadingLabel?: string;
  rules?: AvailabilityRuleDraft[];
  onRemoveRule?: (index: number) => void;
};

export default function AvailabilityRuleEditor({
  title,
  weekdays,
  setWeekdays,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onAddRule,
  addLabel = "Agregar",
  addButtonType = "button",
  addButtonClassName = "rounded-full border border-[var(--panel-border)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--brand-copper)] hover:text-[var(--brand-teal)]",
  loading,
  loadingLabel = "Cargando disponibilidad...",
  rules,
  onRemoveRule,
}: AvailabilityRuleEditorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {loading ? (
        <p className="mt-2 text-xs text-[var(--panel-muted)]">{loadingLabel}</p>
      ) : (
        <>
          <div className="space-y-3">
            <div className="space-y-2 text-sm">
              <p className="text-[var(--panel-muted)]">Dias</p>
              <div className="flex flex-wrap gap-2">
                {weekdayLabels.map((label, idx) => {
                  const active = weekdays.includes(idx);
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs ${
                        active
                          ? "border-[var(--page-text)] bg-[var(--page-text)] text-[var(--page-bg)]"
                          : "border-[var(--panel-border)] text-[var(--page-text)] hover:border-[var(--page-text)]"
                      }`}
                      onClick={() => {
                        setWeekdays((current) =>
                          current.includes(idx) ? current.filter((day) => day !== idx) : [...current, idx],
                        );
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                Inicio
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                  type="time"
                  value={startTime}
                  onChange={(event) => onStartTimeChange(event.target.value)}
                  required
                />
              </label>
              <label className="text-sm">
                Fin
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                  type="time"
                  value={endTime}
                  onChange={(event) => onEndTimeChange(event.target.value)}
                  required
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                className={addButtonClassName}
                type={addButtonType}
                onClick={onAddRule}
              >
                {addLabel}
              </button>
            </div>
          </div>
          {rules && rules.length > 0 && onRemoveRule ? (
            <div className="mt-2 space-y-2 text-sm">
              {rules.map((rule, index) => (
                <div
                  key={`${rule.startTime}-${rule.endTime}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--panel-border)] px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--panel-muted)]">
                      {rule.weekdays.map((day) => weekdayLabels[day]).join(", ")}
                    </span>
                    <span className="text-xs">
                      {rule.startTime} - {rule.endTime}
                    </span>
                  </div>
                  <button
                    className="text-xs text-[var(--panel-muted)]"
                    type="button"
                    onClick={() => onRemoveRule(index)}
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
  );
}
