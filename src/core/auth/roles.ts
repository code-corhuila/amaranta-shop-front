/** The words a person reads for a role. What this does not know is shown as it came: a new role is never hidden. */
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  CUSTOMER: 'Cliente',
  RECEPTIONIST: 'Recepción',
  VETERINARIAN: 'Veterinario',
  GROOMER: 'Peluquería',
};

export function roleLabel(role: string | null): string {
  if (role === null) return 'Sin rol';
  return ROLE_LABELS[role] ?? role;
}
