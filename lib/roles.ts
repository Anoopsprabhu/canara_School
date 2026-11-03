// Shared by server and client code — no server-only imports here.

export const ROLES = ["super_admin", "admin", "staff", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Staff",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Everything: approve entries, edit, cancel, reports, users, fee and settings",
  admin: "Add new members (sent for approval), view reports, print",
  staff: "Add new members (sent for approval), print forms / receipts",
  viewer: "Search, view and print only",
};

export type Permission =
  | "member:create"
  | "member:approve"
  | "member:edit"
  | "member:cancel"
  | "member:setNumber"
  | "reports:view"
  | "users:manage"
  | "settings:manage";

const PERMISSIONS: Record<Permission, Role[]> = {
  "member:create": ["super_admin", "admin", "staff"],
  // Entries by anyone else wait for the super admin; theirs are approved on save.
  "member:approve": ["super_admin"],
  "member:edit": ["super_admin"],
  "member:cancel": ["super_admin"],
  // Entering an old paper form with its existing number, or overriding the fee.
  "member:setNumber": ["super_admin"],
  "reports:view": ["super_admin", "admin"],
  "users:manage": ["super_admin"],
  "settings:manage": ["super_admin"],
};

export function can(role: string | undefined | null, perm: Permission): boolean {
  return !!role && (PERMISSIONS[perm] as string[]).includes(role);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
