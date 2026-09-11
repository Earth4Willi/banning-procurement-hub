/**
 * Staff scopes mirror the admin views. Owner is an implicit superuser; only
 * the customer-facing views are assignable to staff, while settings, staff and
 * profile management stay owner-only.
 */
export type StaffScope =
  | "messages"
  | "customers"
  | "materials"
  | "inventory"
  | "analytics"
  | "settings"
  | "staff"
  | "profile";

export const ASSIGNABLE_SCOPES: readonly StaffScope[] = [
  "messages",
  "customers",
  "materials",
  "inventory",
  "analytics",
];

export function isAssignableScope(value: string): value is StaffScope {
  return (ASSIGNABLE_SCOPES as readonly string[]).includes(value);
}

export function hasScope(scopes: readonly StaffScope[], required: StaffScope): boolean {
  return scopes.includes(required);
}