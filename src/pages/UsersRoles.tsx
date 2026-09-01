import { useMemo, useState } from 'react';
import { UserPlus, Search, ShieldCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role = 'Admin' | 'Operations Manager' | 'Sustainability Lead' | 'Warehouse Staff' | 'Viewer';
type UserStatus = 'Active' | 'Invited' | 'Suspended';

interface EarthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastActive: string;
  status: UserStatus;
}

interface PermissionRow {
  capability: string;
  access: Record<Role, boolean>;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const TOTAL_USERS = 24;

const USERS: EarthUser[] = [
  { id: 'U-001', name: 'Katrin Vogel', email: 'k.vogel@hornbach.de', role: 'Admin', lastActive: '2026-07-31 08:12', status: 'Active' },
  { id: 'U-002', name: 'Jonas Brandt', email: 'j.brandt@hornbach.de', role: 'Operations Manager', lastActive: '2026-07-31 07:45', status: 'Active' },
  { id: 'U-003', name: 'Lena Schuster', email: 'l.schuster@hornbach.de', role: 'Sustainability Lead', lastActive: '2026-07-30 18:20', status: 'Active' },
  { id: 'U-004', name: 'Tobias Hartmann', email: 't.hartmann@hornbach.de', role: 'Warehouse Staff', lastActive: '2026-07-31 06:58', status: 'Active' },
  { id: 'U-005', name: 'Nadine Krüger', email: 'n.krueger@hornbach.de', role: 'Operations Manager', lastActive: '2026-07-29 14:03', status: 'Active' },
  { id: 'U-006', name: 'Sebastian Wolff', email: 's.wolff@hornbach.de', role: 'Viewer', lastActive: '2026-07-25 09:11', status: 'Active' },
  { id: 'U-007', name: 'Franziska Neumann', email: 'f.neumann@hornbach.de', role: 'Sustainability Lead', lastActive: '2026-07-31 09:30', status: 'Active' },
  { id: 'U-008', name: 'Matthias Zimmermann', email: 'm.zimmermann@hornbach.de', role: 'Warehouse Staff', lastActive: '2026-07-28 11:47', status: 'Suspended' },
  { id: 'U-009', name: 'Anja Fischer', email: 'a.fischer@hornbach.de', role: 'Admin', lastActive: '2026-07-31 08:05', status: 'Active' },
  { id: 'U-010', name: 'Philipp Baumann', email: 'p.baumann@hornbach.de', role: 'Viewer', lastActive: '—', status: 'Invited' },
];

const ROLES: Role[] = ['Admin', 'Operations Manager', 'Sustainability Lead', 'Warehouse Staff', 'Viewer'];
const STATUSES: UserStatus[] = ['Active', 'Invited', 'Suspended'];

const PERMISSIONS: PermissionRow[] = [
  {
    capability: 'View dashboards & reports',
    access: { Admin: true, 'Operations Manager': true, 'Sustainability Lead': true, 'Warehouse Staff': true, Viewer: true },
  },
  {
    capability: 'Manage locations & containers',
    access: { Admin: true, 'Operations Manager': true, 'Sustainability Lead': false, 'Warehouse Staff': false, Viewer: false },
  },
  {
    capability: 'Schedule pickups & routes',
    access: { Admin: true, 'Operations Manager': true, 'Sustainability Lead': false, 'Warehouse Staff': true, Viewer: false },
  },
  {
    capability: 'Submit CSRD/GRI disclosures',
    access: { Admin: true, 'Operations Manager': false, 'Sustainability Lead': true, 'Warehouse Staff': false, Viewer: false },
  },
  {
    capability: 'Manage users & roles',
    access: { Admin: true, 'Operations Manager': false, 'Sustainability Lead': false, 'Warehouse Staff': false, Viewer: false },
  },
  {
    capability: 'Configure integrations & billing',
    access: { Admin: true, 'Operations Manager': false, 'Sustainability Lead': false, 'Warehouse Staff': false, Viewer: false },
  },
  {
    capability: 'Scan weights & log intake',
    access: { Admin: true, 'Operations Manager': true, 'Sustainability Lead': false, 'Warehouse Staff': true, Viewer: false },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: UserStatus): { bg: string; text: string; icon: typeof CheckCircle2 } {
  switch (status) {
    case 'Active':
      return { bg: 'bg-success/10', text: 'text-success', icon: CheckCircle2 };
    case 'Invited':
      return { bg: 'bg-amber/10', text: 'text-amber', icon: Clock };
    case 'Suspended':
      return { bg: 'bg-danger/10', text: 'text-danger', icon: XCircle };
  }
}

function roleTone(role: Role): string {
  switch (role) {
    case 'Admin':
      return 'text-accent';
    case 'Operations Manager':
      return 'text-amber';
    case 'Sustainability Lead':
      return 'text-success';
    case 'Warehouse Staff':
      return 'text-text-secondary';
    case 'Viewer':
      return 'text-text-muted';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UsersRoles() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');

  const filtered = useMemo(() => {
    return USERS.filter((u) => {
      const matchesSearch =
        search.trim() === '' ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [search, roleFilter, statusFilter]);

  const activeCount = USERS.filter((u) => u.status === 'Active').length;

  return (
    <div className="min-h-screen w-full bg-space px-6 py-6 text-text-primary">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-mono text-lg font-bold tracking-widest text-text-primary">
            USERS &amp; ROLES
          </h1>
          <span className="font-mono text-sm text-text-secondary">
            {TOTAL_USERS} seats · {activeCount} active
          </span>
        </div>

        <button className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 font-mono text-xs font-semibold tracking-wider text-accent transition-all hover:bg-accent/20">
          <UserPlus className="h-4 w-4" />
          INVITE USER
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total seats" value={`${TOTAL_USERS} / 50`} tone="default" />
        <SummaryCard label="Active users" value={activeCount.toString()} tone="success" />
        <SummaryCard label="Pending invites" value={USERS.filter((u) => u.status === 'Invited').length.toString()} tone="amber" />
        <SummaryCard label="Roles configured" value={ROLES.length.toString()} tone="accent" />
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-white/[0.03] p-3 backdrop-blur">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="w-full rounded-md border border-border bg-white/[0.03] py-2 pl-9 pr-3 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-accent/40 focus:outline-none"
          />
        </div>

        <FilterSelect
          value={roleFilter}
          onChange={(v) => setRoleFilter(v as Role | 'all')}
          options={[{ value: 'all', label: 'All roles' }, ...ROLES.map((r) => ({ value: r, label: r }))]}
        />

        <FilterSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as UserStatus | 'all')}
          options={[{ value: 'all', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
        />
      </div>

      {/* User table */}
      <div className="mb-6 overflow-hidden rounded-lg border border-border bg-white/[0.03] backdrop-blur">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
            USER DIRECTORY
          </span>
          <span className="font-mono text-[10px] text-text-muted">
            Showing {filtered.length} of {TOTAL_USERS} seats
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Last active</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const badge = statusBadge(u.status);
                const BadgeIcon = badge.icon;
                return (
                  <tr key={u.id} className="border-b border-border/60 transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-semibold text-text-primary">{u.name}</td>
                    <td className="px-4 py-3 font-mono text-text-secondary">{u.email}</td>
                    <td className={clsx('px-4 py-3 font-medium', roleTone(u.role))}>{u.role}</td>
                    <td className="px-4 py-3 font-mono text-text-secondary">{u.lastActive}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide',
                          badge.bg,
                          badge.text
                        )}
                      >
                        <BadgeIcon className="h-3 w-3" />
                        {u.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                    No users match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions matrix */}
      <div className="overflow-hidden rounded-lg border border-border bg-white/[0.03] backdrop-blur">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
            ROLE PERMISSIONS MATRIX
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-4 py-2.5 font-medium">Capability</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-4 py-2.5 text-center font-medium">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((row) => (
                <tr key={row.capability} className="border-b border-border/60">
                  <td className="px-4 py-3 text-text-secondary">{row.capability}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-4 py-3 text-center">
                      {row.access[r] ? (
                        <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-success" />
                      ) : (
                        <XCircle className="mx-auto h-3.5 w-3.5 text-text-muted/50" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'default' | 'accent' | 'amber' | 'success';
}) {
  const toneClass: Record<string, string> = {
    default: 'text-text-primary',
    accent: 'text-accent',
    amber: 'text-amber',
    success: 'text-success',
  };

  return (
    <div className="rounded-lg border border-border bg-white/[0.03] p-4 backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className={clsx('mt-1.5 font-mono text-xl font-bold', toneClass[tone])}>{value}</p>
    </div>
  );
}

function FilterSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-md border border-border bg-white/[0.03] px-3 py-2 font-mono text-xs text-text-secondary focus:border-accent/40 focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-space-light text-text-primary">
          {opt.label}
        </option>
      ))}
    </select>
  );
}
