"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Shield, Trash2, UserPlus, ChevronDown, ChevronUp, Eye, EyeOff, KeyRound, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { PERMISSIONS } from "@/lib/permissions";

type Role = { id: number; name: string; isSystem: boolean; userCount: number; permissions: string[]; description: string | null };
type AdminUser = { id: number; name: string; email: string; isActive: boolean; role: { id: number; name: string; isSystem: boolean }; createdAt: string };
type CurrentUser = { id: number; isSystem: boolean; permissions: string[] };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [expandedRole, setExpandedRole] = useState<number | null>(null);
  const [passwordModal, setPasswordModal] = useState<AdminUser | null>(null);
  const [editModal, setEditModal] = useState<AdminUser | null>(null);

  // isStale lets the effect drop a response superseded by a newer query or unmount.
  const load = useCallback((isStale: () => boolean = () => false) =>
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/roles").then((r) => r.json()),
      fetch("/api/admin/auth").then((r) => r.json()),
    ]).then(([uRes, rRes, authRes]) => {
      if (isStale()) return;
      setUsers(uRes.users ?? []);
      setRoles(rRes.roles ?? []);
      if (authRes.user) setCurrentUser({ id: authRes.user.id, isSystem: authRes.user.isSystem, permissions: authRes.user.permissions ?? [] });
      setLoading(false);
    }), []);

  useEffect(() => {
    let stale = false;
    load(() => stale);
    return () => { stale = true; };
  }, [load]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>;

  const canManageUsers = currentUser?.isSystem || currentUser?.permissions.includes("users.manage");

  // Row actions, shared by the desktop table and the phone cards.
  const renderUserActions = (u: AdminUser, className: string) => {
    const isSelf = currentUser?.id === u.id;
    const isTargetOwner = u.role.isSystem;
    const canChangePassword = isSelf || (canManageUsers && (!isTargetOwner || currentUser?.isSystem));
    const canEdit = canManageUsers && (!isTargetOwner || currentUser?.isSystem);
    const canDelete = canManageUsers && !isTargetOwner;

    return (
      <div className={`${className} items-center gap-1`}>
        {canEdit && (
          <button type="button" title="Edit user" onClick={() => setEditModal(u)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sand hover:text-ink">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {canChangePassword && (
          <button type="button" title="Change password" onClick={() => setPasswordModal(u)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sand hover:text-ink">
            <KeyRound className="h-3.5 w-3.5" />
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            title="Delete user"
            onClick={async () => {
              if (!confirm(`Delete user "${u.name}"?`)) return;
              const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
              if (res.ok) { toast.success("User deleted."); load(); }
              else { const j = await res.json(); toast.error(j.error ?? "Failed."); }
            }}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-clay/10 hover:text-clay"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-ink">Users & Roles</h1>

      {/* Users section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Admin users</h2>
          {canManageUsers && (
            <button type="button" onClick={() => setShowUserForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-forest-dark">
              <UserPlus className="h-4 w-4" /> Add user
            </button>
          )}
        </div>

        {showUserForm && <CreateUserForm roles={roles} onDone={() => { setShowUserForm(false); load(); }} />}

        <ul className="divide-y divide-line rounded-xl border border-line bg-paper md:hidden">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">
                  {u.name}
                  {currentUser?.id === u.id && <span className="ml-1.5 text-xs text-muted">(you)</span>}
                </p>
                <p className="truncate text-xs text-muted">{u.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <RoleLabel role={u.role} />
                  <ActiveBadge active={u.isActive} />
                </div>
              </div>
              {renderUserActions(u, "flex shrink-0")}
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-xl border border-line bg-paper md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-2.5 font-medium text-ink">
                    {u.name}
                    {currentUser?.id === u.id && <span className="ml-1.5 text-xs text-muted">(you)</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{u.email}</td>
                  <td className="px-4 py-2.5"><RoleLabel role={u.role} /></td>
                  <td className="px-4 py-2.5"><ActiveBadge active={u.isActive} /></td>
                  <td className="px-4 py-2.5 text-right">{renderUserActions(u, "inline-flex")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Roles section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Roles</h2>
          {canManageUsers && (
            <button type="button" onClick={() => setShowRoleForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-sand">
              <Plus className="h-4 w-4" /> Add role
            </button>
          )}
        </div>

        {showRoleForm && <RoleForm onDone={() => { setShowRoleForm(false); load(); }} />}

        <div className="space-y-2">
          {roles.map((r) => (
            <div key={r.id} className="rounded-xl border border-line bg-paper">
              <button type="button" className="flex w-full items-center justify-between px-5 py-3 text-left" onClick={() => setExpandedRole(expandedRole === r.id ? null : r.id)}>
                <div>
                  <span className="font-medium text-ink">{r.name}</span>
                  {r.isSystem && <span className="ml-2 text-xs text-honey-dark">(system)</span>}
                  <span className="ml-3 text-xs text-muted">{r.userCount} user{r.userCount !== 1 ? "s" : ""}</span>
                </div>
                {expandedRole === r.id ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
              </button>
              {expandedRole === r.id && (
                <div className="border-t border-line px-5 py-3">
                  {r.isSystem ? (
                    <p className="text-sm text-muted">System role — has all permissions.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {r.permissions.length === 0 && <span className="text-sm text-muted">No permissions assigned.</span>}
                      {r.permissions.map((p) => (
                        <span key={p} className="rounded-full bg-sand px-2 py-0.5 text-xs text-ink">{p}</span>
                      ))}
                    </div>
                  )}
                  {!r.isSystem && canManageUsers && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`Delete role "${r.name}"?`)) return;
                          const res = await fetch(`/api/admin/roles/${r.id}`, { method: "DELETE" });
                          if (res.ok) { toast.success("Role deleted."); load(); }
                          else { const j = await res.json(); toast.error(j.error ?? "Failed."); }
                        }}
                        className="text-xs text-clay hover:underline"
                      >
                        Delete role
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Password modal */}
      {passwordModal && (
        <PasswordModal
          userId={passwordModal.id}
          isSelf={currentUser?.id === passwordModal.id}
          userName={passwordModal.name}
          onClose={() => setPasswordModal(null)}
        />
      )}

      {/* Edit user modal */}
      {editModal && (
        <EditUserModal
          user={editModal}
          roles={roles}
          currentIsOwner={!!currentUser?.isSystem}
          onClose={() => setEditModal(null)}
          onSaved={() => { setEditModal(null); load(); }}
        />
      )}
    </div>
  );
}

/* ---------- Modal backdrop ---------- */

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-xl">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-sand hover:text-ink" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------- Password modal ---------- */

function PasswordModal({ userId, isSelf, userName, onClose }: { userId: number; isSelf: boolean; userName: string; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { changePassword: true, newPassword };
      if (isSelf) body.currentPassword = currentPassword;
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) { toast.success("Password updated."); onClose(); }
      else { toast.error(json.error ?? "Failed."); }
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-4 text-lg font-semibold text-ink">
        {isSelf ? "Change your password" : `Change password for ${userName}`}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isSelf && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Current password</label>
            <div className="relative">
              <input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input pr-10" required />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label={showCurrent ? "Hide" : "Show"}>
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">New password</label>
          <div className="relative">
            <input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input pr-10" required minLength={8} />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label={showNew ? "Hide" : "Show"}>
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Confirm new password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" required minLength={8} />
          {mismatch && <p className="mt-0.5 text-xs text-clay">Passwords don&apos;t match</p>}
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving || mismatch} className="rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-sand">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Edit user modal ---------- */

function EditUserModal({ user, roles, currentIsOwner, onClose, onSaved }: {
  user: AdminUser;
  roles: Role[];
  currentIsOwner: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [roleId, setRoleId] = useState(user.role.id);
  const [isActive, setIsActive] = useState(user.isActive);
  const [saving, setSaving] = useState(false);

  const isTargetOwner = user.role.isSystem;
  const assignableRoles = currentIsOwner ? roles : roles.filter((r) => !r.isSystem);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name, email, isActive };
      if (!isTargetOwner) body.roleId = roleId;
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) { toast.success("User updated."); onSaved(); }
      else { toast.error(json.error ?? "Failed."); }
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-4 text-lg font-semibold text-ink">Edit user</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Role</label>
          {isTargetOwner ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-line bg-sand/50 px-3 py-2.5 text-sm text-muted">
              <Shield className="h-3.5 w-3.5 text-honey" /> {user.role.name}
              <span className="text-xs">(cannot be changed)</span>
            </div>
          ) : (
            <select value={roleId} onChange={(e) => setRoleId(Number(e.target.value))} className="input">
              {assignableRoles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-line accent-forest" />
          <span className="text-muted">Active</span>
        </label>
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving} className="rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-sand">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Create user form ---------- */

function CreateUserForm({ roles, onDone }: { roles: Role[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [roleId, setRoleId] = useState(roles.find((r) => !r.isSystem)?.id ?? roles[0]?.id ?? 0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, roleId }),
      });
      if (res.ok) { toast.success("User created."); onDone(); }
      else { const j = await res.json(); toast.error(j.error ?? "Failed."); }
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-paper p-5 max-w-md space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Password</label>
        <div className="relative">
          <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="input pr-10" required minLength={8} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label={showPassword ? "Hide" : "Show"}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Role</label>
        <select value={roleId} onChange={(e) => setRoleId(Number(e.target.value))} className="input">
          {roles.filter((r) => !r.isSystem).map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create user"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-sand">Cancel</button>
      </div>
    </form>
  );
}

/* ---------- Create role form ---------- */

function RoleForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const groups = PERMISSIONS.reduce<Record<string, typeof PERMISSIONS>>((acc, p) => {
    (acc[p.group] ??= []).push(p);
    return acc;
  }, {});

  const toggle = (key: string) => {
    setSelectedPerms((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { toast.error("Role name required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, permissions: selectedPerms }),
      });
      if (res.ok) { toast.success("Role created."); onDone(); }
      else { const j = await res.json(); toast.error(j.error ?? "Failed."); }
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-paper p-5 space-y-4">
      <div className="max-w-xs">
        <label className="mb-1 block text-xs font-medium text-muted">Role name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" required placeholder="Order Manager" />
      </div>
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted">Permissions</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(groups).map(([group, perms]) => (
            <div key={group}>
              <p className="mb-1 text-xs font-semibold text-ink">{group}</p>
              {perms.map((p) => (
                <label key={p.key} className="flex items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" checked={selectedPerms.includes(p.key)} onChange={() => toggle(p.key)} className="accent-forest" />
                  {p.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create role"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-sand">Cancel</button>
      </div>
    </form>
  );
}

function RoleLabel({ role }: { role: { name: string; isSystem: boolean } }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      {role.isSystem && <Shield className="h-3 w-3 text-honey" />}
      {role.name}
    </span>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-leaf-soft text-forest" : "bg-sand text-muted"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}
