"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useActiveTenant } from "@/lib/tenant/useActiveTenant";
import {
  capitalizeFirst,
  fetchComunas,
  fetchRegions,
  formatRut,
  isValidRut,
  type ChileComuna,
  type ChileRegion,
} from "@/lib/chile";

const insuranceOptions = [
  { value: "fonasa", label: "FONASA" },
  { value: "isapre", label: "ISAPRE" },
  { value: "particular", label: "PARTICULAR" },
];

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

function calculateAge(birthDate?: string | null) {
  if (!birthDate) return null;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const m = now.getUTCMonth() - date.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < date.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export default function PatientsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const { activeTenantId } = useActiveTenant();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const searchQuery = (searchParams.get("q") ?? "").trim();

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
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editRut, setEditRut] = useState("");
  const [editNoRut, setEditNoRut] = useState(false);
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddressLine, setEditAddressLine] = useState("");
  const [editComuna, setEditComuna] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editInsurance, setEditInsurance] = useState("fonasa");
  const [editComunas, setEditComunas] = useState<ChileComuna[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!activeTenantId) return;
      const { data, error: loadError } = await supabase
        .from("patients")
        .select(
          "id, first_name, last_name, rut, birth_date, email, phone, address_line, comuna, region, health_insurance",
        )
        .eq("tenant_id", activeTenantId)
        .order("created_at", { ascending: false });

      if (loadError) {
        setError(loadError.message);
        return;
      }

      setPatients((data ?? []) as Patient[]);
    };

    load();
  }, [supabase, activeTenantId]);

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
    const loadEditComunas = async () => {
      if (!editRegion || regions.length === 0) {
        setEditComunas([]);
        return;
      }
      const regionEntry = regions.find((item) => item.name === editRegion || item.code === editRegion);
      if (!regionEntry) {
        setEditComunas([]);
        return;
      }
      try {
        const data = await fetchComunas(regionEntry.code);
        setEditComunas(data);
      } catch (loadError) {
        setGeoError(loadError instanceof Error ? loadError.message : "No se pudieron cargar comunas");
      }
    };
    loadEditComunas();
  }, [editRegion, regions]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!activeTenantId) {
      setError("Selecciona un tenant primero.");
      return;
    }

    const normalizedRut = noRut ? "" : formatRut(rut);
    if (!noRut && !isValidRut(normalizedRut)) {
      setError("RUT invalido.");
      return;
    }

    const { error: insertError } = await (supabase.from("patients") as any).insert({
      tenant_id: activeTenantId,
      first_name: capitalizeFirst(firstName),
      last_name: capitalizeFirst(lastName),
      rut: noRut ? null : normalizedRut || null,
      birth_date: birthDate || null,
      email: email || null,
      phone: phone || null,
      address_line: addressLine || null,
      comuna: comuna || null,
      region: region || null,
      health_insurance: insurance,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setFirstName("");
    setLastName("");
    setRut("");
    setNoRut(false);
    setBirthDate("");
    setEmail("");
    setPhone("");
    setAddressLine("");
    setComuna("");
    setRegion("");
    setInsurance("fonasa");

    const { data } = await supabase
      .from("patients")
      .select(
        "id, first_name, last_name, rut, birth_date, email, phone, address_line, comuna, region, health_insurance",
      )
      .eq("tenant_id", activeTenantId as string)
      .order("created_at", { ascending: false });
    setPatients((data ?? []) as Patient[]);
    router.replace("/dashboard/patients");
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatientId(patient.id);
    setEditFirstName(patient.first_name);
    setEditLastName(patient.last_name);
    setEditRut(patient.rut ?? "");
    setEditNoRut(!patient.rut);
    setEditBirthDate(patient.birth_date ?? "");
    setEditEmail(patient.email ?? "");
    setEditPhone(patient.phone ?? "");
    setEditAddressLine(patient.address_line ?? "");
    setEditComuna(patient.comuna ?? "");
    setEditRegion(patient.region ?? "");
    setEditInsurance(patient.health_insurance ?? "fonasa");
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!editingPatientId || !activeTenantId) return;

    const normalizedRut = editNoRut ? "" : formatRut(editRut);
    if (!editNoRut && !isValidRut(normalizedRut)) {
      setError("RUT invalido.");
      return;
    }

    const { error: updateError } = await (supabase.from("patients") as any)
      .update({
        first_name: capitalizeFirst(editFirstName),
        last_name: capitalizeFirst(editLastName),
        rut: editNoRut ? null : normalizedRut,
        birth_date: editBirthDate || null,
        email: editEmail,
        phone: editPhone,
        address_line: editAddressLine,
        comuna: editComuna,
        region: editRegion,
        health_insurance: editInsurance,
      })
      .eq("id", editingPatientId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

      setEditingPatientId(null);

    const { data } = await supabase
      .from("patients")
      .select(
        "id, first_name, last_name, rut, birth_date, email, phone, address_line, comuna, region, health_insurance",
      )
      .eq("tenant_id", activeTenantId as string)
      .order("created_at", { ascending: false });
    setPatients((data ?? []) as Patient[]);
  };

  const handleDelete = async (patientId: string) => {
    setError(null);
    if (!window.confirm("Eliminar este paciente?")) return;

    const { error: deleteError } = await supabase.from("patients").delete().eq("id", patientId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    const { data } = await supabase
      .from("patients")
      .select(
        "id, first_name, last_name, rut, birth_date, email, phone, address_line, comuna, region, health_insurance",
      )
      .eq("tenant_id", activeTenantId as string)
      .order("created_at", { ascending: false });
    setPatients((data ?? []) as Patient[]);
  };

  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      patient.first_name.toLowerCase().includes(query) ||
      patient.last_name.toLowerCase().includes(query) ||
      patient.rut?.toLowerCase().includes(query) ||
      patient.email?.toLowerCase().includes(query)
    );
  });

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold md:text-2xl">Pacientes</h1>
        <p className="text-sm text-[var(--panel-muted)]">Registro de pacientes del tenant.</p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Pacientes registrados</h2>
        {filteredPatients.length === 0 ? (
          <p className="text-sm text-[var(--panel-muted)]">Sin pacientes aun.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--panel-soft)] text-xs uppercase tracking-wide text-[var(--panel-muted)]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                  <th className="px-4 py-3 text-left font-semibold">RUT</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Telefono</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--panel-border)]">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id}>
                    <td className="px-4 py-3 font-medium">
                      {patient.first_name} {patient.last_name}
                    </td>
                    <td className="px-4 py-3 text-[var(--panel-muted)]">{patient.rut ?? "-"}</td>
                    <td className="px-4 py-3 text-[var(--panel-muted)]">{patient.email ?? "-"}</td>
                    <td className="px-4 py-3 text-[var(--panel-muted)]">{patient.phone ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-1 text-xs"
                          type="button"
                          onClick={() => handleEdit(patient)}
                        >
                          Editar
                        </button>
                        <button
                          className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-1 text-xs"
                          type="button"
                          onClick={() => handleDelete(patient.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editingPatientId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setEditingPatientId(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editar paciente</h2>
              <button
                className="text-sm text-[var(--panel-muted)]"
                type="button"
                onClick={() => setEditingPatientId(null)}
              >
                Cerrar
              </button>
            </div>
            <form className="mt-4 grid gap-4" onSubmit={handleUpdate}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  Nombre
                  <input
                    className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                    value={editFirstName}
                    onChange={(event) => setEditFirstName(event.target.value)}
                    onBlur={() => setEditFirstName(capitalizeFirst(editFirstName))}
                    required
                  />
                </label>
                <label className="text-sm">
                  Apellidos
                  <input
                    className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                    value={editLastName}
                    onChange={(event) => setEditLastName(event.target.value)}
                    onBlur={() => setEditLastName(capitalizeFirst(editLastName))}
                    required
                  />
                </label>
                <label className="text-sm">
                  Telefono
                  <input
                    className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                    value={editPhone}
                    onChange={(event) => setEditPhone(event.target.value)}
                    required
                  />
                </label>
                <label className="text-sm">
                  Email
                  <input
                    className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                    value={editEmail}
                    onChange={(event) => setEditEmail(event.target.value)}
                    required
                  />
                </label>
                <label className="text-sm">
                  RUT
                  <input
                    className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                    value={editRut}
                    onChange={(event) => setEditRut(event.target.value)}
                    onBlur={() => setEditRut(formatRut(editRut))}
                    required={!editNoRut}
                    disabled={editNoRut}
                  />
                </label>
                <div className="flex items-center gap-2 text-sm text-[var(--panel-muted)]">
                  <input
                    type="checkbox"
                    checked={editNoRut}
                    onChange={(event) => {
                      setEditNoRut(event.target.checked);
                      if (event.target.checked) {
                        setEditRut("");
                      }
                    }}
                  />
                  <span>Sin RUT</span>
                </div>
                <label className="text-sm">
                  Fecha nacimiento
                  <input
                    className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                    type="date"
                    value={editBirthDate}
                    onChange={(event) => setEditBirthDate(event.target.value)}
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  Domicilio
                  <input
                    className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                    value={editAddressLine}
                    onChange={(event) => setEditAddressLine(event.target.value)}
                  />
                </label>
                <label className="text-sm">
                  Region
                  <select
                    className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                    value={editRegion}
                    onChange={(event) => {
                      setEditRegion(event.target.value);
                      setEditComuna("");
                    }}
                  >
                    <option value="">Selecciona</option>
                    {regions.map((item) => (
                      <option key={item.code} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  Comuna
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                  value={editComuna}
                  onChange={(event) => setEditComuna(event.target.value)}
                  disabled={!editRegion || editComunas.length === 0}
                >
                    <option value="">{editRegion ? "Selecciona" : "Selecciona region"}</option>
                    {editComunas.map((item) => (
                      <option key={item.code} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Prevision
                  <select
                    className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                    value={editInsurance}
                    onChange={(event) => setEditInsurance(event.target.value)}
                  >
                    {insuranceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm"
                  type="button"
                  onClick={() => setEditingPatientId(null)}
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
          onClick={() => router.replace("/dashboard/patients")}
          role="presentation"
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nuevo paciente</h2>
              <button
                className="text-sm text-[var(--panel-muted)]"
                type="button"
                onClick={() => router.replace("/dashboard/patients")}
              >
                Cerrar
              </button>
            </div>
            <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
              <label className="text-sm">
                Nombre
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  onBlur={() => setFirstName(capitalizeFirst(firstName))}
                  required
                />
              </label>
              <label className="text-sm">
                Apellidos
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  onBlur={() => setLastName(capitalizeFirst(lastName))}
                  required
                />
              </label>
              <label className="text-sm">
                Telefono
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </label>
              <label className="text-sm">
                Email
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="text-sm">
                RUT
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                  value={rut}
                  onChange={(event) => setRut(event.target.value)}
                  onBlur={() => setRut(formatRut(rut))}
                  required={!noRut}
                  disabled={noRut}
                />
              </label>
              <div className="flex items-center gap-2 text-sm text-[var(--panel-muted)] md:col-span-2">
                <input
                  type="checkbox"
                  checked={noRut}
                  onChange={(event) => {
                    setNoRut(event.target.checked);
                    if (event.target.checked) {
                      setRut("");
                    }
                  }}
                />
                <span>Sin RUT</span>
              </div>
              <label className="text-sm">
                Fecha de nacimiento
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                  type="date"
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                />
              </label>
              <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                <label className="text-sm">
                  Domicilio
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                  value={addressLine}
                  onChange={(event) => setAddressLine(event.target.value)}
                />
              </label>
              <label className="text-sm">
                Region
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                  value={region}
                  onChange={(event) => {
                    setRegion(event.target.value);
                    setComuna("");
                  }}
                >
                    <option value="">Selecciona</option>
                    {regions.map((item) => (
                      <option key={item.code} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="text-sm">
                Comuna
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                  value={comuna}
                  onChange={(event) => setComuna(event.target.value)}
                  disabled={!region || comunas.length === 0}
                >
                  <option value="">{region ? "Selecciona" : "Selecciona region"}</option>
                  {comunas.map((item) => (
                    <option key={item.code} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Prevision
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                  value={insurance}
                  onChange={(event) => setInsurance(event.target.value)}
                >
                  {insuranceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {error ? <p className="text-xs text-red-400 md:col-span-2">{error}</p> : null}
              {geoError ? <p className="text-xs text-amber-500 md:col-span-2">{geoError}</p> : null}
              <div className="flex items-center justify-between md:col-span-2">
                <p className="text-xs text-[var(--panel-muted)]">
                  Edad calculada: {calculateAge(birthDate) ?? "-"}
                </p>
                <div className="flex gap-2">
                  <button
                    className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm"
                    type="button"
                    onClick={() => router.replace("/dashboard/patients")}
                  >
                    Cancelar
                  </button>
                  <button
                    className="rounded-xl bg-[var(--page-text)] px-4 py-2 text-sm font-semibold text-[var(--page-bg)]"
                    type="submit"
                  >
                    Crear paciente
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
