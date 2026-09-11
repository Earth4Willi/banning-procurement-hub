"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, CirclesThreePlus, XCircle } from "@phosphor-icons/react";
import { api, formatDate, inputClass, type Session } from "./helpers";

type StaffMember = {
  id: string;
  email: string;
  name: string;
  scopes: string[];
  active: boolean;
  created_at: string;
};

type StaffSession = {
  staffId: string;
  email: string;
  name: string;
  sessions: { sessionId: string; email: string; name: string; lastSeen: number }[];
};

const ASSIGNABLE_SCOPES = ["messages", "customers", "materials", "inventory", "analytics"] as const;

type AddForm = {
  name: string;
  email: string;
  password: string;
  scopes: string[];
};

const EMPTY_FORM: AddForm = { name: "", email: "", password: "", scopes: ["messages"] };

export function StaffView({ session, onNeedRefresh }: { session: Session; onNeedRefresh: () => Promise<void> }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [sessions, setSessions] = useState<StaffSession[]>([]);
  const [showSessions, setShowSessions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [staffRes, sessionRes] = await Promise.all([
        api<{ staff: StaffMember[] }>("/api/admin/staff"),
        api<{ sessions: StaffSession[] }>("/api/admin/staff/sessions"),
      ]);
      setStaff(staffRes.staff);
      setSessions(sessionRes.sessions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load staff.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session.status !== "signed-in" || session.role !== "owner") return;
    void load();
  }, [session.status, session.role, load]);

  if (session.role !== "owner") {
    return (
      <div className="rounded-xl border border-primary/10 bg-surface p-6 text-center text-sm text-ink-muted">
        Staff management is owner-only.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-40 animate-pulse rounded bg-primary/10" />
        <div className="h-40 animate-pulse rounded-2xl bg-primary/10" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700" role="alert">
        {error}
      </div>
    );
  }

  const submit = async () => {
    setFormError(null);
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      setFormError("Name, email and a password of 8+ characters are required.");
      return;
    }
    setSubmitting(true);
    try {
      await api<{ ok: boolean }>("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password, scopes: form.scopes }),
      });
      setForm(EMPTY_FORM);
      setAdding(false);
      setFlash("Staff account created.");
      await load();
      void onNeedRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create staff account.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (member: StaffMember) => {
    try {
      await api<{ ok: boolean }>(`/api/admin/staff/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ id: member.id, active: !member.active }),
      });
      setFlash(member.active ? `${member.name} deactivated — sessions ended.` : `${member.name} reactivated.`);
      await load();
      void onNeedRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const remove = async (member: StaffMember) => {
    if (!confirm(`Delete ${member.name}? This ends any active sessions and cannot be undone.`)) return;
    try {
      await api<{ ok: boolean }>(`/api/admin/staff/${member.id}`, {
        method: "DELETE",
        body: JSON.stringify({ id: member.id }),
      });
      setFlash(`${member.name} deleted.`);
      await load();
      void onNeedRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  const revokeSessions = async (staffId: string) => {
    try {
      await api<{ ok: boolean }>("/api/admin/staff/sessions", {
        method: "DELETE",
        body: JSON.stringify({ id: staffId }),
      });
      setFlash("Sessions revoked.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">Staff</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Team members with scoped access to the admin panel. You are the implicit superuser.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM);
            setFormError(null);
            setAdding((on) => !on);
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-[10px] bg-gradient-to-b from-accent-light to-accent px-4 py-2 text-xs font-semibold text-[#0d3d1a] shadow-[0_4px_12px_rgba(240,180,41,0.3)] transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-[0_8px_16px_rgba(240,180,41,0.4)]"
        >
          <CirclesThreePlus size={16} weight="bold" aria-hidden="true" />
          {adding ? "Cancel" : "Add staff"}
        </button>
      </div>

      {flash ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800" role="status">
          {flash}
        </div>
      ) : null}

      {adding ? (
        <section className="space-y-4 rounded-2xl border border-primary/10 bg-surface p-5 sm:p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d3d1a]">New staff account</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">Name</span>
              <input
                type="text"
                autoComplete="off"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Kwame Mensah"
                className={inputClass(false)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">Email</span>
              <input
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="staff@example.com"
                className={inputClass(false)}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Temporary password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="8+ characters"
              className={inputClass(false)}
            />
            <span className="mt-1 block text-xs text-ink-muted">
              Share the password out-of-band; staff can change it from their account.
            </span>
          </label>
          <fieldset>
            <legend className="text-sm font-medium text-ink">Access</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ASSIGNABLE_SCOPES.map((scope) => {
                const checked = form.scopes.includes(scope);
                return (
                  <button
                    key={scope}
                    type="button"
                    aria-pressed={checked}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        scopes: checked ? f.scopes.filter((s) => s !== scope) : [...f.scopes, scope],
                      }))
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      checked
                        ? "border-[#0d3d1a] bg-[#0d3d1a] text-white"
                        : "border-primary/20 bg-surface text-ink-muted hover:border-primary/40 hover:text-ink"
                    }`}
                  >
                    {checked ? <CheckCircle size={13} weight="fill" aria-hidden="true" /> : <XCircle size={13} aria-hidden="true" />}
                    {scope}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {formError ? (
            <p className="text-sm text-red-700" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-b from-accent-light to-accent px-5 py-2.5 text-xs font-semibold text-[#0d3d1a] shadow-[0_4px_12px_rgba(240,180,41,0.3)] transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-[0_8px_16px_rgba(240,180,41,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create account"}
            </button>
          </div>
        </section>
      ) : null}

      {staff.length === 0 ? (
        <div className="rounded-2xl border border-primary/10 bg-surface p-6 text-center text-sm text-ink-muted">
          No staff accounts yet. Add one to share admin access.
        </div>
      ) : (
        <div className="divide-y divide-primary/10 rounded-2xl border border-primary/10 bg-surface">
          {staff.map((member) => (
            <div key={member.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink">
                    {member.name}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        member.active
                          ? "bg-emerald-600/15 text-emerald-700"
                          : "bg-rose-600/10 text-rose-700"
                      }`}
                    >
                      {member.active ? (
                        <CheckCircle size={10} weight="fill" aria-hidden="true" />
                      ) : (
                        <XCircle size={10} weight="fill" aria-hidden="true" />
                      )}
                      {member.active ? "Active" : "Deactivated"}
                    </span>
                  </p>
                  <p className="truncate text-xs text-ink-muted">{member.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSessions((s) => ({ ...s, [member.id]: !s[member.id] }))}
                    className="text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                  >
                    Sessions
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleActive(member)}
                    className="text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                  >
                    {member.active ? "Deactivate" : "Reactivate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(member)}
                    className="text-xs font-medium text-rose-600 transition-colors hover:text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {member.scopes.length === 0 ? (
                  <span className="rounded-full bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                    No views assigned
                  </span>
                ) : (
                  member.scopes.map((scope) => (
                    <span key={scope} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium capitalize text-ink-muted">
                      {scope}
                    </span>
                  ))
                )}
              </div>
              {showSessions[member.id] ? (
                <SessionRows sessions={sessions.find((s) => s.staffId === member.id)?.sessions ?? []} onRevoke={() => void revokeSessions(member.id)} />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionRows({ sessions, onRevoke }: { sessions: { sessionId: string; email: string; name: string; lastSeen: number }[]; onRevoke: () => void }) {
  const [revoking, setRevoking] = useState(false);
  return (
    <div className="mt-3 rounded-xl border border-primary/10 bg-primary/5 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Active sessions</p>
        {sessions.length > 0 ? (
          <button
            type="button"
            disabled={revoking}
            onClick={() => {
              setRevoking(true);
              onRevoke();
            }}
            className="text-xs font-medium text-rose-600 transition-colors hover:text-rose-700 disabled:opacity-60"
          >
            {revoking ? "Revoking…" : "End all"}
          </button>
        ) : null}
      </div>
      {sessions.length === 0 ? (
        <p className="mt-2 text-xs text-ink-muted">No active sessions.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {sessions.map((s) => (
            <li key={s.sessionId} className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-ink">{s.name || s.email || "Unknown device"}</span>
              <span className="shrink-0 text-ink-muted">{formatDate(new Date(s.lastSeen).toISOString())}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}